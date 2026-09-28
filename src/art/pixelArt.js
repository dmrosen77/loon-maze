import * as Phaser from 'phaser';

// Pixel art drawn as character grids, like the mazes. Each character is one
// pixel, looked up in the palette; '.' is transparent. Edit by hand.

// Adult loon, side view, facing right: black head with a red eye, striped
// white necklace, and a black back checkered with white.
export const LOON = {
  palette: { K: '#141414', W: '#f4f4f4', R: '#d32f2f', g: '#3c3c3c', S: '#cfd8dc' },
  rows: [
    '....................KKKK......',
    '...................KKKKKK.....',
    '...................KKKKRKK....',
    '...................KKKKKKKgggg',
    '....................KKKKK.....',
    '...................KWKWK......',
    '...................KKKKK......',
    '..KK..............KWKWKK......',
    '.KKKKKKKKKKKKKKKKKKKKKKK......',
    'KKWKKWKKWKKWKKWKKWKKKKKKK.....',
    '.KKKWKKWKKWKKWKKWKKWKKKKKK....',
    '..KKKKKKKKKKKKKKKKKKKKKKKK....',
    '...SSSSSSSSSSSSSSSSSSSSSS.....',
  ],
};

// Fuzzy gray chick, same facing, small enough to ride on the adult's back.
export const BABY_LOON = {
  palette: { G: '#8d8d8d', L: '#d0d0d0', R: '#d32f2f', g: '#3c3c3c' },
  rows: [
    '........GGG...',
    '.......GGRGgg.',
    '........GGG...',
    '.GG....GGGG...',
    'GGGGGGGGGGGG..',
    '.GGGGGGGGGGG..',
    '..LLLLLLLLL...',
  ],
};

// In-game sprites, seen from above, facing right (the game rotates them to
// face the way they swim). Two frames of paddling: feet spread, feet tucked.
// Based on art-source/loon-top.webp, redrawn by hand at game size.
const TOP_LOON_PALETTE = {
  K: '#0e0e12', // outline
  D: '#222430', // dark feathers
  W: '#eceef0', // spots, breast, collar stripes
  N: '#1a2648', // navy collar stripes
  H: '#286040', // green sheen on the crown
  R: '#be1e1e', // eyes
  G: '#565e64', // tail, feet, bill
};

// Columns, left to right: webbed feet, gray tail, two spotted wings split by a
// dark line down the back, white breast, striped collar, green-crowned head
// (red eye on each side), pointed bill.
export const LOON_TOP_FEET_OUT = {
  palette: TOP_LOON_PALETTE,
  rows: [
    '.......KKKKKKKK...........',
    '......KDDWDDWDDKK.........',
    'GG..KKDWDDWDDWDDWK..KKK...',
    '.GGKGDDDWDDWDDWDWWWKDDRK..',
    '..KGGDKWDDWDDWDDDNNDHHDKG.',
    '..KGGGKKKKKKKKKKDWWDHHDKGG',
    '..KGGDKWDDWDDWDDDNNDHHDKG.',
    '.GGKGDDDWDDWDDWDWWWKDDRK..',
    'GG..KKDWDDWDDWDDWK..KKK...',
    '......KDDWDDWDDKK.........',
    '.......KKKKKKKK...........',
  ],
};

export const LOON_TOP_FEET_IN = {
  palette: TOP_LOON_PALETTE,
  rows: [
    '.......KKKKKKKK...........',
    '......KDDWDDWDDKK.........',
    '....KKDWDDWDDWDDWK..KKK...',
    '...KGDDDWDDWDDWDWWWKDDRK..',
    '.GKGGDKWDDWDDWDDDNNDHHDKG.',
    '..KGGGKKKKKKKKKKDWWDHHDKGG',
    '.GKGGDKWDDWDDWDDDNNDHHDKG.',
    '...KGDDDWDDWDDWDWWWKDDRK..',
    '....KKDWDDWDDWDDWK..KKK...',
    '......KDDWDDWDDKK.........',
    '.......KKKKKKKK...........',
  ],
};

export const BABY_LOON_TOP = {
  palette: { G: '#8d8d8d', L: '#bdbdbd', R: '#d32f2f', g: '#5a5a5a' },
  rows: [
    '.GGGGG...',
    'GGLGGGGR.',
    'GLGGLGGGg',
    'GGLGGGGR.',
    '.GGGGG...',
  ],
};

// Reed tiles for the maze walls, seen from above. Unlike the loon these are
// generated rather than hand-drawn, so there are several variations. Each one
// uses a fixed seed, so it comes out the same every time.
export const REED_TILE_VARIANTS = 4;

const REED_PALETTE = {
  s: '#142a0f', // deep shadow between stems
  d: '#1f3d17', // dark mat of reeds
  m: '#3a7327', // blades
  l: '#6aa83c', // sunlit blade tips
  b: '#6b4226', // cattail head
  B: '#9a643a', // cattail highlight
};

const EIGHT_DIRECTIONS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

function reedTileRows(rng, size) {
  const grid = Array.from({ length: size }, () => Array(size).fill('d'));
  const set = (x, y, char) => {
    if (x >= 0 && x < size && y >= 0 && y < size) grid[y][x] = char;
  };

  // Speckles of shadow in the mat.
  for (let i = 0; i < (size * size) / 8; i++) {
    set(rng.between(0, size - 1), rng.between(0, size - 1), 's');
  }

  // Clumps: blades fanning out from a stem, with lighter tips.
  for (let clump = 0; clump < 7; clump++) {
    const x = rng.between(1, size - 2);
    const y = rng.between(1, size - 2);
    const blades = rng.between(3, 5);
    for (let blade = 0; blade < blades; blade++) {
      const [dx, dy] = rng.pick(EIGHT_DIRECTIONS);
      const length = rng.between(3, 6);
      for (let i = 0; i < length; i++) {
        set(x + dx * i, y + dy * i, i === length - 1 ? 'l' : 'm');
      }
    }
  }

  // A cattail head or two, seen end-on.
  const cattails = rng.between(0, 2);
  for (let i = 0; i < cattails; i++) {
    const x = rng.between(2, size - 4);
    const y = rng.between(2, size - 4);
    set(x, y, 'B');
    set(x + 1, y, 'b');
    set(x, y + 1, 'b');
    set(x + 1, y + 1, 'b');
  }

  return grid.map((row) => row.join(''));
}

// Makes textures 'reeds-0' to 'reeds-N' sized to fill one maze tile.
export function makeReedTextures(scene, tileSize, pixelSize) {
  const size = tileSize / pixelSize;
  for (let i = 0; i < REED_TILE_VARIANTS; i++) {
    const rng = new Phaser.Math.RandomDataGenerator([`reeds-${i}`]);
    makePixelTexture(scene, `reeds-${i}`, { palette: REED_PALETTE, rows: reedTileRows(rng, size) }, pixelSize);
  }
}

// A seamless tile of lake water: short ripple dashes and the odd glint on a
// blue base. Dashes wrap around the edges so the tile repeats without seams.
const WATER_PALETTE = {
  b: '#2a6f97', // base water (matches the background color)
  d: '#245f84', // ripple troughs
  l: '#3a84ae', // ripple crests
  w: '#8ec5e0', // glints
};

function waterTileRows(rng, size) {
  const grid = Array.from({ length: size }, () => Array(size).fill('b'));
  const dash = (char, count, minLength, maxLength) => {
    for (let i = 0; i < count; i++) {
      const x = rng.between(0, size - 1);
      const y = rng.between(0, size - 1);
      const length = rng.between(minLength, maxLength);
      for (let j = 0; j < length; j++) grid[y][(x + j) % size] = char;
    }
  };
  dash('d', 26, 3, 7);
  dash('l', 18, 2, 5);
  dash('w', 5, 1, 1);
  return grid.map((row) => row.join(''));
}

// Makes the 'water' texture: one tile, repeated across the lake by a TileSprite.
export function makeWaterTexture(scene, tileSize, pixelSize) {
  const rng = new Phaser.Math.RandomDataGenerator(['water']);
  const size = (tileSize * 2) / pixelSize; // Two maze tiles wide, so it repeats less often.
  makePixelTexture(scene, 'water', { palette: WATER_PALETTE, rows: waterTileRows(rng, size) }, pixelSize);
}

// Draws the art into a texture. Nearest-neighbor filtering keeps the pixels
// crisp when a sprite is rotated.
export function makePixelTexture(scene, key, art, pixelSize) {
  if (scene.textures.exists(key)) return;
  const width = Math.max(...art.rows.map((row) => row.length));
  const texture = scene.textures.createCanvas(key, width * pixelSize, art.rows.length * pixelSize);
  const ctx = texture.getContext();
  art.rows.forEach((row, y) => {
    [...row].forEach((char, x) => {
      const color = art.palette[char];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    });
  });
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
}
