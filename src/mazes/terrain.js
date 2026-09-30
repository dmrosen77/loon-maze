import { ROCK_CHANCE, DAM_CHANCE, LOG_CHANCE, MAT_CHANCE } from '../config.js';

// Picks which of a maze's walls are special (rocks, beaver dams, floating
// logs) and which open tiles get lily pad mats. Every wall still blocks the
// surface, so the maze plays the same until diving; rocks can't be dived
// under, dams are slow to dive through, and logs are cheap on air. Dams and
// logs only go on thin walls between two corridors (where a dive is a
// short-cut), lying along the wall. The outer ring stays reeds, and the
// start and chick never get a mat. A hand-made layout's letters (see
// parseLayout) are used instead of random picks.
export default function assignTerrain(info, { layout = null } = {}) {
  const walls = new Map(); // "col,row" -> { kind, across }
  const mats = new Set();
  const key = (col, row) => `${col},${row}`;

  if (layout) {
    const kinds = { R: 'rock', D: 'dam', L: 'log' };
    layout.forEach((line, row) => {
      [...line].forEach((char, col) => {
        if (kinds[char]) {
          const across = info.isOpen(col, row - 1) || info.isOpen(col, row + 1) ? 'h' : 'v';
          walls.set(key(col, row), { kind: kinds[char], across });
        } else if (char === 'M') {
          mats.add(key(col, row));
        }
      });
    });
  } else {
    for (let row = 1; row < info.rows - 1; row++) {
      for (let col = 1; col < info.cols - 1; col++) {
        if (info.isOpen(col, row)) continue;
        const wall = (c, r) => !info.isOpen(c, r);
        const lyingAcross = wall(col - 1, row) && wall(col + 1, row) && !wall(col, row - 1) && !wall(col, row + 1);
        const standingUp = wall(col, row - 1) && wall(col, row + 1) && !wall(col - 1, row) && !wall(col + 1, row);
        const thin = lyingAcross || standingUp;
        const roll = Math.random();
        let kind = null;
        if (roll < ROCK_CHANCE) kind = 'rock';
        else if (thin && roll < ROCK_CHANCE + DAM_CHANCE) kind = 'dam';
        else if (thin && roll < ROCK_CHANCE + DAM_CHANCE + LOG_CHANCE) kind = 'log';
        if (kind) walls.set(key(col, row), { kind, across: lyingAcross ? 'h' : 'v' });
      }
    }
    for (const { col, row } of info.open) {
      const special = info.distanceFromStart(col, row) < 2 || (col === info.baby.col && row === info.baby.row);
      if (!special && Math.random() < MAT_CHANCE) mats.add(key(col, row));
    }
  }

  return {
    // 'reeds', 'rock', 'dam' or 'log' for a wall tile.
    wallKind: (col, row) => walls.get(key(col, row))?.kind ?? 'reeds',
    // Which way a log lies: 'h' or 'v'.
    logAcross: (col, row) => walls.get(key(col, row))?.across ?? 'h',
    isMat: (col, row) => mats.has(key(col, row)),
  };
}

// A hand-made layout with special-wall letters (R, D, L walls; M mats) as a
// plain maze: the walls become '#' and the mats open water.
export function plainMaze(layout) {
  return layout.map((line) => line.replace(/[RDL]/g, '#').replace(/M/g, '.'));
}
