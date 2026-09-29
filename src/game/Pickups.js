import * as Phaser from 'phaser';
import { DIVE_BUBBLE_CHANCE, SPRITE_PIXEL_SIZE } from '../config.js';
import { AIR_BUBBLE, makePixelTexture } from '../art/pixelArt.js';
import { tileCenter } from '../mazes/mazeInfo.js';

const GRAB_DISTANCE = 22;

// The extra-dive air bubble: on some diving levels, one shimmers in a dead
// end off the main path (one of the farther ones from the start, so it's a
// detour). Swimming into it calls onGrab(x, y).
export default class Pickups {
  constructor(scene, info, { depth, onGrab }) {
    this.scene = scene;
    this.onGrab = onGrab;
    this.bubble = null;
    makePixelTexture(scene, 'air-bubble', AIR_BUBBLE, SPRITE_PIXEL_SIZE);
    if (Math.random() >= DIVE_BUBBLE_CHANCE) return;

    const offPath = info.deadEnds
      .filter(({ col, row }) => !info.onPath(col, row))
      .sort((a, b) => info.distanceFromStart(b.col, b.row) - info.distanceFromStart(a.col, a.row));
    if (offPath.length === 0) return;
    const tile = Phaser.Utils.Array.GetRandom(offPath.slice(0, Math.max(1, Math.ceil(offPath.length / 3))));
    const { x, y } = tileCenter(tile);
    this.bubble = scene.add.image(x, y, 'air-bubble').setDepth(depth);
    scene.tweens.add({ targets: this.bubble, scale: 1.2, duration: 700, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
    scene.tweens.add({ targets: this.bubble, alpha: 0.65, duration: 450, yoyo: true, repeat: -1 });
  }

  update(loon) {
    const { bubble } = this;
    if (!bubble?.active) return;
    if (Phaser.Math.Distance.Between(bubble.x, bubble.y, loon.x, loon.y) < GRAB_DISTANCE) {
      const { x, y } = bubble;
      this.scene.tweens.killTweensOf(bubble);
      bubble.destroy();
      this.onGrab(x, y);
    }
  }
}
