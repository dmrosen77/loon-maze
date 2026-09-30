import * as Phaser from 'phaser';
import {
  LILY_PAD_CHANCE,
  FROG_CHANCE,
  FROG_SCARE_DISTANCE,
  DRAGONFLIES,
  SPRITE_PIXEL_SIZE,
} from '../config.js';
import { LILY_PAD, LILY_PAD_FLOWER, FROG, DRAGONFLY_SPREAD, DRAGONFLY_BLUR, makePixelTexture } from '../art/pixelArt.js';
import { tileCenter } from '../mazes/mazeInfo.js';

// Lake life: lily pads (some with a water lily) floating in the open water
// off the main path, frogs sitting on some of them that hop into the water
// when the loon comes close, and dragonflies darting around the view. None
// of it gets in the loon's way. `pads: false` leaves out the pads and frogs
// (the dive lesson, where they'd be confused with lily pad mats).
export default class Decor {
  constructor(scene, info, { padDepth, critterDepth, onFrogSplash, pads = true }) {
    this.scene = scene;
    this.onFrogSplash = onFrogSplash;
    makePixelTexture(scene, 'lily-pad-top', LILY_PAD, SPRITE_PIXEL_SIZE);
    makePixelTexture(scene, 'lily-pad-flower-top', LILY_PAD_FLOWER, SPRITE_PIXEL_SIZE);
    makePixelTexture(scene, 'frog-top', FROG, SPRITE_PIXEL_SIZE);
    makePixelTexture(scene, 'dragonfly-spread', DRAGONFLY_SPREAD, SPRITE_PIXEL_SIZE);
    makePixelTexture(scene, 'dragonfly-blur', DRAGONFLY_BLUR, SPRITE_PIXEL_SIZE);
    if (!scene.anims.exists('dragonfly')) {
      scene.anims.create({
        key: 'dragonfly',
        frames: [{ key: 'dragonfly-spread' }, { key: 'dragonfly-blur' }],
        frameRate: 18,
        repeat: -1,
      });
    }

    this.frogs = [];
    const quarterTurns = [0, 90, 180, 270];
    for (const tile of info.open) {
      // The path to the chick (which includes the start) stays clear, and
      // lily pad mats already have pads.
      if (info.onPath(tile.col, tile.row) || scene.terrain.isMat(tile.col, tile.row)) continue;
      if (!pads || Math.random() >= LILY_PAD_CHANCE) continue;
      const { x, y } = tileCenter(tile);
      const padX = x + Phaser.Math.Between(-6, 6);
      const padY = y + Phaser.Math.Between(-6, 6);
      // Quarter turns only: pixel art looks ragged at other angles.
      const pad = scene.add
        .image(padX, padY, Math.random() < 0.3 ? 'lily-pad-flower-top' : 'lily-pad-top')
        .setAngle(Phaser.Utils.Array.GetRandom(quarterTurns))
        .setFlipX(Math.random() < 0.5)
        .setDepth(padDepth);
      scene.tweens.add({
        targets: pad,
        scale: 1.06,
        duration: Phaser.Math.Between(1800, 2600),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
      if (Math.random() < FROG_CHANCE) {
        const frog = scene.add
          .image(padX, padY, 'frog-top')
          .setAngle(Phaser.Utils.Array.GetRandom(quarterTurns))
          .setDepth(padDepth + 0.1);
        this.frogs.push(frog);
      }
    }

    for (let i = 0; i < DRAGONFLIES; i++) this.addDragonfly(critterDepth);
  }

  // Darts to a random spot in view, hovers a moment, then darts again.
  addDragonfly(depth) {
    const { scene } = this;
    // Near the loon to start: the camera's view isn't worked out until the first frame.
    const { x, y } = scene.loon;
    const dragonfly = scene.add
      .sprite(x + Phaser.Math.Between(-250, 250), y + Phaser.Math.Between(-180, 180), 'dragonfly-spread')
      .setDepth(depth)
      .play('dragonfly');
    const dart = () => {
      const area = scene.cameras.main.worldView;
      const x = Phaser.Math.Between(area.x + 30, area.right - 30);
      const y = Phaser.Math.Between(area.y + 30, area.bottom - 30);
      dragonfly.rotation = Phaser.Math.Angle.Between(dragonfly.x, dragonfly.y, x, y);
      scene.tweens.add({
        targets: dragonfly,
        x,
        y,
        duration: Phaser.Math.Between(350, 650),
        ease: 'Sine.easeInOut',
        onComplete: () => scene.time.delayedCall(Phaser.Math.Between(400, 1600), dart),
      });
    };
    dart();
  }

  update(loon) {
    for (const frog of this.frogs) {
      if (frog.hopping) continue;
      if (Phaser.Math.Distance.Between(frog.x, frog.y, loon.x, loon.y) < FROG_SCARE_DISTANCE) this.hop(frog, loon);
    }
  }

  // A leap away from the loon, then a splash and it's gone.
  hop(frog, loon) {
    frog.hopping = true;
    const angle = Phaser.Math.Angle.Between(loon.x, loon.y, frog.x, frog.y);
    frog.rotation = angle + Math.PI / 2; // The art faces up.
    const x = frog.x + Math.cos(angle) * 34;
    const y = frog.y + Math.sin(angle) * 34;
    this.scene.tweens.add({ targets: frog, x, y, duration: 360, ease: 'Sine.easeOut' });
    this.scene.tweens.add({
      targets: frog,
      scale: 1.6,
      duration: 180,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        this.onFrogSplash(frog.x, frog.y);
        this.scene.tweens.add({ targets: frog, alpha: 0, scale: 0.6, duration: 200, onComplete: () => frog.destroy() });
      },
    });
  }
}
