import * as Phaser from 'phaser';
import {
  EAGLE_FIRST_MS,
  EAGLE_INTERVAL_MS,
  EAGLE_WARNING_MS,
  EAGLE_SPEED,
  EAGLE_SHADOW_SCALE,
  EAGLE_HIT_LENGTH,
  EAGLE_HIT_SPAN,
} from '../config.js';

// The eagle hunting overhead. Every so often: a screech and a blinking red
// arrow at the edge of the screen where it will come from, then its huge
// shadow sweeps across the lake, aimed at where the loon was when it
// screeched. If the shadow passes over the loon on the surface, onStrike()
// is called (once per pass). Diving, or getting out of its way, dodges it.
// The shadow is the game-over eagle's art (loaded by GameScene), tinted dark.
export default class EagleShadow {
  constructor(scene, { depth, arrowDepth, audio, onStrike }) {
    this.scene = scene;
    this.depth = depth;
    this.arrowDepth = arrowDepth;
    this.audio = audio;
    this.onStrike = onStrike;
    this.shadow = null;
    if (!scene.anims.exists('eagle-flap')) {
      scene.anims.create({
        key: 'eagle-flap',
        frames: [{ key: 'eagle-wings-forward' }, { key: 'eagle-wings-back' }],
        frameRate: 4,
        repeat: -1,
      });
    }
    this.schedule(EAGLE_FIRST_MS);
  }

  schedule([min, max]) {
    this.scene.time.delayedCall(Phaser.Math.Between(min, max), () => this.warn());
  }

  // Pick a direction, aim at the loon, and show where the eagle will come from.
  warn() {
    const { scene } = this;
    if (scene.reunited || scene.gameOver) return;
    const { loon } = scene;
    const heading = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const target = { x: loon.x + Phaser.Math.Between(-30, 30), y: loon.y + Phaser.Math.Between(-30, 30) };
    this.audio?.screech();

    // The arrow sits on the screen's edge, on the line the eagle will fly in
    // along, pointing inward.
    const { width, height } = scene.scale;
    const camera = scene.cameras.main;
    const from = { x: target.x - camera.scrollX, y: target.y - camera.scrollY };
    const edge = edgePoint(from, -Math.cos(heading), -Math.sin(heading), width, height, 34);
    const arrow = scene.add
      .triangle(edge.x, edge.y, 0, -14, 0, 14, 26, 0, 0xff4040)
      .setStrokeStyle(3, 0x000000)
      .setRotation(heading)
      .setScrollFactor(0)
      .setDepth(this.arrowDepth);
    scene.tweens.add({ targets: arrow, alpha: 0.2, duration: 150, yoyo: true, repeat: -1 });
    scene.time.delayedCall(EAGLE_WARNING_MS, () => {
      arrow.destroy();
      this.fly(target, heading);
    });
  }

  // The shadow crosses from well off one side of the view to well off the other.
  fly(target, heading) {
    const { scene } = this;
    if (scene.reunited || scene.gameOver) return;
    const reach = Math.hypot(scene.scale.width, scene.scale.height) / 2 + 300;
    const dx = Math.cos(heading);
    const dy = Math.sin(heading);
    this.shadow = scene.add
      .sprite(target.x - dx * reach, target.y - dy * reach, 'eagle-wings-forward')
      .setScale(EAGLE_SHADOW_SCALE)
      .setRotation(heading)
      .setTint(0x000000)
      .setAlpha(0.38)
      .setDepth(this.depth)
      .play('eagle-flap');
    this.heading = heading;
    this.struck = false;
    scene.tweens.add({
      targets: this.shadow,
      x: target.x + dx * reach,
      y: target.y + dy * reach,
      duration: ((reach * 2) / EAGLE_SPEED) * 1000,
      onComplete: () => {
        this.shadow.destroy();
        this.shadow = null;
        this.schedule(EAGLE_INTERVAL_MS);
      },
    });
  }

  // Whether the shadow is over the loon: within EAGLE_HIT_LENGTH along its
  // path and EAGLE_HIT_SPAN across (its wings).
  update(loon, diving) {
    if (!this.shadow || this.struck || diving) return;
    const rx = loon.x - this.shadow.x;
    const ry = loon.y - this.shadow.y;
    const along = rx * Math.cos(this.heading) + ry * Math.sin(this.heading);
    const across = -rx * Math.sin(this.heading) + ry * Math.cos(this.heading);
    if (Math.abs(along) < EAGLE_HIT_LENGTH && Math.abs(across) < EAGLE_HIT_SPAN) {
      this.struck = true;
      this.onStrike();
    }
  }
}

// Where a ray from `from` (in screen space) in direction (dx, dy) leaves the
// screen, kept `inset` pixels inside it.
function edgePoint(from, dx, dy, width, height, inset) {
  const x0 = Phaser.Math.Clamp(from.x, inset, width - inset);
  const y0 = Phaser.Math.Clamp(from.y, inset, height - inset);
  const tx = dx > 0 ? (width - inset - x0) / dx : dx < 0 ? (inset - x0) / dx : Infinity;
  const ty = dy > 0 ? (height - inset - y0) / dy : dy < 0 ? (inset - y0) / dy : Infinity;
  const t = Math.min(tx, ty);
  return { x: x0 + dx * t, y: y0 + dy * t };
}
