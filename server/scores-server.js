// Loon Maze world high score server.
//
// A tiny HTTP service with no dependencies (Node 20+). It keeps the top
// ARCADE scores in one JSON file and answers:
//   POST /api/runs     -> { run }                                    (a ticket for one ARCADE run)
//   GET  /api/scores   -> { scores: [{ name, score, level }, ...] }  (best first)
//   POST /api/scores   { name, score, level, run } -> { rank, scores }  (rank: 0 = top, -1 = didn't place)
//
// Every submission is checked, to keep the table honest:
// - initials must be 3 letters/digits and not on the blocklist;
// - the level must be realistic (up to MAX_LEVEL) and the score possible for
//   it (using the game's own scoring values from src/config.js);
// - it needs the ticket the game got when the run started: each ticket is
//   good for one score, and only once enough real time has passed to have
//   played that far (MIN_SECONDS_PER_LEVEL for each level finished);
// - each visitor can only ask for tickets and submit a few times per window.
// Tickets live in memory, so restarting the server voids runs in progress
// (their scores just stay on the player's device).
//
// Settings (environment variables):
//   PORT, HOST          where to listen (default 127.0.0.1:3010, behind nginx)
//   DATA_DIR            where scores.json lives (default ./data)
//   ALLOWED_ORIGINS     comma-separated sites allowed to call it from a browser
import http from 'node:http';
import crypto from 'node:crypto';
import { LEVEL_POINTS, SPEED_BONUS_MAX, HIGH_SCORE_COUNT, FISH_POINTS, fishForLevel } from '../src/config.js';
import { loadScores, saveScores } from './scoresFile.js';

const PORT = Number(process.env.PORT || 3010);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = process.env.DATA_DIR || './data';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Nobody has come close to this; the cap stops claims like "level 900".
const MAX_LEVEL = 99;
// No real run finishes a level (swim, reunion cutscene, next maze) faster.
const MIN_SECONDS_PER_LEVEL = 4;
// Tickets older than this are forgotten; the most kept at once.
const RUN_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_RUNS = 5000;
const MAX_BODY_BYTES = 1024;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const SUBMITS_PER_WINDOW = 6;
const RUNS_PER_WINDOW = 30;

// Three-letter combinations nobody should see on the table.
const BLOCKED_NAMES = new Set([
  'ASS', 'FUK', 'FUC', 'FCK', 'FKU', 'CUM', 'CUN', 'CNT', 'KNT', 'DIK', 'DIC', 'COK', 'COC', 'KOK',
  'TIT', 'FAG', 'FGT', 'NIG', 'NGR', 'NGA', 'JIZ', 'KKK', 'SEX', 'XXX', 'PIS', 'SHT', 'WTF',
  'HOE', 'SLT', 'VAG', 'PUS', 'PNS', 'NAZ', 'HTL', 'SUK',
]);

// The most a game carried off on `level` could have scored: every earlier
// level finished with the full speed bonus and every fish caught, plus every
// fish on the level it ended on.
function maxPossibleScore(level) {
  let total = fishForLevel(level) * FISH_POINTS;
  for (let finished = 1; finished < level; finished++) {
    total += LEVEL_POINTS * finished + SPEED_BONUS_MAX + fishForLevel(finished) * FISH_POINTS;
  }
  return total;
}

function validate(entry) {
  if (!entry || typeof entry !== 'object') return 'Expected a JSON object';
  const { name, score, level } = entry;
  if (typeof name !== 'string' || !/^[A-Z0-9]{3}$/.test(name)) return 'Name must be 3 letters or digits';
  if (BLOCKED_NAMES.has(name)) return 'Please pick different initials';
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return 'Invalid level';
  if (!Number.isInteger(score) || score <= 0) return 'Invalid score';
  if (score > maxPossibleScore(level)) return 'That score is not possible for that level';
  return null;
}

// ----- Scores: the whole table in memory, saved on each change.

let scores = loadScores(DATA_DIR);
const publicScores = () => scores.map(({ name, score, level }) => ({ name, score, level }));

function addScore(entry) {
  const record = { name: entry.name, score: entry.score, level: entry.level, at: new Date().toISOString() };
  scores = [...scores, record].sort((a, b) => b.score - a.score).slice(0, HIGH_SCORE_COUNT);
  saveScores(DATA_DIR, scores);
  return scores.indexOf(record);
}

// ----- Run tickets.

const runs = new Map(); // id -> start time (ms)

function startRun() {
  const now = Date.now();
  for (const [id, started] of runs) {
    if (now - started > RUN_TTL_MS || runs.size >= MAX_RUNS) runs.delete(id);
    else break; // Oldest first, so the rest are newer.
  }
  const id = crypto.randomBytes(16).toString('hex');
  runs.set(id, now);
  return id;
}

// Checks a run's ticket for a score on `level`, and uses it up if it's good.
function useRun(id, level) {
  if (typeof id !== 'string' || !runs.has(id)) return 'This run has no ticket (or it was already used)';
  const seconds = (Date.now() - runs.get(id)) / 1000;
  if (seconds < (level - 1) * MIN_SECONDS_PER_LEVEL) return 'That run was too fast to be real';
  runs.delete(id);
  return null;
}

// ----- Rate limiting, per visitor.

const recent = { runs: new Map(), scores: new Map() }; // kind -> ip -> [timestamps]

function clientIp(request) {
  // Behind Cloudflare, the real visitor's address is in CF-Connecting-IP
  // (Cloudflare sets it, so visitors can't fake it through the tunnel).
  // Anything else is counted by the connection itself. X-Forwarded-For isn't
  // used: a visitor can put anything in it.
  return request.headers['cf-connecting-ip'] || request.socket.remoteAddress;
}

function allow(kind, ip, limit) {
  const now = Date.now();
  const times = (recent[kind].get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (times.length >= limit) return false;
  times.push(now);
  recent[kind].set(ip, times);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const map of Object.values(recent)) {
    for (const [ip, times] of map) {
      if (times.every((time) => now - time >= RATE_WINDOW_MS)) map.delete(ip);
    }
  }
}, RATE_WINDOW_MS).unref();

// ----- HTTP.

function send(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  response.end(body === undefined ? '' : JSON.stringify(body));
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Body too large'));
        request.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const cors = corsHeaders(request);
  const { pathname } = new URL(request.url, 'http://localhost');
  if (request.method === 'OPTIONS') return send(response, 204, undefined, cors);

  if (pathname === '/api/runs') {
    if (request.method !== 'POST') return send(response, 405, { error: 'Method not allowed' }, cors);
    if (!allow('runs', clientIp(request), RUNS_PER_WINDOW)) {
      return send(response, 429, { error: 'Too many runs, try again later' }, cors);
    }
    return send(response, 200, { run: startRun() }, cors);
  }

  if (pathname !== '/api/scores') return send(response, 404, { error: 'Not found' }, cors);
  if (request.method === 'GET') return send(response, 200, { scores: publicScores() }, cors);
  if (request.method !== 'POST') return send(response, 405, { error: 'Method not allowed' }, cors);

  if (!allow('scores', clientIp(request), SUBMITS_PER_WINDOW)) {
    return send(response, 429, { error: 'Too many submissions, try again later' }, cors);
  }
  let entry;
  try {
    entry = await readJson(request);
  } catch (error) {
    return send(response, 400, { error: error.message }, cors);
  }
  const problem = validate(entry) ?? useRun(entry.run, entry.level);
  if (problem) return send(response, 400, { error: problem }, cors);

  const rank = addScore(entry);
  console.log(`New score: ${entry.name} ${entry.score} (level ${entry.level}) -> rank ${rank}`);
  return send(response, 200, { rank, scores: publicScores() }, cors);
});

server.listen(PORT, HOST, () => {
  console.log(`Loon Maze scores on http://${HOST}:${PORT}, data in ${DATA_DIR}, ${scores.length} scores loaded`);
});
