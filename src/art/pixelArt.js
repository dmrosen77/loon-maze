import * as Phaser from 'phaser';

// Pixel art drawn as character grids, like the mazes. Each character is one
// pixel, looked up in the palette; '.' is transparent. Edit by hand.

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

// Heart for the reunion cutscene, drawn at the same chunky scale as the
// PNG sprites in src/assets/.
export const HEART = {
  palette: { R: '#e8475f', P: '#ffb3c1', D: '#a82a42' },
  rows: [
    '.RR.RR.',
    'RPRRRRR',
    'RRRRRRR',
    '.RRRRRD',
    '..RRRD.',
    '...D...',
  ],
};

// Reed tiles for the maze walls, seen from above. Unlike the loon these are
// generated rather than hand-drawn. Each tile is built from:
// - a variant (which fixed seed lays out its clumps and cattails),
// - which sides face open water (those edges fray, and blades reach out
//   over the water, so walls don't look like hard-edged blocks),
// - a sway frame (blades bent one way, upright, or bent the other way).
// The same variant and sides always give the same tile, and the sway frames
// only bend the blades, so switching frames animates them in the wind.
export const REED_TILE_VARIANTS = 4;
export const REED_SWAY_FRAMES = 3;
export const WATER_SIDE = { N: 1, E: 2, S: 4, W: 8 };

// Art pixels of overhang around each tile, for blades reaching over the water.
const REED_MARGIN = 2;

const REED_PALETTE = {
  s: '#142a0f', // deep shadow between stems
  d: '#1f3d17', // dark mat of reeds
  m: '#3a7327', // blades
  l: '#6aa83c', // sunlit blade tips
  b: '#6b4226', // cattail head
  B: '#9a643a', // cattail highlight
  e: 'rgba(31, 61, 23, 0.5)', // mat thinning out at the water's edge
  f: 'rgba(58, 115, 39, 0.6)', // blades reaching out over the water
  t: 'rgba(106, 168, 60, 0.6)', // their tips
};

const EIGHT_DIRECTIONS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

function reedTileRows(variant, waterSides, sway, size) {
  // Separate generators, so the fraying and the sway can't change the layout.
  const rng = new Phaser.Math.RandomDataGenerator([`reeds-${variant}`]);
  const frayRng = new Phaser.Math.RandomDataGenerator([`reeds-${variant}-${waterSides}`]);

  const full = size + REED_MARGIN * 2;
  const lo = REED_MARGIN;
  const hi = REED_MARGIN + size - 1;
  const inMat = (x, y) => x >= lo && x <= hi && y >= lo && y <= hi;
  // Overhang is only drawn where it's over open water, never over a
  // neighboring reed tile.
  const overWater = (x, y) =>
    x >= 0 && y >= 0 && x < full && y < full &&
    (y >= lo || waterSides & WATER_SIDE.N) &&
    (y <= hi || waterSides & WATER_SIDE.S) &&
    (x >= lo || waterSides & WATER_SIDE.W) &&
    (x <= hi || waterSides & WATER_SIDE.E);

  const grid = Array.from({ length: full }, (_, y) =>
    Array.from({ length: full }, (_, x) => (inMat(x, y) ? 'd' : '.')),
  );
  const set = (x, y, char) => {
    if (inMat(x, y)) grid[y][x] = char;
    else if (overWater(x, y)) grid[y][x] = char === 'l' ? 't' : 'f';
  };

  // Speckles of shadow in the mat.
  for (let i = 0; i < (size * size) / 8; i++) {
    set(rng.between(lo, hi), rng.between(lo, hi), 's');
  }

  // Fray the edges that face water: the outermost pixels are mostly gone or
  // see-through, thinning out over the first three pixels in.
  const CLEAR = [0.45, 0.15, 0];
  const THIN = [0.35, 0.35, 0.2];
  for (let y = lo; y <= hi; y++) {
    for (let x = lo; x <= hi; x++) {
      const depth = Math.min(
        waterSides & WATER_SIDE.N ? y - lo : Infinity,
        waterSides & WATER_SIDE.S ? hi - y : Infinity,
        waterSides & WATER_SIDE.W ? x - lo : Infinity,
        waterSides & WATER_SIDE.E ? hi - x : Infinity,
      );
      if (depth > 2) continue;
      const roll = frayRng.frac();
      if (roll < CLEAR[depth]) grid[y][x] = '.';
      else if (roll < CLEAR[depth] + THIN[depth]) grid[y][x] = 'e';
    }
  }

  // Clumps: blades fanning out from a stem, with lighter tips. The wind bends
  // each blade sideways, most at the tip.
  for (let clump = 0; clump < 7; clump++) {
    const x = rng.between(lo + 1, hi - 1);
    const y = rng.between(lo + 1, hi - 1);
    const blades = rng.between(3, 5);
    for (let blade = 0; blade < blades; blade++) {
      const [dx, dy] = rng.pick(EIGHT_DIRECTIONS);
      const length = rng.between(3, 6);
      for (let i = 0; i < length; i++) {
        const bend = Math.round((sway * 1.5 * i) / (length - 1));
        set(x + dx * i + bend, y + dy * i, i === length - 1 ? 'l' : 'm');
      }
    }
  }

  // A cattail head or two, seen end-on.
  const cattails = rng.between(0, 2);
  for (let i = 0; i < cattails; i++) {
    const x = rng.between(lo + 2, hi - 3);
    const y = rng.between(lo + 2, hi - 3);
    set(x, y, 'B');
    set(x + 1, y, 'b');
    set(x, y + 1, 'b');
    set(x + 1, y + 1, 'b');
  }

  return grid.map((row) => row.join(''));
}

// Returns the texture key for a reed tile, making the texture on first use.
// The texture is slightly bigger than a maze tile because of the overhang.
export function reedTexture(scene, variant, waterSides, frame, tileSize, pixelSize) {
  const key = `reeds-${variant}-${waterSides}-${frame}`;
  if (!scene.textures.exists(key)) {
    const sway = frame - 1; // Frames 0, 1, 2 lean -1, 0, +1.
    const rows = reedTileRows(variant, waterSides, sway, tileSize / pixelSize);
    makePixelTexture(scene, key, { palette: REED_PALETTE, rows }, pixelSize);
  }
  return key;
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
