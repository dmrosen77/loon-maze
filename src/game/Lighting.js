import * as Phaser from 'phaser';
import { TIME_OF_DAY, TILE_SIZE } from '../config.js';
import { startGlints, addFirefly } from '../art/lakeAmbience.js';
import { tileAt } from '../mazes/mazeInfo.js';

// The time of day for a level: they cycle in TIME_OF_DAY's order.
export function timeOfDayForLevel(level) {
  return TIME_OF_DAY[(level - 1) % TIME_OF_DAY.length];
}

// Colors the whole lake for the level's time of day (`phase`, an entry of TIME_OF_DAY), with a screen-sized
// tint multiplied over everything below the HUD. At night, moonlight glints
// on the open water in view and fireflies drift over the reeds, drawn above
// the tint so they glow.
export default class Lighting {
  constructor(scene, info, { phase, tintDepth, glowDepth }) {
    this.phase = phase;
    const { width, height } = scene.scale;
    if (this.phase.tint !== 0xffffff) {
      scene.add
        .rectangle(0, 0, width, height, this.phase.tint)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(tintDepth)
        .setBlendMode(Phaser.BlendModes.MULTIPLY);
    }
    if (this.phase.glow) {
      scene.add
        .rectangle(0, 0, width, height, this.phase.glow)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(tintDepth)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
    if (!this.phase.night) return;

    const camera = scene.cameras.main;
    startGlints(
      scene,
      () => {
        const view = camera.worldView;
        const x = Phaser.Math.Between(view.x, view.right);
        const y = Phaser.Math.Between(view.y, view.bottom);
        const { col, row } = tileAt(x, y);
        return info.isOpen(col, row) ? { x, y, bright: Math.random() < 0.3 } : null;
      },
      { depth: glowDepth, delay: 70 },
    );

    // Fireflies over reeds that border the water, about one per ten open tiles.
    const shoreReeds = [];
    for (let row = 0; row < info.rows; row++) {
      for (let col = 0; col < info.cols; col++) {
        if (info.isOpen(col, row)) continue;
        const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => info.isOpen(col + dc, row + dr));
        if (nearWater) shoreReeds.push({ col, row });
      }
    }
    const count = Phaser.Math.Clamp(Math.round(info.open.length / 10), 6, 40);
    for (const { col, row } of Phaser.Utils.Array.Shuffle(shoreReeds).slice(0, count)) {
      addFirefly(scene, (col + 0.5) * TILE_SIZE, (row + 0.5) * TILE_SIZE, { depth: glowDepth, rangeX: 30, rangeY: 30 });
    }
  }
}
