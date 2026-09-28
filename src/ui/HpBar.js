import * as Phaser from 'phaser';
import { FONT_FAMILY } from '../config.js';

const COLORS = {
  frame: 0x000000,
  empty: 0x3a1d1d,
  lost: 0xfff1c9, // The chunk just lost, before it drains away.
  healthy: 0x5ad04a,
  hurt: 0xf2b134,
  critical: 0xe8475f,
};

// A health bar: "HP" and the bar. Losing HP snaps the bar down and leaves the
// lost chunk showing briefly before it drains. Gaining HP grows the bar back
// smoothly.
export default class HpBar {
  constructor(scene, x, y, { width, height, max, value, fontSize = 12, fixed = true }) {
    this.scene = scene;
    this.max = max;
    this.value = value;
    this.shown = value; // What the bar currently shows while it grows back.
    this.width = width;

    const textStyle = {
      fontFamily: `"${FONT_FAMILY}"`,
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    };
    const label = scene.add.text(x, y, 'HP', textStyle).setOrigin(0, 0.5);
    const barX = x + label.width + 8;
    const frame = scene.add.rectangle(barX, y, width, height, COLORS.empty).setOrigin(0, 0.5).setStrokeStyle(2, COLORS.frame);
    // Full-width bars scaled horizontally from their left edge.
    this.lost = scene.add.rectangle(barX, y, width, height, COLORS.lost).setOrigin(0, 0.5);
    this.fill = scene.add.rectangle(barX, y, width, height, COLORS.healthy).setOrigin(0, 0.5);
    this.lost.scaleX = this.fraction(value);
    this.fill.scaleX = this.fraction(value);
    this.right = barX + width; // For placing things just past the bar.

    this.parts = [label, frame, this.lost, this.fill];
    if (fixed) this.parts.forEach((part) => part.setScrollFactor(0).setDepth(10));
    this.refresh();
  }

  // Fraction of the bar to fill, rounded to whole screen pixels.
  fraction(value) {
    return Math.round((this.width * Math.max(0, value)) / this.max) / this.width;
  }

  setValue(value) {
    const previous = this.value;
    this.value = Phaser.Math.Clamp(value, 0, this.max);
    const { tweens } = this.scene;

    if (this.value < previous) {
      // Snap down; the lost chunk lingers, then drains.
      tweens.killTweensOf(this.lost);
      this.fill.scaleX = this.fraction(this.value);
      this.lost.scaleX = Math.max(this.lost.scaleX, this.fraction(previous));
      tweens.add({ targets: this.lost, scaleX: this.fill.scaleX, delay: 350, duration: 400, ease: 'Sine.easeIn' });
      this.shown = this.value;
      this.refresh();
    } else if (this.value > previous) {
      // Grow back.
      const counter = { value: this.shown };
      tweens.add({
        targets: counter,
        value: this.value,
        duration: 900,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          this.shown = counter.value;
          this.fill.scaleX = this.fraction(counter.value);
          this.lost.scaleX = this.fill.scaleX;
          this.refresh();
        },
      });
    }
  }

  // Color and pulse by how much is left.
  refresh() {
    const fraction = this.shown / this.max;
    const color = fraction <= 0.2 ? COLORS.critical : fraction <= 0.4 ? COLORS.hurt : COLORS.healthy;
    this.fill.setFillStyle(color);

    const pulsing = this.scene.tweens.isTweening(this.fill);
    if (fraction <= 0.2 && fraction > 0 && !pulsing) {
      this.scene.tweens.add({ targets: this.fill, alpha: 0.35, duration: 300, yoyo: true, repeat: -1 });
    } else if (fraction > 0.2 && pulsing) {
      this.scene.tweens.killTweensOf(this.fill);
      this.fill.setAlpha(1);
    }
  }
}
