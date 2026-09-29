import * as Phaser from 'phaser';
import { TITLE_COLORS } from '../config.js';

// Moonlit-lake touches shared by the title screen and night levels.

// Moonlight glittering on the water: a brief fleck every `delay` ms, wherever
// `pickSpot()` says ({ x, y, bright }; bright ones glint harder). Returns the
// timer, so it can be stopped.
export function startGlints(scene, pickSpot, { depth, delay = 50 }) {
  return scene.time.addEvent({
    delay,
    loop: true,
    callback: () => {
      const spot = pickSpot();
      if (!spot) return;
      const glint = scene.add
        .rectangle(spot.x, spot.y, Phaser.Math.Between(2, 4) * 3, 3, TITLE_COLORS.glint)
        .setAlpha(0)
        .setDepth(depth);
      scene.tweens.add({
        targets: glint,
        alpha: spot.bright ? 0.9 : 0.5,
        duration: 350,
        yoyo: true,
        onComplete: () => glint.destroy(),
      });
    },
  });
}

// A firefly that blinks and wanders around a home point, within `rangeX` and
// `rangeY` of it.
export function addFirefly(scene, homeX, homeY, { depth, rangeX, rangeY }) {
  const firefly = scene.add
    .rectangle(homeX + Phaser.Math.Between(-rangeX, rangeX), homeY + Phaser.Math.Between(-rangeY, rangeY), 4, 4, TITLE_COLORS.firefly)
    .setDepth(depth);
  scene.tweens.add({
    targets: firefly,
    alpha: 0.1,
    duration: Phaser.Math.Between(500, 1300),
    delay: Phaser.Math.Between(0, 1200),
    yoyo: true,
    repeat: -1,
  });
  const wander = () => {
    scene.tweens.add({
      targets: firefly,
      x: homeX + Phaser.Math.Between(-rangeX, rangeX),
      y: homeY + Phaser.Math.Between(-rangeY, rangeY),
      duration: Phaser.Math.Between(1800, 3500),
      ease: 'Sine.easeInOut',
      onComplete: wander,
    });
  };
  wander();
  return firefly;
}
