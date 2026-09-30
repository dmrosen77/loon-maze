import * as Phaser from 'phaser';
import { CHICK_WANDER_PAUSE_MS } from '../config.js';
import { tileAt, tileCenter } from '../mazes/mazeInfo.js';

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// A chick that doesn't sit still: every so often it paddles to a
// neighboring open tile, staying within `radius` tiles (by water) of where it
// started, and peeps. (GameScene checks the distance to it each frame, so
// reaching it works wherever it is.) Stops once the loon has reached it.
export default class WanderingChick {
  constructor(scene, baby, info, { radius, onMove }) {
    this.scene = scene;
    this.baby = baby;
    this.onMove = onMove;

    // The tiles it may visit: within `radius` steps of home through open water.
    const home = tileAt(baby.x, baby.y);
    const key = (col, row) => `${col},${row}`;
    this.allowed = new Set([key(home.col, home.row)]);
    let frontier = [home];
    for (let step = 0; step < radius; step++) {
      const next = [];
      for (const tile of frontier) {
        for (const [dc, dr] of STEPS) {
          const col = tile.col + dc;
          const row = tile.row + dr;
          if (info.isOpen(col, row) && !this.allowed.has(key(col, row))) {
            this.allowed.add(key(col, row));
            next.push({ col, row });
          }
        }
      }
      frontier = next;
    }
    this.key = key;
    this.wait();
  }

  wait() {
    this.scene.time.delayedCall(Phaser.Math.Between(...CHICK_WANDER_PAUSE_MS), () => this.paddle());
  }

  paddle() {
    if (this.scene.reunited || this.scene.gameOver || !this.baby.active) return;
    const here = tileAt(this.baby.x, this.baby.y);
    const choices = STEPS.map(([dc, dr]) => ({ col: here.col + dc, row: here.row + dr })).filter(({ col, row }) =>
      this.allowed.has(this.key(col, row)),
    );
    if (choices.length === 0) {
      this.wait();
      return;
    }
    const target = tileCenter(Phaser.Utils.Array.GetRandom(choices));
    const x = target.x + Phaser.Math.Between(-4, 4);
    const y = target.y + Phaser.Math.Between(-4, 4);
    // Face the way it paddles, in quarter turns (pixel art looks ragged otherwise).
    this.baby.rotation = Phaser.Math.Snap.To(Phaser.Math.Angle.Between(this.baby.x, this.baby.y, x, y), Math.PI / 2);
    this.onMove?.();
    this.scene.tweens.add({
      targets: this.baby,
      x,
      y,
      duration: 750,
      ease: 'Sine.easeInOut',
      onComplete: () => this.wait(),
    });
  }
}
