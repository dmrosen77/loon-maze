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

// Lake life dotted around the maze's open water (src/game/Decor.js), at the
// in-game sprite scale. A lily pad with its notch, the same pad with a water
// lily, a frog seen from above (facing up), and a dragonfly facing right in
// two wingbeat frames (wings spread, wings blurred short).
const LILY_PALETTE = { d: '#2c5f27', g: '#4a8f37', l: '#79bd55', p: '#f4b6c8', w: '#fff4f6', y: '#f5d142' };
export const LILY_PAD = {
  palette: LILY_PALETTE,
  rows: [
    '...dddd...',
    '.ddggggdd.',
    '.dglggggd.',
    'dglgggggd.',
    'dggggggg..',
    'dgggggg...',
    'dggggggg..',
    'dgggggggd.',
    '.dgggggdd.',
    '..dddddd..',
  ],
};
export const LILY_PAD_FLOWER = {
  palette: LILY_PALETTE,
  rows: [
    '...dddd...',
    '.ddggggdd.',
    '.dgpwpggd.',
    'dgpwywpgd.',
    'dggpwpgg..',
    'dgggggg...',
    'dggggggg..',
    'dgggggggd.',
    '.dgggggdd.',
    '..dddddd..',
  ],
};
export const FROG = {
  palette: { K: '#141414', w: '#f2f2c8', G: '#5ea33e', g: '#3d7629', y: '#c9d97a' },
  rows: [
    '.K...K.',
    'KwKGKwK',
    '.GGGGG.',
    'GgGyGgG',
    '.GGyGG.',
    'G.GGG.G',
    'G.....G',
  ],
};
const DRAGONFLY_PALETTE = { w: 'rgba(210, 236, 255, 0.75)', b: '#2f86d6', B: '#123f6e' };
export const DRAGONFLY_SPREAD = {
  palette: DRAGONFLY_PALETTE,
  rows: [
    '.ww..ww..',
    '..ww.ww..',
    'bbbbbbbBB',
    '..ww.ww..',
    '.ww..ww..',
  ],
};
export const DRAGONFLY_BLUR = {
  palette: DRAGONFLY_PALETTE,
  rows: [
    '.........',
    '..ww.ww..',
    'bbbbbbbBB',
    '..ww.ww..',
    '.........',
  ],
};

// A fish seen from above, facing right, in silver and in gold.
const FISH_ROWS = [
  '....ooo..',
  't..oOOOo.',
  'ttoOOOOOo',
  't..oOOOo.',
  '....ooo..',
];
export const FISH = { palette: { o: '#50646f', O: '#a9bcc6', t: '#7d929c' }, rows: FISH_ROWS };
export const GOLDEN_FISH = { palette: { o: '#9a6a12', O: '#ffd54f', t: '#e0a526' }, rows: FISH_ROWS };

// A big air bubble (the extra-dive pickup), with a highlight.
export const AIR_BUBBLE = {
  palette: { b: '#cfeeff', w: '#ffffff', f: 'rgba(150, 205, 255, 0.35)' },
  rows: [
    '..bbbbb..',
    '.bfffffb.',
    'bffwwfffb',
    'bffwffffb',
    'bfffffffb',
    'bfffffffb',
    'bfffffffb',
    '.bfffffb.',
    '..bbbbb..',
  ],
};

// Stars for the reunion screen, earned and not.
const STAR_ROWS = [
  '....o....',
  '...oyo...',
  'oooyyyooo',
  'oyyyyyyyo',
  '.oyyyyyo.',
  '.oyyoyyo.',
  'oyyo.oyyo',
  'oo.....oo',
];
export const STAR = { palette: { o: '#8a5a00', y: '#ffd54f' }, rows: STAR_ROWS };
export const STAR_EMPTY = { palette: { o: '#1c2233', y: '#3a4560' }, rows: STAR_ROWS };

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

// Special wall tiles (see src/mazes/terrain.js), generated like the reeds but
// without sway. Each is exactly one maze tile.

// Rocks: a few rounded boulders, lit from the top left, packed over dark
// gravel, with specks of moss.
const ROCK_PALETTE = {
  k: '#23262b', // crevices
  g: '#3a3e45', // gravel
  d: '#50555d', // boulder shade
  r: '#6d737b', // boulder
  l: '#959ba3', // lit side
  h: '#b9bfc6', // highlight
  m: '#55713f', // moss
};

// How far a pixel is from the nearest edge that faces water (Infinity if none).
function depthFromWater(x, y, size, waterSides) {
  return Math.min(
    waterSides & WATER_SIDE.N ? y : Infinity,
    waterSides & WATER_SIDE.S ? size - 1 - y : Infinity,
    waterSides & WATER_SIDE.W ? x : Infinity,
    waterSides & WATER_SIDE.E ? size - 1 - x : Infinity,
  );
}

// Crumble the edges that face water: the outermost pixels are mostly gone,
// thinning out over the first two pixels in, so the tile doesn't end in a
// hard straight line. Only `crumbly` pixels (the filler, not the boulders or
// sticks on top) are removed.
function crumbleEdges(grid, rng, size, waterSides, crumbly) {
  const CLEAR = [0.6, 0.25];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const depth = depthFromWater(x, y, size, waterSides);
      if (depth < CLEAR.length && crumbly.includes(grid[y][x]) && rng.frac() < CLEAR[depth]) grid[y][x] = '.';
    }
  }
}

function rockTileRows(variant, waterSides, size) {
  const rng = new Phaser.Math.RandomDataGenerator([`rock-${variant}`]);
  const edgeRng = new Phaser.Math.RandomDataGenerator([`rock-${variant}-${waterSides}`]);
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => (rng.frac() < 0.35 ? 'k' : 'g')));
  crumbleEdges(grid, edgeRng, size, waterSides, ['k', 'g']);
  const boulders = rng.between(3, 4);
  for (let i = 0; i < boulders; i++) {
    const r = rng.between(4, 7);
    // Whole boulders, never cut off by the tile's edge.
    const cx = rng.between(r, size - 1 - r);
    const cy = rng.between(r, size - 1 - r);
    for (let y = Math.max(0, cy - r); y <= Math.min(size - 1, cy + r); y++) {
      for (let x = Math.max(0, cx - r); x <= Math.min(size - 1, cx + r); x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distance = Math.hypot(dx, dy);
        if (distance > r) continue;
        const light = -(dx + dy) / r; // Toward the top left is lit.
        let char = light > 0.9 ? 'h' : light > 0.35 ? 'l' : light < -0.6 ? 'd' : 'r';
        if (distance > r - 1) char = light > 0.3 ? 'd' : 'k'; // Rim
        grid[y][x] = char;
      }
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = rng.between(1, size - 2);
    const y = rng.between(1, size - 2);
    if (grid[y][x] === 'r' || grid[y][x] === 'd') grid[y][x] = 'm';
  }
  return grid.map((row) => row.join(''));
}

// A beaver dam: sticks crisscrossing over mud, with a few leaves.
const DAM_PALETTE = {
  m: '#3a2a1c', // mud
  M: '#2c2016', // deep mud
  s: '#6b4a2e', // stick
  S: '#8f6a43', // lit stick
  t: '#4f3622', // stick shadow
  g: '#5f7f3a', // leaf
};

function damTileRows(variant, waterSides, size) {
  const rng = new Phaser.Math.RandomDataGenerator([`dam-${variant}`]);
  const edgeRng = new Phaser.Math.RandomDataGenerator([`dam-${variant}-${waterSides}`]);
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => (rng.frac() < 0.3 ? 'M' : 'm')));
  crumbleEdges(grid, edgeRng, size, waterSides, ['m', 'M']);
  const put = (x, y, char) => {
    if (x >= 0 && y >= 0 && x < size && y < size) grid[y][x] = char;
  };
  for (let i = 0; i < 16; i++) {
    const angle = rng.frac() * Math.PI;
    const length = rng.between(7, 18);
    const x0 = rng.between(0, size - 1);
    const y0 = rng.between(0, size - 1);
    for (let j = 0; j < length; j++) {
      const x = Math.round(x0 + Math.cos(angle) * (j - length / 2));
      const y = Math.round(y0 + Math.sin(angle) * (j - length / 2));
      put(x, y + 1, 't');
      put(x, y, j % 5 === 0 ? 'S' : 's');
    }
  }
  for (let i = 0; i < 4; i++) put(rng.between(0, size - 1), rng.between(0, size - 1), 'g');
  return grid.map((row) => row.join(''));
}

// A floating log lying along the wall, with water showing at its sides.
// `across` is 'h' (lying left to right) or 'v' (top to bottom).
const LOG_PALETTE = {
  o: '#2e1d10', // outline
  b: '#6e4a2c', // bark
  l: '#93683d', // lit bark
  d: '#4f341e', // bark grooves
  k: '#3a2616', // knot
};

function logTileRows(variant, across, size) {
  const rng = new Phaser.Math.RandomDataGenerator([`log-${variant}`]);
  const top = 3;
  const bottom = size - 4;
  const grid = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, () => (y < top || y > bottom ? '.' : 'b')),
  );
  for (let x = 0; x < size; x++) {
    grid[top][x] = 'o';
    grid[bottom][x] = 'o';
    grid[top + 1][x] = 'l';
    grid[top + 2][x] = rng.frac() < 0.7 ? 'l' : 'b';
  }
  // Grooves running along the bark.
  for (let i = 0; i < 9; i++) {
    const y = rng.between(top + 3, bottom - 1);
    const x = rng.between(0, size - 1);
    const length = rng.between(3, 8);
    for (let j = 0; j < length; j++) grid[y][(x + j) % size] = 'd';
  }
  const knotX = rng.between(3, size - 4);
  const knotY = rng.between(top + 3, bottom - 3);
  grid[knotY][knotX] = 'k';
  grid[knotY][knotX + 1] = 'k';
  grid[knotY + 1][knotX] = 'd';
  const rows = grid.map((row) => row.join(''));
  if (across === 'h') return rows;
  return rows.map((_, x) => rows.map((row) => row[x]).join('')); // Turned upright.
}

// Texture keys for the special walls, made on first use.
// `waterSides` (WATER_SIDE flags) are the edges that crumble into the water.
export function rockTexture(scene, variant, waterSides, tileSize, pixelSize) {
  const key = `rock-${variant}-${waterSides}`;
  if (!scene.textures.exists(key)) {
    const rows = rockTileRows(variant, waterSides, tileSize / pixelSize);
    makePixelTexture(scene, key, { palette: ROCK_PALETTE, rows }, pixelSize);
  }
  return key;
}

export function damTexture(scene, variant, waterSides, tileSize, pixelSize) {
  const key = `dam-${variant}-${waterSides}`;
  if (!scene.textures.exists(key)) {
    const rows = damTileRows(variant, waterSides, tileSize / pixelSize);
    makePixelTexture(scene, key, { palette: DAM_PALETTE, rows }, pixelSize);
  }
  return key;
}

export function logTexture(scene, variant, across, tileSize, pixelSize) {
  const key = `log-${variant}-${across}`;
  if (!scene.textures.exists(key)) {
    const rows = logTileRows(variant, across, tileSize / pixelSize);
    makePixelTexture(scene, key, { palette: LOG_PALETTE, rows }, pixelSize);
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
// A different `palette` (same b/d/l/w letters) makes a recolored copy under
// another `key`, with the same ripples.
export function makeWaterTexture(scene, tileSize, pixelSize, { key = 'water', palette = WATER_PALETTE } = {}) {
  const rng = new Phaser.Math.RandomDataGenerator(['water']);
  const size = (tileSize * 2) / pixelSize; // Two maze tiles wide, so it repeats less often.
  makePixelTexture(scene, key, { palette, rows: waterTileRows(rng, size) }, pixelSize);
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
