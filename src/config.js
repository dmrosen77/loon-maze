// Tuning values. Tweak freely.
export const TILE_SIZE = 40;

// Size of the game window in pixels. Mazes bigger than this scroll with the loon.
// On touch screens the width grows to match the (sideways) screen's shape, up
// to MAX_VIEW_WIDTH, so phones don't get black bars; the height stays the same.
export const VIEW_WIDTH = 840;
export const VIEW_HEIGHT = 600;
export const MAX_VIEW_WIDTH = 1400;

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

// Scoring. Finishing level N earns LEVEL_POINTS * N, plus a speed bonus that
// starts at SPEED_BONUS_MAX and drops by SPEED_BONUS_LOSS for each second taken.
export const LEVEL_POINTS = 1000;
export const SPEED_BONUS_MAX = 1000;
export const SPEED_BONUS_LOSS = 10;
// How many scores the high score table keeps (saved in the browser).
export const HIGH_SCORE_COUNT = 10;
// Attract mode: after the title sits this long with no key pressed, it shows
// the high scores for ATTRACT_HIGH_SCORES_MS, then comes back.
export const TITLE_IDLE_MS = 20000;
export const ATTRACT_HIGH_SCORES_MS = 12000;

// Top swimming speed, in pixels per second.
export const LOON_SPEED = 180;
// Swimming physics, in pixels per second per second. Paddling speeds the loon
// up (or turns it) at LOON_ACCELERATION; with no keys pressed it glides and
// slows at LOON_GLIDE_DRAG, then floats with the lake current (WATER_DRIFT
// times LOON_FLOAT_DRIFT).
export const LOON_ACCELERATION = 520;
export const LOON_GLIDE_DRAG = 260;
export const LOON_FLOAT_DRIFT = 1.5;
// How much speed the loon keeps when it bounces off the reeds (0 to 1).
export const LOON_BOUNCE = 0.35;
// Hitting the reeds slower than this (pixels per second) is a harmless nudge:
// no HP lost and no thud. Set to 0 to make every touch count.
export const LOON_HIT_MIN_SPEED = 90;
// Corner assist: when swimming straight toward an opening the loon is a little
// off-center from, steer it sideways into the opening instead of letting it
// catch on the corner. It helps from up to CORNER_ASSIST_RANGE pixels off the
// opening's center, sliding sideways at up to CORNER_ASSIST_SPEED. Set the
// range to 0 to turn it off.
export const CORNER_ASSIST_RANGE = 26;
export const CORNER_ASSIST_SPEED = 240;
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
export const LOON_INVULNERABLE_MS = 1500;
// Square collision box, so walls behave the same whichever way the loon faces.
// The sprite is a bit longer than this, so its head can poke into the reeds.
// Smaller leaves more room in the 40px corridors.
export const LOON_BODY_SIZE = 20;

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
