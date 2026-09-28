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

// Draws the art into a texture with crisp, unsmoothed pixels.
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
}
