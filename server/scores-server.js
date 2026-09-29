// Loon Maze world high score server.
//
// A tiny HTTP service with no dependencies (Node 20+). It keeps the top
// scores in one JSON file and answers:
//   GET  /api/scores   -> { scores: [{ name, score, level }, ...] }  (best first)
//   POST /api/scores   { name, score, level } -> { rank, scores }    (rank: 0 = top, -1 = didn't place)
//
// Every submission is checked: initials must be 3 letters/digits and not on
// the blocklist, the score must be possible for the level reached (using the
// game's own scoring values from src/config.js), and each visitor can only
// submit a few times per window.
//
// Settings (environment variables):
//   PORT, HOST          where to listen (default 127.0.0.1:3010, behind nginx)
//   DATA_DIR            where scores.json lives (default ./data)
//   ALLOWED_ORIGINS     comma-separated sites allowed to call it from a browser
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { LEVEL_POINTS, SPEED_BONUS_MAX, HIGH_SCORE_COUNT, FISH_POINTS, fishForLevel } from '../src/config.js';

const PORT = Number(process.env.PORT || 3010);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = process.env.DATA_DIR || './data';
const FILE = path.join(DATA_DIR, 'scores.json');
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const MAX_LEVEL = 1000;
const MAX_BODY_BYTES = 1024;
const SUBMITS_PER_WINDOW = 6;
const RATE_WINDOW_MS = 10 * 60 * 1000;

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

// ----- Storage: the whole table in memory, saved atomically on each change.

function loadScores() {
  try {
    const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveScores(scores) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = `${FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(scores, null, 2));
  fs.renameSync(temp, FILE); // Replaces the old file in one step, so it's never half-written.
}

let scores = loadScores();
const publicScores = () => scores.map(({ name, score, level }) => ({ name, score, level }));

function addScore(entry) {
  const record = { name: entry.name, score: entry.score, level: entry.level, at: new Date().toISOString() };
  scores = [...scores, record].sort((a, b) => b.score - a.score).slice(0, HIGH_SCORE_COUNT);
  saveScores(scores);
  return scores.indexOf(record);
}

// ----- Rate limiting, per visitor.

const recentSubmits = new Map(); // ip -> [timestamps]

function clientIp(request) {
  // Behind Cloudflare and nginx, the real visitor's address is in these headers.
  return (
    request.headers['cf-connecting-ip'] ||
    String(request.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    request.socket.remoteAddress
  );
}

function allowSubmit(ip) {
  const now = Date.now();
  const recent = (recentSubmits.get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= SUBMITS_PER_WINDOW) return false;
  recent.push(now);
  recentSubmits.set(ip, recent);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of recentSubmits) {
    if (times.every((time) => now - time >= RATE_WINDOW_MS)) recentSubmits.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

// ----- HTTP.

function send(response, status, body, extraHeaders = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders });
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
  if (pathname !== '/api/scores') return send(response, 404, { error: 'Not found' }, cors);

  if (request.method === 'OPTIONS') return send(response, 204, undefined, cors);
  if (request.method === 'GET') return send(response, 200, { scores: publicScores() }, cors);
  if (request.method !== 'POST') return send(response, 405, { error: 'Method not allowed' }, cors);

  if (!allowSubmit(clientIp(request))) {
    return send(response, 429, { error: 'Too many submissions, try again later' }, cors);
  }
  let entry;
  try {
    entry = await readJson(request);
  } catch (error) {
    return send(response, 400, { error: error.message }, cors);
  }
  const problem = validate(entry);
  if (problem) return send(response, 400, { error: problem }, cors);

  const rank = addScore(entry);
  console.log(`New score: ${entry.name} ${entry.score} (level ${entry.level}) -> rank ${rank}`);
  return send(response, 200, { rank, scores: publicScores() }, cors);
});

server.listen(PORT, HOST, () => {
  console.log(`Loon Maze scores on http://${HOST}:${PORT}, data in ${path.resolve(FILE)}, ${scores.length} scores loaded`);
});
