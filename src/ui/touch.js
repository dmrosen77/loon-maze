import * as Phaser from 'phaser';
import { FONT_FAMILY } from '../config.js';

// True on phones and tablets (a finger is the main pointer), so screens can
// show touch hints and buttons instead of keyboard ones.
export function isTouchDevice() {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

// How far (screen pixels) a drag has to go for full-strength paddling.
const STICK_RADIUS = 60;
// Drags shorter than this fraction of the radius count as no input.
const DEAD_ZONE = 0.15;

// On touch screens the joystick waits in the bottom-left corner, faded, so
// players can see how to swim before touching anything.
const REST_ALPHA = 0.5;
const REST_MARGIN = 40; // From the screen's left and bottom edges to the ring.
// Until the first touch of the session, the resting knob circles slowly to
// show that it moves.
let hasTouched = false;

// A floating joystick: put a finger down anywhere and drag toward where the
// loon should swim. The ring jumps under the finger and the knob follows the
// drag; on release it glides back to its corner (on touch screens) or hides
// (with a mouse). `vector` is the direction with a strength from 0 to 1.
// Touches that start on a button (anything interactive) are left alone.
export class TouchStick {
  constructor(scene) {
    this.scene = scene;
    this.vector = new Phaser.Math.Vector2();
    this.pointerId = null;
    this.showAtRest = isTouchDevice();
    this.home = {
      x: REST_MARGIN + STICK_RADIUS,
      y: scene.scale.height - REST_MARGIN - STICK_RADIUS,
    };

    this.base = scene.add.circle(0, 0, STICK_RADIUS, 0xffffff, 0.12).setStrokeStyle(3, 0xffffff, 0.5);
    this.knob = scene.add.circle(0, 0, 22, 0xffffff, 0.45);
    this.parts = [this.base, this.knob];
    for (const part of this.parts) part.setScrollFactor(0).setDepth(20).setVisible(false);

    if (this.showAtRest) {
      for (const part of this.parts) part.setPosition(this.home.x, this.home.y).setAlpha(REST_ALPHA).setVisible(true);
      if (!hasTouched) this.startHint();
    }

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', this.onDown, this);
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      scene.input.off('pointerupoutside', this.onUp, this);
    });
  }

  // The resting knob circles inside the ring.
  startHint() {
    const orbit = { angle: 0 };
    this.hint = this.scene.tweens.add({
      targets: orbit,
      angle: Math.PI * 2,
      duration: 2200,
      repeat: -1,
      onUpdate: () => {
        const reach = STICK_RADIUS * 0.55;
        this.knob.setPosition(this.home.x + Math.cos(orbit.angle) * reach, this.home.y + Math.sin(orbit.angle) * reach);
      },
    });
  }

  onDown(pointer, overObjects) {
    if (this.pointerId !== null || overObjects.length > 0) return;
    this.pointerId = pointer.id;
    hasTouched = true;
    this.hint?.remove();
    this.hint = null;
    this.scene.tweens.killTweensOf(this.parts);
    for (const part of this.parts) part.setPosition(pointer.x, pointer.y).setAlpha(1).setVisible(true);
    this.vector.set(0, 0);
  }

  onMove(pointer) {
    if (pointer.id !== this.pointerId) return;
    const drag = new Phaser.Math.Vector2(pointer.x - this.base.x, pointer.y - this.base.y);
    if (drag.length() > STICK_RADIUS) drag.setLength(STICK_RADIUS);
    this.knob.setPosition(this.base.x + drag.x, this.base.y + drag.y);
    const strength = drag.length() / STICK_RADIUS;
    this.vector.copy(strength < DEAD_ZONE ? Phaser.Math.Vector2.ZERO : drag.scale(1 / STICK_RADIUS));
  }

  onUp(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.vector.set(0, 0);
    if (!this.showAtRest) {
      for (const part of this.parts) part.setVisible(false);
      return;
    }
    this.scene.tweens.add({
      targets: this.parts,
      x: this.home.x,
      y: this.home.y,
      alpha: REST_ALPHA,
      duration: 250,
      ease: 'Sine.easeOut',
    });
  }
}

// A small "SOUND ON / SOUND OFF" button for touch screens, where there's no
// M key. Returns the button (or null on non-touch devices).
export function addMuteButton(scene, audio, x, y, { depth = 10 } = {}) {
  if (!audio || !isTouchDevice()) return null;
  const label = () => (audio.muted ? 'SOUND OFF' : 'SOUND ON');
  const button = scene.add
    .text(x, y, label(), {
      fontFamily: `"${FONT_FAMILY}"`,
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      padding: { x: 8, y: 6 },
    })
    .setOrigin(1, 0)
    .setScrollFactor(0)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true });
  button.on('pointerdown', () => {
    audio.toggleMute();
    button.setText(label());
  });
  return button;
}

// A round "DIVE" button in the bottom-right corner for touch screens, held
// down to stay underwater (the joystick steers with the other thumb).
// Returns { held } (always false on non-touch devices, where it isn't shown).
export function addDiveButton(scene) {
  const state = { held: false };
  if (!isTouchDevice()) return state;
  const radius = 46;
  const x = scene.scale.width - REST_MARGIN - radius;
  const y = scene.scale.height - REST_MARGIN - radius;
  const button = scene.add
    .circle(x, y, radius, 0x4fb3ff, 0.25)
    .setStrokeStyle(3, 0xffffff, 0.6)
    .setScrollFactor(0)
    .setDepth(20)
    .setInteractive();
  const label = scene.add
    .text(x, y, 'DIVE', {
      fontFamily: `"${FONT_FAMILY}"`,
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(21);

  let pointerId = null;
  const show = () => {
    button.setFillStyle(0x4fb3ff, state.held ? 0.6 : 0.25);
    label.setScale(state.held ? 0.9 : 1);
  };
  button.on('pointerdown', (pointer) => {
    pointerId = pointer.id;
    state.held = true;
    show();
  });
  const release = (pointer) => {
    if (pointer.id !== pointerId) return;
    pointerId = null;
    state.held = false;
    show();
  };
  scene.input.on('pointerup', release);
  scene.input.on('pointerupoutside', release);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.off('pointerup', release);
    scene.input.off('pointerupoutside', release);
  });
  return state;
}
