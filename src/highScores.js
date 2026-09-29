// High score tables. There are two:
// - The local table, saved in this browser's localStorage. It stays on this
//   computer and browser only. If storage isn't available (private browsing,
//   blocked site data), it just lasts until the page closes.
// - The world table, kept by the score server (server/scores-server.js) on the
//   same site as the game, at api/scores. Where there's no server (local
//   development, other hosts, offline), the world functions return null and
//   the game uses the local table instead.
import { HIGH_SCORE_COUNT } from './config.js';

const STORAGE_KEY = 'loon-maze-high-scores';
// Relative, so it follows the game to whatever folder it's served from.
const WORLD_URL = 'api/scores';
const WORLD_TIMEOUT_MS = 4000;
let fallback = [];

// Whether `score` would make a table (best first, of { name, score, level }).
export function qualifies(scores, score) {
  if (score <= 0) return false;
  return scores.length < HIGH_SCORE_COUNT || score > scores[scores.length - 1].score;
}

// ----- Local table

export function loadHighScores() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {
    // Unreadable or unavailable storage: use the in-memory table.
  }
  return fallback;
}

export function isHighScore(score) {
  return qualifies(loadHighScores(), score);
}

// Adds an entry and returns its position in the table (0 = top, -1 = didn't place).
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

// ----- World table

// Resolves to parsed JSON, or null if the server isn't there or doesn't
// answer in time. (Without a server, a static host returns the game's page
// or a 404 instead of JSON, which also comes back as null.)
async function worldRequest(options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WORLD_TIMEOUT_MS);
  try {
    const response = await fetch(WORLD_URL, { ...options, signal: controller.signal });
    if (!response.headers.get('content-type')?.includes('application/json')) return null;
    const body = await response.json();
    return response.ok ? body : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// The world top scores, or null if unavailable.
export async function fetchWorldScores() {
  const body = await worldRequest();
  return Array.isArray(body?.scores) ? body.scores : null;
}

// Submits an entry. Resolves to { rank, scores } or null if it couldn't be saved.
export async function submitWorldScore(entry) {
  const body = await worldRequest({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  return Array.isArray(body?.scores) ? { rank: body.rank, scores: body.scores } : null;
}
