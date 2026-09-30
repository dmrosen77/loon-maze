// LAKES mode progress, saved in this browser's localStorage (so per device
// and browser, like the local high score table). If storage isn't available
// (private browsing, blocked site data) it's kept in memory for this visit.
import { LAKES, LEVELS_PER_LAKE, lakeLevel } from './lakes.js';
import { LAKE_UNLOCK_STARS } from './config.js';

const STORAGE_KEY = 'loon-maze-progress-v1';
let memory = null;

function empty() {
  return { levels: {}, lessonDone: false, last: null };
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

// Within an open lake, levels open one after another.
export function isLevelUnlocked(lake, number) {
  if (!isLakeUnlocked(lake)) return false;
  return number === 1 || (levelRecord(lake, number - 1)?.stars ?? 0) > 0;
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

// Where CONTINUE picks up: in the lake last played, the first open level not
// yet finished, or (if all are finished) the one last played.
export function continuePoint() {
  const last = loadProgress().last ?? { lake: 0, number: 1 };
  for (let number = 1; number <= LEVELS_PER_LAKE; number++) {
    if (isLevelUnlocked(last.lake, number) && !levelRecord(last.lake, number)) return { lake: last.lake, number };
  }
  return last;
}
