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
const TOP_LOON_PALETTE = { K: '#141414', W: '#f4f4f4', D: '#2e2e2e', R: '#d32f2f', g: '#6b6b6b', f: '#3a3a3a' };

// Columns, left to right: feet, tail, spotted back, white collar, head
// (red eye on each side), pointed bill.
export const LOON_TOP_FEET_OUT = {
  palette: TOP_LOON_PALETTE,
  rows: [
    '......DDDDDDD...........',
    '....DDKKKKKKKDD.........',
    'ff.DKWKKWKKWKKD....KK...',
    '..KKKKKKKKKKKKKWKKKRKg..',
    '..KKWKKWKKWKKKKWKKKKKggg',
    '..KKKKKKKKKKKKKWKKKRKg..',
    'ff.DKWKKWKKWKKD....KK...',
    '....DDKKKKKKKDD.........',
    '......DDDDDDD...........',
  ],
};

export const LOON_TOP_FEET_IN = {
  palette: TOP_LOON_PALETTE,
  rows: [
    '......DDDDDDD...........',
    '....DDKKKKKKKDD.........',
    '...DKWKKWKKWKKD....KK...',
    '.fKKKKKKKKKKKKKWKKKRKg..',
    '..KKWKKWKKWKKKKWKKKKKggg',
    '.fKKKKKKKKKKKKKWKKKRKg..',
    '...DKWKKWKKWKKD....KK...',
    '....DDKKKKKKKDD.........',
    '......DDDDDDD...........',
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
