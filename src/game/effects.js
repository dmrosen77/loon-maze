import * as Phaser from 'phaser';
import { FONT_FAMILY } from '../config.js';

// Little bursts of feedback: ripples, floating points, a hit flash and a
// shower of hearts. Each cleans up after itself.

// A ring spreading out on the water, like a pebble's ripple.
export function ripple(scene, x, y, { depth, color = 0xffffff, radius = 20, alpha = 0.7, duration = 550 } = {}) {
  const ring = scene.add.circle(x, y, radius).setStrokeStyle(2, color, alpha).setScale(0.3).setDepth(depth);
  scene.tweens.add({
    targets: ring,
    scale: 1.4,
    alpha: 0,
    duration,
    ease: 'Sine.easeOut',
    onComplete: () => ring.destroy(),
  });
}

// Text that floats up from a spot and fades, like "+50".
export function popText(scene, x, y, text, { depth, color = '#ffffff' } = {}) {
  const label = scene.add
    .text(x, y, text, {
      fontFamily: `"${FONT_FAMILY}"`,
      fontSize: '12px',
      color,
      stroke: '#000000',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(depth);
  scene.tweens.add({
    targets: label,
    y: y - 36,
    alpha: 0,
    duration: 900,
    ease: 'Sine.easeOut',
    onComplete: () => label.destroy(),
  });
}

// A quick red wash over the whole view when the loon gets hurt.
export function hitFlash(scene, { depth }) {
  const { width, height } = scene.scale;
  const flash = scene.add
    .rectangle(0, 0, width, height, 0xff3040, 0.3)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(depth);
  scene.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
}

// Hearts bursting up and out from a spot. `texture` is a heart texture key.
export function heartBurst(scene, x, y, texture, { depth, count = 8 }) {
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + Phaser.Math.FloatBetween(-1.1, 1.1);
    const distance = Phaser.Math.Between(30, 60);
    const heart = scene.add.image(x, y, texture).setDepth(depth).setScale(0.5);
    scene.tweens.add({
      targets: heart,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      scale: 1,
      alpha: 0,
      duration: Phaser.Math.Between(700, 1000),
      ease: 'Sine.easeOut',
      onComplete: () => heart.destroy(),
    });
  }
}
