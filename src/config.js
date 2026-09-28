// Tuning values. Tweak freely.
export const TILE_SIZE = 40;

// Size of the game window in pixels. Mazes bigger than this scroll with the loon.
export const VIEW_WIDTH = 840;
export const VIEW_HEIGHT = 600;

// true: a new random maze every level. false: every level uses the hand-made
// maze in src/mazes/maze1.js (handy for testing a layout).
export const PROCEDURAL_MAZE = true;

// Level 1's maze size in tiles, and how many tiles each level adds.
// Keep the level 1 sizes odd and the growth even so every maze is odd-sized.
export const LEVEL_1_COLS = 11;
export const LEVEL_1_ROWS = 9;
export const GROWTH_PER_LEVEL = 2;
export const MAX_COLS = 41;
export const MAX_ROWS = 31;

// Pause after reaching the baby before the next level starts (lets the loon calls finish).
export const LEVEL_ADVANCE_MS = 3000;

export const LOON_SPEED = 180;
// Time between paddling sounds while swimming.
export const LOON_STROKE_MS = 380;
export const LOON_WIDTH = 30;
export const LOON_HEIGHT = 20;

export const BABY_WIDTH = 18;
export const BABY_HEIGHT = 12;

// 0 = silent, 1 = full. Press M in game to mute everything.
export const VOLUME = {
  master: 0.8,
  music: 0.5,
  sfx: 0.8,
};

export const COLORS = {
  water: '#2a6f97',
  reeds: 0x4c8c2b,
  loon: 0x1b1b1b,
  baby: 0x9e9e9e,
};
