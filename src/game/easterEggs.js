import * as Phaser from 'phaser';
import { FONT_FAMILY } from '../config.js';
import { PEACH, POOP, STINK, DRIP, makePixelTexture } from '../art/pixelArt.js';

// Easter eggs for cheeky initials on the high score screen: a short, silly
// show after they're confirmed, before the table. Each returns a promise that
// resolves once its show is over and cleaned up.
//   ASS: "JUICY!" and a storm of bouncing peaches.
//   POO: "STINKS!", a rain of smiling poops with stink lines, and a raspberry.
//   PEE: the screen goes yellow, drips run down, and "EWWW..." sags.
const DEPTH = 50;
const SHOW_MS = 2800;

export function hasEasterEgg(name) {
  return name in EGGS;
}

export function playEasterEgg(scene, name, audio) {
  makePixelTexture(scene, 'egg-peach', PEACH, 4);
  makePixelTexture(scene, 'egg-poop', POOP, 4);
  makePixelTexture(scene, 'egg-stink', STINK, 3);
  makePixelTexture(scene, 'egg-drip', DRIP, 4);
  const parts = [];
  EGGS[name](scene, audio, parts);
  return new Promise((resolve) => {
    scene.time.delayedCall(SHOW_MS, () => {
      scene.tweens.add({
        targets: parts,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          parts.forEach((part) => part.destroy());
          resolve();
        },
      });
    });
  });
}

// Big letters, one tween per letter so each can bounce, wobble or sag.
function bigWord(scene, word, color, y) {
  const { width } = scene.scale;
  const letters = [...word].map((char) =>
    scene.add
      .text(0, y, char, {
        fontFamily: `"${FONT_FAMILY}"`,
        fontSize: '72px',
        color,
        stroke: '#000000',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 2),
  );
  const total = letters.reduce((sum, letter) => sum + letter.width, 0);
  let x = (width - total) / 2;
  for (const letter of letters) {
    letter.setX(x + letter.width / 2);
    x += letter.width;
  }
  return letters;
}

// A shower of `texture` from the top of the screen that bounces off the bottom.
function rain(scene, texture, { quantity = 3, frequency = 30, forMs = 1800, bounce = 0.55 } = {}) {
  const { width, height } = scene.scale;
  const emitter = scene.add
    .particles(0, -40, texture, {
      x: { min: 0, max: width },
      speedY: { min: 150, max: 380 },
      speedX: { min: -80, max: 80 },
      gravityY: 500,
      rotate: { min: -40, max: 40 },
      scale: { min: 0.8, max: 1.3 },
      lifespan: 3200,
      bounds: new Phaser.Geom.Rectangle(-60, -200, width + 120, height + 150),
      collideTop: false,
      bounce,
      quantity,
      frequency,
    })
    .setDepth(DEPTH);
  scene.time.delayedCall(forMs, () => emitter.stop());
  return emitter;
}

const EGGS = {
  // "JUICY!" bounces in letter by letter over a storm of peaches.
  ASS(scene, audio, parts) {
    audio?.boing();
    scene.time.delayedCall(350, () => audio?.boing());
    scene.time.delayedCall(700, () => audio?.boing());
    parts.push(rain(scene, 'egg-peach', { quantity: 4, frequency: 25 }));
    const letters = bigWord(scene, 'JUICY!', '#ff9a62', scene.scale.height * 0.42);
    letters.forEach((letter, i) => {
      letter.setScale(0);
      scene.tweens.chain({
        targets: letter,
        tweens: [
          { scale: 1.2, duration: 220, delay: i * 90, ease: 'Back.easeOut' },
          { scale: 1, duration: 120 },
          { y: letter.y - 22, duration: 260, ease: 'Sine.easeOut', yoyo: true, repeat: -1 },
        ],
      });
    });
    parts.push(...letters);
  },

  // "STINKS!" wobbles in over raining poops, with green stink lines rising.
  POO(scene, audio, parts) {
    audio?.fart();
    parts.push(rain(scene, 'egg-poop', { quantity: 3, frequency: 30, bounce: 0.3 }));
    const { width, height } = scene.scale;
    const stink = scene.add
      .particles(0, height + 10, 'egg-stink', {
        x: { min: 0, max: width },
        speedY: { min: -60, max: -130 },
        speedX: { min: -15, max: 15 },
        alpha: { start: 0.9, end: 0 },
        scale: { start: 1.6, end: 2.6 },
        lifespan: 2400,
        frequency: 40,
        quantity: 2,
      })
      .setDepth(DEPTH + 1);
    scene.time.delayedCall(2200, () => stink.stop());
    parts.push(stink);
    const letters = bigWord(scene, 'STINKS!', '#8bc34a', height * 0.42);
    letters.forEach((letter, i) => {
      letter.setAlpha(0).setAngle(-12);
      scene.tweens.add({ targets: letter, alpha: 1, duration: 200, delay: i * 70 });
      scene.tweens.add({ targets: letter, angle: 12, duration: 180, delay: i * 70, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    parts.push(...letters);
  },

  // The screen washes yellow, drips run down, and "EWWW..." sags.
  PEE(scene, audio, parts) {
    audio?.trickle();
    scene.time.delayedCall(900, () => audio?.ewww());
    const { width, height } = scene.scale;
    const wash = scene.add.rectangle(0, 0, width, height, 0xffe600, 0).setOrigin(0).setDepth(DEPTH);
    scene.tweens.add({ targets: wash, fillAlpha: 0.85, duration: 700, ease: 'Sine.easeIn' });
    parts.push(wash);
    const drips = scene.add
      .particles(0, -10, 'egg-drip', {
        x: { min: 0, max: width },
        speedY: { min: 40, max: 120 },
        gravityY: 260,
        scaleY: { start: 1, end: 2.2 },
        lifespan: 2600,
        frequency: 30,
        quantity: 2,
      })
      .setDepth(DEPTH + 1);
    scene.time.delayedCall(2200, () => drips.stop());
    parts.push(drips);
    const letters = bigWord(scene, 'EWWW...', '#fffde7', height * 0.36);
    letters.forEach((letter, i) => {
      letter.setAlpha(0);
      scene.tweens.add({ targets: letter, alpha: 1, duration: 250, delay: i * 80 });
      // Each letter droops down the screen, a little further along the word.
      scene.tweens.add({ targets: letter, y: letter.y + 30 + i * 12, angle: (i % 2 ? 1 : -1) * 8, duration: 1800, delay: 400 + i * 80, ease: 'Sine.easeIn' });
    });
    parts.push(...letters);
  },
};
