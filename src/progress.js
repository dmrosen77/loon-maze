// LAKES mode progress, saved in this browser's localStorage (so per device
// and browser, like the local high score table). If storage isn't available
// (private browsing, blocked site data) it's kept in memory for this visit.
import { LAKES, LEVELS_PER_LAKE, DAYS_PER_LAKE, TIMES_PER_DAY, lakeLevel } from './lakes.js';
import { LAKE_UNLOCK_STARS } from './config.js';

const STORAGE_KEY = 'loon-maze-progress-v1';
let memory = null;

function empty() {
  // `days`: for each lake (by name), the days survived from Dawn to Night in one run.
  return { levels: {}, days: {}, lessonDone: false, last: null };
}

export function loadProgress() {
  if (memory) return memory;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    memory = saved && typeof saved === 'object' ? { ...empty(), ...saved } : empty();
  } catch {
    memory = empty();
  }
  return memory;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Kept in memory only.
  }
}

// The saved best for a level ({ stars, score }), or null if never finished.
export function levelRecord(lake, number) {
  return loadProgress().levels[lakeLevel(lake, number).key] ?? null;
}

// Keeps the best stars and best score (separately). Returns which improved.
export function recordLevel(lake, number, { stars, score }) {
  const progress = loadProgress();
  const { key } = lakeLevel(lake, number);
  const old = progress.levels[key] ?? { stars: 0, score: 0 };
  const result = { newBestStars: stars > old.stars, newBestScore: score > old.score };
  progress.levels[key] = { stars: Math.max(stars, old.stars), score: Math.max(score, old.score) };
  save();
  return result;
}

export function lakeStars(lake) {
  let total = 0;
  for (let number = 1; number <= LEVELS_PER_LAKE; number++) total += levelRecord(lake, number)?.stars ?? 0;
  return total;
}

export function totalStars() {
  return LAKES.reduce((sum, _, lake) => sum + lakeStars(lake), 0);
}

// The first lake is always open; each next one needs LAKE_UNLOCK_STARS from the one before.
export function isLakeUnlocked(lake) {
  return lake === 0 || lakeStars(lake - 1) >= LAKE_UNLOCK_STARS;
}

// Days: each is one run from Dawn to Night with HP carrying over. Surviving
// a day opens the next one. A day counts as survived once it's been played
// through in one run (or, for progress saved before days were tracked, once
// its Night level has been beaten).
const nightOf = (day) => (day + 1) * TIMES_PER_DAY;

export function isDayCleared(lake, day) {
  const cleared = loadProgress().days?.[LAKES[lake].name.toLowerCase()] ?? [];
  return cleared.includes(day) || levelRecord(lake, nightOf(day)) !== null;
}

export function markDayCleared(lake, day) {
  const progress = loadProgress();
  const key = LAKES[lake].name.toLowerCase();
  progress.days = progress.days ?? {};
  progress.days[key] = [...new Set([...(progress.days[key] ?? []), day])];
  save();
}

// A day is open if it's the lake's first or the one before it was survived.
export function isDayOpen(lake, day) {
  return isLakeUnlocked(lake) && (day === 0 || isDayCleared(lake, day - 1));
}

// Which levels can be picked on the map: every level of a survived day (for
// replays), but only Dawn of an open day that hasn't been survived yet (the
// rest are reached by playing on through the day).
export function isLevelUnlocked(lake, number) {
  const day = Math.floor((number - 1) / TIMES_PER_DAY);
  if (!isDayOpen(lake, day)) return false;
  return isDayCleared(lake, day) || (number - 1) % TIMES_PER_DAY === 0;
}

// Where to start again after dying or quitting mid-day: that day's Dawn,
// unless the day has already been survived (then the same level).
export function restartPoint(lake, number) {
  const day = Math.floor((number - 1) / TIMES_PER_DAY);
  return isDayCleared(lake, day) ? number : day * TIMES_PER_DAY + 1;
}

export function isLessonDone() {
  return loadProgress().lessonDone;
}

export function markLessonDone() {
  loadProgress().lessonDone = true;
  save();
}

export function setLastPlayed(lake, number) {
  loadProgress().last = { lake, number };
  save();
}

// Whether LAKES has ever been played on this device (for the CONTINUE option).
export function hasPlayedLakes() {
  return loadProgress().last !== null;
}

// Where CONTINUE picks up: in the lake last played, the Dawn of the first day
// not yet survived, or (if all are) the level last played.
export function continuePoint() {
  const last = loadProgress().last ?? { lake: 0, number: 1 };
  for (let day = 0; day < DAYS_PER_LAKE; day++) {
    if (!isDayCleared(last.lake, day)) return { lake: last.lake, number: day * TIMES_PER_DAY + 1 };
  }
  return last;
}
