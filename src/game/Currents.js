import * as Phaser from 'phaser';
import { CURRENT_SPEED, CURRENT_MIN_RUN, SPRITE_PIXEL_SIZE } from '../config.js';
import { makePixelTexture } from '../art/pixelArt.js';
import { tileAt, tileCenter, straightRuns, splitRun } from '../mazes/mazeInfo.js';

const START_CLEAR = 3; // Tiles from the start kept calm.

// Currents: some straight stretches of open water flow one way. Pale streaks
// drift along them, and flowAt() gives the flow (pixels per second) at a
// spot, which GameScene adds to the loon's swimming. Which stretches, and
// which way, follow `random` (seeded in LAKES).
export default class Currents {
  constructor(scene, info, { count, depth, random }) {
    this.scene = scene;
    this.flows = new Map(); // "col,row" -> { x, y } flow
    makePixelTexture(scene, 'current-streak', { palette: { w: '#e6f6ff', l: '#a9d8f5' }, rows: ['lwwwwwl'] }, SPRITE_PIXEL_SIZE);

    const allowed = ({ col, row }) =>
      info.distanceFromStart(col, row) >= START_CLEAR && !(col === info.baby.col && row === info.baby.row);
    const runs = straightRuns(info, CURRENT_MIN_RUN).flatMap((run) => splitRun(run, allowed, CURRENT_MIN_RUN));
    for (let i = runs.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [runs[i], runs[j]] = [runs[j], runs[i]];
    }
    const key = (col, row) => `${col},${row}`;
    this.currents = [];
    for (const run of runs) {
      if (this.currents.length >= count) break;
      if (run.some(({ col, row }) => this.flows.has(key(col, row)))) continue;
      const forward = random() < 0.5;
      const first = run[0];
      const last = run[run.length - 1];
      const dx = Math.sign(last.col - first.col) * (forward ? 1 : -1);
      const dy = Math.sign(last.row - first.row) * (forward ? 1 : -1);
      run.forEach(({ col, row }) => this.flows.set(key(col, row), { x: dx * CURRENT_SPEED, y: dy * CURRENT_SPEED }));
      this.currents.push({ run, dx, dy, streaks: this.addStreaks(dx, dy, depth) });
    }

    // Streaks appear along each current and drift with it.
    this.timer = scene.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        for (const { run, dx, streaks } of this.currents) {
          const { x, y } = tileCenter(Phaser.Utils.Array.GetRandom(run));
          const side = Phaser.Math.Between(-12, 12);
          streaks.emitParticleAt(x + (dx === 0 ? side : 0), y + (dx === 0 ? 0 : side), 1);
        }
      },
    });
  }

  addStreaks(dx, dy, depth) {
    return this.scene.add
      .particles(0, 0, 'current-streak', {
        angle: Phaser.Math.RadToDeg(Math.atan2(dy, dx)),
        rotate: Phaser.Math.RadToDeg(Math.atan2(dy, dx)),
        speed: CURRENT_SPEED * 1.3,
        lifespan: 700,
        // Fade in and back out over the streak's life.
        alpha: { onEmit: () => 0, onUpdate: (particle, key, t) => Math.sin(t * Math.PI) },
        emitting: false,
      })
      .setDepth(depth);
  }

  // The flow at a world position ({ x, y }, zero where there's no current).
  flowAt(x, y) {
    const { col, row } = tileAt(x, y);
    return this.flows.get(`${col},${row}`) ?? { x: 0, y: 0 };
  }
}
