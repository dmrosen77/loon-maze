// Everything about a level that depends on how it's being played: an ARCADE
// level (numbered, random maze, growing in stages), a LAKES level (a lake,
// day and time of day, the same seeded maze every time, a sawtooth of
// difficulty), or the dive lesson. GameScene builds the level from this.
import * as Phaser from 'phaser';
import {
  PROCEDURAL_MAZE,
  LEVEL_1_COLS,
  LEVEL_1_ROWS,
  GROWTH_PER_STAGE,
  MAX_COLS,
  MAX_ROWS,
  BRANCHING_START,
  BRANCHING_PER_STAGE,
  BRANCHING_MAX,
  LAKE_BRANCHING_PER_STEP,
  LAKE_LAST_STEP,
  LAKE_FEATURES,
  LAKE_MIN_CROW_SHARE,
  LAKE_MIN_DIVE_SHARE,
  LAKE_MAZE_TRIES,
  LEVEL_POINTS,
  DIVE_UNLOCK_LEVEL,
  DIVE_TIERS,
  FEATURE_LEVELS,
  TIME_OF_DAY,
  fishForLevel,
  mazeStage,
} from './config.js';
import generateMaze from './mazes/generateMaze.js';
import handMadeMaze from './mazes/maze1.js';
import diveLessonLayout from './mazes/diveLesson.js';
import { plainMaze } from './mazes/terrain.js';
import { isGoodDivingMaze } from './mazes/mazeQuality.js';
import { timeOfDayForLevel } from './game/Lighting.js';
import { lakeLevel } from './lakes.js';
import { isLessonDone } from './progress.js';

// The GameScene start for a LAKES level: `hp` carries over within a day
// (full HP if left out, as when starting from the map), `notice` is an extra
// callout (like a lake just unlocked), and the dive lesson comes first if the
// lake has diving and this device hasn't done the lesson yet.
export function lakeStart(lake, number, { hp, notice } = {}) {
  const level = { mode: 'lakes', lake, number, hp, notice };
  if (LAKE_FEATURES[lake].dives > 0 && !isLessonDone()) return { lesson: true, then: level };
  return level;
}

// data: { mode: 'arcade', level } | { mode: 'lakes', lake, number } | { lesson: true, ... }
export default function levelPlan(data = {}) {
  if (data.lesson) return lessonPlan();
  if (data.mode === 'lakes') {
    const plan = lakePlan(data.lake, data.number);
    if (data.notice) plan.callouts.unshift(data.notice);
    return plan;
  }
  return arcadePlan(data.level ?? 1);
}

function arcadePlan(level) {
  const stage = mazeStage(level);
  const growth = GROWTH_PER_STAGE * stage;
  const cols = Math.min(LEVEL_1_COLS + growth, MAX_COLS);
  const rows = Math.min(LEVEL_1_ROWS + growth, MAX_ROWS);
  const branching = Math.min(BRANCHING_START + BRANCHING_PER_STAGE * stage, BRANCHING_MAX);
  const canDive = level >= DIVE_UNLOCK_LEVEL;
  const tier = DIVE_TIERS.filter((t) => t.level <= level).at(-1) ?? DIVE_TIERS[0];
  const phase = timeOfDayForLevel(level);

  const callouts = [];
  if (canDive && tier !== DIVE_TIERS[0] && tier.level === level) callouts.push('EXTRA DIVE!');
  if (level > 1 && mazeStage(level) !== mazeStage(level - 1)) callouts.push('BIGGER LAKE!');
  if (level === FEATURE_LEVELS.fish) callouts.push('CATCH FISH FOR POINTS!');
  if (level === FEATURE_LEVELS.diveBubbles) callouts.push('BUBBLES GIVE EXTRA DIVES!');

  return {
    mode: 'arcade',
    lesson: false,
    level,
    maze: PROCEDURAL_MAZE ? generateMaze(cols, rows, branching) : handMadeMaze,
    layout: null,
    random: Math.random,
    phase,
    canDive,
    dives: canDive ? tier.dives : 0,
    bubbles: canDive && level >= FEATURE_LEVELS.diveBubbles,
    fishCount: fishForLevel(level),
    levelPoints: LEVEL_POINTS * level,
    label: `Level ${level}`,
    bannerTitle: `Level ${level}`,
    bannerSubtitle: phase.name,
    callouts,
  };
}

function lakePlan(lake, number) {
  const info = lakeLevel(lake, number);
  const { d } = info;
  const rows = Math.min(LEVEL_1_ROWS + 2 * d, MAX_ROWS);
  const colSteps = Math.round((d * (MAX_COLS - LEVEL_1_COLS)) / 2 / LAKE_LAST_STEP);
  const cols = Math.min(LEVEL_1_COLS + 2 * colSteps, MAX_COLS);
  const branching = Math.min(BRANCHING_START + LAKE_BRANCHING_PER_STEP * d, BRANCHING_MAX);
  const features = LAKE_FEATURES[lake];

  // The same seed every time, so the level is the same every time. On diving
  // lakes, a seed whose maze a dive would make trivial is swapped for the
  // next one. The rest of the level (terrain, fish, bubble) carries on from
  // the chosen seed's random numbers.
  let random;
  let maze;
  for (let attempt = 0; attempt < LAKE_MAZE_TRIES; attempt++) {
    const rng = new Phaser.Math.RandomDataGenerator([attempt === 0 ? info.seed : `${info.seed}-${attempt}`]);
    random = () => rng.frac();
    maze = generateMaze(cols, rows, branching, random);
    const quality = { minCrowShare: LAKE_MIN_CROW_SHARE, minDiveShare: LAKE_MIN_DIVE_SHARE[features.dives] };
    if (features.dives === 0 || isGoodDivingMaze(maze, features.dives, quality)) break;
  }

  const callouts = [];
  if (number === 1) callouts.push(`WELCOME TO ${info.name.toUpperCase()}!`);
  if (number === 1 && lake >= 2) callouts.push('EXTRA DIVE!');
  if (lake === 0 && number === 2) callouts.push('CATCH FISH FOR POINTS!');
  if (lake === 1 && number === 2) callouts.push('BUBBLES GIVE EXTRA DIVES!');

  return {
    mode: 'lakes',
    lesson: false,
    lake,
    number,
    key: info.key,
    level: number,
    maze,
    layout: null,
    random,
    phase: TIME_OF_DAY[info.time],
    canDive: features.dives > 0,
    dives: features.dives,
    bubbles: features.bubbles,
    fishCount: lake === 0 && number === 1 ? 0 : Math.min(3 + d, 14),
    levelPoints: LEVEL_POINTS * (d + 1),
    label: `${info.name}  ${info.dayLabel}`,
    bannerTitle: info.name,
    bannerSubtitle: info.dayLabel,
    callouts,
  };
}

function lessonPlan() {
  return {
    mode: 'lesson',
    lesson: true,
    level: 0,
    maze: plainMaze(diveLessonLayout),
    layout: diveLessonLayout,
    random: Math.random,
    phase: TIME_OF_DAY.find((phase) => phase.name === 'DAY'),
    canDive: true,
    dives: Infinity,
    bubbles: false,
    fishCount: 0,
    levelPoints: 0,
    label: 'Dive lesson',
    bannerTitle: 'DIVE LESSON',
    bannerSubtitle: '',
    callouts: [],
  };
}
