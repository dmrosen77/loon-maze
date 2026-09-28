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
// How fast the loon turns to face its swimming direction, in radians per second.
export const LOON_TURN_SPEED = 12;
// Square collision box, so walls behave the same whichever way the loon faces.
// The sprite is a bit longer than this, so its head can poke into the reeds.
export const LOON_BODY_SIZE = 24;

// Screen pixels per art pixel for the in-game sprites (see src/art/pixelArt.js).
export const SPRITE_PIXEL_SIZE = 2;

// Gusts of wind sweeping across the reeds: how fast they pass (radians per
// second) and how far apart they are (pixels).
export const REED_SWAY_SPEED = 1.8;
export const REED_GUST_SPACING = 360;

// How fast the water texture drifts, in pixels per second.
export const WATER_DRIFT = { x: 6, y: 2 };

// Wake behind the swimming loon: two droplets every WAKE_INTERVAL_MS, plus a
// splash of WAKE_SPLASH droplets at each foot on every paddle stroke.
export const WAKE_INTERVAL_MS = 45;
export const WAKE_SPLASH = 3;

// 0 = silent, 1 = full. Press M in game to mute everything.
export const VOLUME = {
  master: 0.8,
  music: 0.5,
  sfx: 0.8,
};

// Used for all in-game text. Loaded from the @fontsource/press-start-2p package.
export const FONT_FAMILY = 'Press Start 2P';

// Reed colors are in REED_PALETTE in src/art/pixelArt.js.
export const COLORS = {
  water: '#2a6f97',
};

// Night lake on the title screen.
export const TITLE_COLORS = {
  sky: [0x0b1026, 0x111a3a, 0x19254f, 0x223264], // Top band to horizon.
  stars: 0xfff8e1,
  moon: 0xf5f1c8,
  forest: 0x0a1a12,
  water: 0x1c4e6e,
  ripple: 0x8ec5e0,
  reeds: [0x2f5e1c, 0x3d7524],
  title: '#ffd54f',
};
