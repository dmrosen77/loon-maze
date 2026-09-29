// The high score table, saved in this browser's localStorage. Scores stay on
// this computer and browser only. If storage isn't available (private
// browsing, blocked site data), the table just lasts until the page closes.
import { HIGH_SCORE_COUNT } from './config.js';

const STORAGE_KEY = 'loon-maze-high-scores';
let fallback = [];

// Best first. Each entry is { name: 'ABC', score, level }.
export function loadHighScores() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {
    // Unreadable or unavailable storage: use the in-memory table.
  }
  return fallback;
}

// Whether a score would make the table.
export function isHighScore(score) {
  if (score <= 0) return false;
  const scores = loadHighScores();
  return scores.length < HIGH_SCORE_COUNT || score > scores[scores.length - 1].score;
}

// Adds an entry and returns its position in the table (0 = top).
export function addHighScore(entry) {
  const scores = [...loadHighScores(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, HIGH_SCORE_COUNT);
  fallback = scores;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // Storage unavailable: the in-memory table still works this session.
  }
  return scores.indexOf(entry);
}
