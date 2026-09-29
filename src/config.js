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
// Corner assist: when swimming straight toward an opening the loon is too far
// off-center to fit through, ease it sideways just enough to fit instead of
// letting it catch on the corner. It helps from up to CORNER_ASSIST_RANGE
// pixels off the opening's center, sliding sideways at up to
// CORNER_ASSIST_SPEED. Set the range to 0 to turn it off.
export const CORNER_ASSIST_RANGE = 26;
export const CORNER_ASSIST_SPEED = 110;
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

// Diving. From DIVE_UNLOCK_LEVEL on, holding Space (or the DIVE button on
// touch screens) takes the loon underwater, where it swims under the reeds at
// DIVE_SPEED_FACTOR of its normal speed. Each level allows a few dives (see
// DIVE_TIERS), and each dive is one breath of AIR_PER_DIVE_MS. (A dive from one
// corridor, under a wall, into the next takes about 0.6 seconds.) Back on the
// surface the breath refills at AIR_REFILL times the drain speed, and the next
// dive needs a full breath. Running out under the reeds pops the loon back up
// where it dove, costing AIR_OUT_DAMAGE HP.
// Before the unlock level there's a short dive lesson (src/mazes/diveLesson.js)
// with unlimited dives, where running out is free.
export const DIVE_UNLOCK_LEVEL = 6;
export const DIVE_SPEED_FACTOR = 0.75;
// Dives allowed per level, growing as the loon gets further: from each
// `level` on, `dives` per level. A level where it grows says so.
export const DIVE_TIERS = [
  { level: 6, dives: 1 },
  { level: 11, dives: 2 },
  { level: 16, dives: 3 },
  { level: 21, dives: 4 },
];
export const AIR_PER_DIVE_MS = 1000;
export const AIR_REFILL = 3;
export const AIR_OUT_DAMAGE = 3;
// Underwater the loon shows as a dark shadow: this tint, at this opacity.
export const DIVE_SHADOW_TINT = 0x04101a;
export const DIVE_SHADOW_ALPHA = 0.8;
// A bubble rises from the diving loon every DIVE_BUBBLE_MS.
export const DIVE_BUBBLE_MS = 140;

// Screen pixels per art pixel for the in-game sprites (see src/art/pixelArt.js).
export const SPRITE_PIXEL_SIZE = 2;

// Gusts of wind sweeping across the reeds: how fast they pass (radians per
// second) and how far apart they are (pixels).
export const REED_SWAY_SPEED = 1.8;
export const REED_GUST_SPACING = 360;

// The level each feature first appears on. That level announces it under the
// level banner. (Diving has its own DIVE_UNLOCK_LEVEL, above.)
export const FEATURE_LEVELS = {
  fish: 2,
  diveBubbles: 7,
};

// Fish dart around the open water: swim into one for FISH_POINTS. Some
// (GOLDEN_FISH_CHANCE) are golden and heal GOLDEN_FISH_HEAL HP instead. They
// wander at FISH_SPEED and flee at FISH_FLEE_SPEED (slower than the loon)
// when it comes within FISH_FLEE_DISTANCE pixels.
export const FISH_POINTS = 50;
export const GOLDEN_FISH_CHANCE = 0.15;
export const GOLDEN_FISH_HEAL = 3;
export const FISH_SPEED = 40;
export const FISH_FLEE_SPEED = 120;
export const FISH_FLEE_DISTANCE = 80;
// How many fish a level has. The score server uses this too, to know the most
// points a game could have scored, so keep it a plain function of the level.
export function fishForLevel(level) {
  return level < FEATURE_LEVELS.fish ? 0 : Math.min(2 + level, 16);
}

// On diving levels from FEATURE_LEVELS.diveBubbles, DIVE_BUBBLE_CHANCE of
// levels hide a big air bubble in a dead end off the main path. Grabbing it
// gives an extra dive for that level.
export const DIVE_BUBBLE_CHANCE = 0.6;

// Stars on the reunion screen: one for finishing, two for beating par time,
// three for beating par without a hit. Par is PAR_SECONDS_BASE plus
// PAR_SECONDS_PER_TILE for each tile on the path from the start to the chick.
export const PAR_SECONDS_BASE = 4;
export const PAR_SECONDS_PER_TILE = 0.45;

// Time of day: levels cycle through these in order (level 1 is the first).
// `tint` colors the whole lake (multiplied over it, so white changes nothing,
// and it can only darken); `glow` then adds light of that color on top.
// Multiplying can't turn blue water warm, so `water` can recolor it instead:
// base, ripple troughs, crests and glints (see WATER_PALETTE in pixelArt.js).
// `night` adds moonlight glints on the water and fireflies over the reeds.
export const TIME_OF_DAY = [
  { name: 'DAWN', tint: 0xf2e2f2, glow: 0x2a1426 },
  { name: 'DAY', tint: 0xffffff },
  {
    name: 'SUNSET',
    tint: 0xffcfa8,
    water: { b: '#51497a', d: '#433d6a', l: '#a7677a', w: '#ffc27a' },
  },
  { name: 'NIGHT', tint: 0x6c82bc, night: true },
];

// Lake life in the maze's open water (src/game/Decor.js). Off the main path
// to the chick, LILY_PAD_CHANCE of the open tiles get a lily pad, and
// FROG_CHANCE of those a frog, which hops off into the water when the loon
// comes within FROG_SCARE_DISTANCE pixels. DRAGONFLIES dart around the view.
export const LILY_PAD_CHANCE = 0.14;
export const FROG_CHANCE = 0.35;
export const FROG_SCARE_DISTANCE = 70;
export const DRAGONFLIES = 3;

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
