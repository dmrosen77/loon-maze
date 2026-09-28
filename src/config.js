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

// How long the reunion cutscene plays before the next level starts (Enter skips it).
export const REUNION_MS = 8000;

export const LOON_SPEED = 180;
// Time between paddling sounds while swimming.
export const LOON_STROKE_MS = 380;
// How fast the loon turns to face its swimming direction, in radians per second.
export const LOON_TURN_SPEED = 12;
// Hit points. Each swim into the reeds costs HIT_DAMAGE, and 0 is game over.
// After a hit the loon can't be hurt again for LOON_INVULNERABLE_MS (it
// blinks). HP carries over between levels; each reunion heals REUNION_HEAL.
export const LOON_MAX_HP = 50;
export const HIT_DAMAGE = 1;
export const REUNION_HEAL = 5;
export const LOON_INVULNERABLE_MS = 1000;
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

// Moonlit lake on the title screen (seen from above, like the cutscenes).
export const TITLE_COLORS = {
  title: '#ffd54f', // "LOON MAZE" (also "REUNITED!")
  waterTint: 0x7890c0, // Darkens the water texture to moonlight.
  glint: 0xdce9ff, // Moonlight glittering on the ripples.
  firefly: 0xd8ff7a,
};

// How fast the loon swims back and forth across the title screen (pixels/second).
export const TITLE_LOON_SPEED = 70;
