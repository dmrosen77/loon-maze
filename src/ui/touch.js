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

// A floating joystick: put a finger down anywhere and drag toward where the
// loon should swim. A ring appears under the finger; the knob follows the
// drag. `vector` is the direction with a strength from 0 to 1. Touches that
// start on a button (anything interactive) are left alone.
export class TouchStick {
  constructor(scene) {
    this.scene = scene;
    this.vector = new Phaser.Math.Vector2();
    this.pointerId = null;

    this.base = scene.add.circle(0, 0, STICK_RADIUS, 0xffffff, 0.12).setStrokeStyle(3, 0xffffff, 0.5);
    this.knob = scene.add.circle(0, 0, 22, 0xffffff, 0.45);
    for (const part of [this.base, this.knob]) part.setScrollFactor(0).setDepth(20).setVisible(false);

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

  onDown(pointer, overObjects) {
    if (this.pointerId !== null || overObjects.length > 0) return;
    this.pointerId = pointer.id;
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.knob.setPosition(pointer.x, pointer.y).setVisible(true);
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
    this.base.setVisible(false);
    this.knob.setVisible(false);
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
