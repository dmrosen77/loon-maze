import { FONT_FAMILY } from '../config.js';

const COLORS = {
  frame: 0x000000,
  empty: 0x14263a,
  full: 0x4fb3ff,
  low: 0xbfe6ff, // Pale and blinking when nearly out.
};
const LOW = 0.25;
const PIP_RADIUS = 5;
const PIP_SPACING = 14;

// The blue air bar under the HP bar: "AIR", a bar showing the current breath
// (set every frame), and a pip for each dive this level, filled while it's
// still unused. `barX` lines the bar up with the HP bar above it. With
// `dives` null (the lesson's unlimited dives) there are no pips.
export default class AirBar {
  constructor(scene, x, y, barX, { width, height, max, dives }) {
    this.scene = scene;
    this.max = max;
    this.width = width;

    const label = scene.add
      .text(x, y, 'AIR', {
        fontFamily: `"${FONT_FAMILY}"`,
        fontSize: '12px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5);
    const frame = scene.add.rectangle(barX, y, width, height, COLORS.empty).setOrigin(0, 0.5).setStrokeStyle(2, COLORS.frame);
    this.fill = scene.add.rectangle(barX, y, width, height, COLORS.full).setOrigin(0, 0.5);
    this.pips = [];
    for (let i = 0; i < (dives ?? 0); i++) {
      const pipX = barX + width + 12 + PIP_RADIUS + i * PIP_SPACING;
      this.pips.push(scene.add.circle(pipX, y, PIP_RADIUS, COLORS.full).setStrokeStyle(2, COLORS.frame));
    }
    for (const part of [label, frame, this.fill, ...this.pips]) part.setScrollFactor(0).setDepth(10);
    this.low = false;
    this.setValue(max);
  }

  setValue(value) {
    // Whole screen pixels, so the pixel look holds as it drains.
    const fraction = Math.max(0, Math.min(1, value / this.max));
    this.fill.scaleX = Math.round(this.width * fraction) / this.width;

    const low = fraction > 0 && fraction <= LOW;
    if (low === this.low) return;
    this.low = low;
    this.scene.tweens.killTweensOf(this.fill);
    this.fill.setAlpha(1).setFillStyle(low ? COLORS.low : COLORS.full);
    if (low) this.scene.tweens.add({ targets: this.fill, alpha: 0.3, duration: 150, yoyo: true, repeat: -1 });
  }

  // One more pip, for a dive gained during the level.
  addDive() {
    const last = this.pips.at(-1);
    const x = last ? last.x + PIP_SPACING : this.fill.x + this.width + 12 + PIP_RADIUS;
    const pip = this.scene.add
      .circle(x, this.fill.y, PIP_RADIUS, COLORS.full)
      .setStrokeStyle(2, COLORS.frame)
      .setScrollFactor(0)
      .setDepth(this.fill.depth);
    this.pips.push(pip);
    this.scene.tweens.add({ targets: pip, scale: { from: 2, to: 1 }, duration: 300, ease: 'Back.easeOut' });
  }

  // Used dives' pips go dark, from the right.
  setDivesLeft(left) {
    this.pips.forEach((pip, i) => pip.setFillStyle(i < left ? COLORS.full : COLORS.empty));
  }
}
