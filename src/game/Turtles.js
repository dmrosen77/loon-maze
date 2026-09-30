import * as Phaser from 'phaser';
import {
  TURTLE_SPEED,
  TURTLE_START_CLEAR,
  TURTLE_UP_MS,
  TURTLE_DOWN_MS,
  TURTLE_SINK_MS,
  TURTLE_WARN_MS,
  DIVE_SHADOW_TINT,
  DIVE_SHADOW_ALPHA,
  SPRITE_PIXEL_SIZE,
} from '../config.js';
import { TURTLE_LEGS_OUT, TURTLE_LEGS_BACK, makePixelTexture } from '../art/pixelArt.js';
import { tileCenter } from '../mazes/mazeInfo.js';

const BITE_DISTANCE = 24;
const BITE_COOLDOWN_MS = 800;
// A turtle coming back up is harmless until it's fully up, and this much longer.
const SURFACE_GRACE_MS = 250;
const TURN_PAUSE_MS = 500;
const MIN_RUN = 3;

// Snapping turtles, each patrolling a straight stretch of open water (at
// least MIN_RUN tiles, never near the start or on the chick), paddling to one
// end, pausing, turning round and paddling back. Swimming into one on the
// surface calls onBite(turtle); diving passes under them. Turtles on the
// route to the chick also sink and resurface in a rhythm (see TURTLE_UP_MS),
// so they can be passed without diving. Which stretches they get follows
// `random` (seeded in LAKES).
export default class Turtles {
  constructor(scene, info, { count, depth, random, onBite }) {
    this.scene = scene;
    this.onBite = onBite;
    this.bubbles = scene.add
      .particles(0, 0, 'bubble', {
        lifespan: { min: 400, max: 800 },
        speed: { min: 2, max: 10 },
        scale: { start: 0.8, end: 1.5 },
        alpha: { start: 0.9, end: 0 },
        emitting: false,
      })
      .setDepth(depth + 0.1);
    makePixelTexture(scene, 'turtle-out', TURTLE_LEGS_OUT, SPRITE_PIXEL_SIZE);
    makePixelTexture(scene, 'turtle-back', TURTLE_LEGS_BACK, SPRITE_PIXEL_SIZE);
    if (!scene.anims.exists('turtle-paddle')) {
      scene.anims.create({ key: 'turtle-paddle', frames: [{ key: 'turtle-out' }, { key: 'turtle-back' }], frameRate: 3, repeat: -1 });
    }

    const allowed = ({ col, row }) =>
      info.distanceFromStart(col, row) >= TURTLE_START_CLEAR && !(col === info.baby.col && row === info.baby.row);
    const runs = straightRuns(info).flatMap((run) => splitRun(run, allowed));
    // Shuffle with the level's random, then take runs that don't share tiles.
    for (let i = runs.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [runs[i], runs[j]] = [runs[j], runs[i]];
    }
    const used = new Set();
    this.turtles = [];
    for (const run of runs) {
      if (this.turtles.length >= count) break;
      if (run.some(({ col, row }) => used.has(`${col},${row}`))) continue;
      run.forEach(({ col, row }) => used.add(`${col},${row}`));
      const turtle = this.addTurtle(run, depth);
      if (run.some(({ col, row }) => info.onPath(col, row))) {
        // Staggered, so route turtles don't all bob together.
        this.scene.time.delayedCall(700 * this.turtles.length, () => this.surfaceCycle(turtle));
      }
      this.turtles.push(turtle);
    }
  }

  addTurtle(run, depth) {
    const from = tileCenter(run[0]);
    const to = tileCenter(run[run.length - 1]);
    const outbound = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
    const turtle = this.scene.add.sprite(from.x, from.y, 'turtle-out').setDepth(depth).setRotation(outbound).play('turtle-paddle');
    turtle.patrol = { from, to }; // Its stretch of water, end to end.
    this.scene.tweens.add({
      targets: turtle,
      x: to.x,
      y: to.y,
      duration: (Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y) / TURTLE_SPEED) * 1000,
      ease: 'Sine.easeInOut',
      hold: TURN_PAUSE_MS,
      repeatDelay: TURN_PAUSE_MS,
      yoyo: true,
      repeat: -1,
      onYoyo: () => turtle.setRotation(outbound + Math.PI),
      onRepeat: () => turtle.setRotation(outbound),
    });
    return turtle;
  }

  // Up for TURTLE_UP_MS, then sink into a dark shadow, stay under for
  // TURTLE_DOWN_MS (bubbling harder near the end, as a warning), then come
  // back up with a splash of bubbles.
  surfaceCycle(turtle) {
    const { scene } = this;
    scene.time.delayedCall(TURTLE_UP_MS, () => {
      turtle.submerged = true;
      scene.tweens.add({ targets: turtle, alpha: DIVE_SHADOW_ALPHA, scale: 0.85, duration: TURTLE_SINK_MS });
      turtle.setTint(DIVE_SHADOW_TINT);
      this.bubbles.emitParticleAt(turtle.x, turtle.y, 6);
      const bubbling = scene.time.addEvent({
        delay: 220,
        loop: true,
        callback: () => this.bubbles.emitParticleAt(turtle.x + Phaser.Math.Between(-6, 6), turtle.y + Phaser.Math.Between(-6, 6), 1),
      });
      scene.time.delayedCall(TURTLE_DOWN_MS - TURTLE_WARN_MS, () => {
        bubbling.delay = 60; // About to come up.
      });
      scene.time.delayedCall(TURTLE_DOWN_MS, () => {
        bubbling.remove();
        turtle.submerged = false;
        turtle.harmlessUntil = scene.time.now + TURTLE_SINK_MS + SURFACE_GRACE_MS;
        turtle.clearTint();
        scene.tweens.add({ targets: turtle, alpha: 1, scale: 1, duration: TURTLE_SINK_MS });
        this.bubbles.emitParticleAt(turtle.x, turtle.y, 8);
        this.surfaceCycle(turtle);
      });
    });
  }

  // A turtle bites when the loon (on the surface) comes into contact with it:
  // not while it's under or still coming up, and not if the loon was already
  // on top of it when it surfaced (the loon has to move off and back first).
  update(loon, diving, time) {
    for (const turtle of this.turtles) {
      const close = !diving && Phaser.Math.Distance.Between(turtle.x, turtle.y, loon.x, loon.y) < BITE_DISTANCE;
      const newContact = close && !turtle.wasClose;
      turtle.wasClose = close;
      if (!newContact || turtle.submerged || time < (turtle.harmlessUntil ?? 0) || time < (turtle.nextBite ?? 0)) {
        continue;
      }
      turtle.nextBite = time + BITE_COOLDOWN_MS;
      this.onBite(turtle);
      // Snap: the turtle lunges a little bigger for a moment.
      this.scene.tweens.add({ targets: turtle, scale: 1.25, duration: 90, yoyo: true });
    }
  }
}

// Every maximal straight line of open tiles, across and down.
function straightRuns(info) {
  const runs = [];
  for (let row = 0; row < info.rows; row++) {
    let run = [];
    for (let col = 0; col <= info.cols; col++) {
      if (col < info.cols && info.isOpen(col, row)) run.push({ col, row });
      else {
        if (run.length >= MIN_RUN) runs.push(run);
        run = [];
      }
    }
  }
  for (let col = 0; col < info.cols; col++) {
    let run = [];
    for (let row = 0; row <= info.rows; row++) {
      if (row < info.rows && info.isOpen(col, row)) run.push({ col, row });
      else {
        if (run.length >= MIN_RUN) runs.push(run);
        run = [];
      }
    }
  }
  return runs;
}

// The parts of a run made of allowed tiles, long enough to patrol.
function splitRun(run, allowed) {
  const parts = [];
  let part = [];
  for (const tile of [...run, null]) {
    if (tile && allowed(tile)) part.push(tile);
    else {
      if (part.length >= MIN_RUN) parts.push(part);
      part = [];
    }
  }
  return parts;
}
