// Removes entries from the world high score table: every entry with the
// given initials, or only the one with that score too. Prints the table
// before and after. Stop the server first (it keeps the table in memory and
// would write its own copy back); scripts/remove-score.sh does all of that.
//
//   DATA_DIR=/var/lib/loon-maze node server/remove-score.js NAME [SCORE]
//   DATA_DIR=... node server/remove-score.js --list
import { loadScores, saveScores } from './scoresFile.js';

const DATA_DIR = process.env.DATA_DIR || './data';
const [name, score] = process.argv.slice(2);
const show = (scores) =>
  scores.forEach((entry, i) => console.log(`${String(i + 1).padStart(2)}. ${entry.name} ${entry.score} (level ${entry.level}) ${entry.at ?? ''}`));

const scores = loadScores(DATA_DIR);
show(scores);
if (!name || name === '--list') process.exit(0);

const kept = scores.filter((entry) => !(entry.name === name.toUpperCase() && (score === undefined || entry.score === Number(score))));
if (kept.length === scores.length) {
  console.log(`\nNo entry for ${name.toUpperCase()}${score ? ` with ${score}` : ''}.`);
  process.exit(1);
}
saveScores(DATA_DIR, kept);
console.log(`\nRemoved ${scores.length - kept.length}. Now:`);
show(kept);
