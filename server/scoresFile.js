// Reading and writing the scores file, shared by the server and the
// remove-score command.
import fs from 'node:fs';
import path from 'node:path';

const fileIn = (dataDir) => path.join(dataDir, 'scores.json');

export function loadScores(dataDir) {
  try {
    const saved = JSON.parse(fs.readFileSync(fileIn(dataDir), 'utf8'));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

// Replaces the old file in one step (write a temporary file, then rename),
// so it's never half-written.
export function saveScores(dataDir, scores) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = fileIn(dataDir);
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(scores, null, 2));
  fs.renameSync(temp, file);
}
