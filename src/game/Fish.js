import * as Phaser from 'phaser';
import {
  GOLDEN_FISH_CHANCE,
  FISH_SPEED,
  FISH_FLEE_SPEED,
  FISH_FLEE_DISTANCE,
  SPRITE_PIXEL_SIZE,
} from '../config.js';
import { FISH, GOLDEN_FISH, makePixelTexture } from '../art/pixelArt.js';
import { tileCenter, tileAt } from '../mazes/mazeInfo.js';

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const CATCH_DISTANCE = 18;

// A shuffled copy, using the given random function.
function shuffle(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// `count` fish darting around the open water. Each swims from tile to neighboring
// open tile (so it never crosses the reeds), and bolts away when the loon
// comes close, but slower than the loon can swim. Swimming into one (on the
// surface or diving) calls onCatch(x, y, golden).
export default class Fish {
  constructor(scene, info, { count, depth, onCatch, random = Math.random }) {
    this.scene = scene;
    this.info = info;
    this.onCatch = onCatch;
    makePixelTexture(scene, 'fish', FISH, SPRITE_PIXEL_SIZE);
    makePixelTexture(scene, 'fish-golden', GOLDEN_FISH, SPRITE_PIXEL_SIZE);

    // Anywhere but right by the start or on the chick.
    const spots = info.open.filter(
      ({ col, row }) => info.distanceFromStart(col, row) >= 3 && !(col === info.baby.col && row === info.baby.row),
    );
    // Where they start and which are golden follow `random` (seeded in LAKES
    // mode); how they swim doesn't need to.
    this.fish = shuffle(spots, random)
      .slice(0, count)
      .map((tile) => {
        const golden = random() < GOLDEN_FISH_CHANCE;
        const { x, y } = tileCenter(tile);
        const fish = scene.add.image(x, y, golden ? 'fish-golden' : 'fish').setDepth(depth);
        fish.golden = golden;
        fish.fleeing = false;
        this.swim(fish, FISH_SPEED);
        return fish;
      });
  }

  // Swim to a spot in a neighboring open tile, then pause and go again. When
  // fleeing, head for the neighbor farthest from the loon.
  swim(fish, speed, from = null) {
    const here = tileAt(fish.x, fish.y);
    let choices = STEPS.map(([dc, dr]) => ({ col: here.col + dc, row: here.row + dr })).filter(({ col, row }) =>
      this.info.isOpen(col, row),
    );
    if (choices.length === 0) choices = [here];
    let next = Phaser.Utils.Array.GetRandom(choices);
    if (from) {
      next = choices.reduce((best, tile) => {
        const d = (t) => Phaser.Math.Distance.Between(tileCenter(t).x, tileCenter(t).y, from.x, from.y);
        return d(tile) > d(best) ? tile : best;
      });
    }
    const center = tileCenter(next);
    const x = center.x + Phaser.Math.Between(-8, 8);
    const y = center.y + Phaser.Math.Between(-8, 8);
    fish.rotation = Phaser.Math.Angle.Between(fish.x, fish.y, x, y);
    const distance = Phaser.Math.Distance.Between(fish.x, fish.y, x, y);
    this.scene.tweens.killTweensOf(fish);
    this.scene.tweens.add({
      targets: fish,
      x,
      y,
      duration: Math.max(150, (distance / speed) * 1000),
      ease: from ? 'Quad.easeOut' : 'Sine.easeInOut',
      onComplete: () => {
        fish.fleeing = false;
        if (!fish.active) return;
        this.scene.time.delayedCall(from ? 100 : Phaser.Math.Between(300, 1400), () => {
          if (fish.active && !fish.fleeing) this.swim(fish, FISH_SPEED);
        });
      },
    });
  }

  update(loon) {
    for (const fish of this.fish) {
      if (!fish.active) continue;
      const distance = Phaser.Math.Distance.Between(fish.x, fish.y, loon.x, loon.y);
      if (distance < CATCH_DISTANCE) {
        const { x, y, golden } = fish;
        this.scene.tweens.killTweensOf(fish);
        fish.destroy();
        this.onCatch(x, y, golden);
      } else if (distance < FISH_FLEE_DISTANCE && !fish.fleeing) {
        fish.fleeing = true;
        this.swim(fish, FISH_FLEE_SPEED, loon);
      }
    }
  }

  get caught() {
    return this.fish.filter((fish) => !fish.active).length;
  }

  get total() {
    return this.fish.length;
  }
}
