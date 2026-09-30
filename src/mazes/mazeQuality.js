import mazeInfo from './mazeInfo.js';

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// The shortest route (in tiles) from the loon's start to the chick using up
// to `dives` dives, each passing under one wall tile in a straight line (what
// a one-breath dive does). Rocks aren't known yet at this point, so this is
// the most a player could cut.
export function diveRouteLength(maze, dives) {
  const isOpen = (col, row) => maze[row]?.[col] !== undefined && maze[row][col] !== '#';
  const { start, baby } = mazeInfo(maze);
  const best = new Map();
  const key = (col, row, used) => `${col},${row},${used}`;
  const queue = [{ col: start.col, row: start.row, used: 0, steps: 0 }];
  best.set(key(start.col, start.row, 0), 0);
  while (queue.length > 0) {
    queue.sort((a, b) => a.steps - b.steps);
    const here = queue.shift();
    if (here.col === baby.col && here.row === baby.row) return here.steps;
    for (const [dc, dr] of STEPS) {
      let next = null;
      if (isOpen(here.col + dc, here.row + dr)) {
        next = { col: here.col + dc, row: here.row + dr, used: here.used, steps: here.steps + 1 };
      } else if (here.used < dives && isOpen(here.col + 2 * dc, here.row + 2 * dr)) {
        next = { col: here.col + 2 * dc, row: here.row + 2 * dr, used: here.used + 1, steps: here.steps + 2 };
      }
      if (!next) continue;
      const k = key(next.col, next.row, next.used);
      if (!best.has(k) || best.get(k) > next.steps) {
        best.set(k, next.steps);
        queue.push(next);
      }
    }
  }
  return Infinity;
}

// Whether a diving level's maze is worth playing: the chick is a fair way
// across the lake from the start (at least `minCrowShare` of the maze's
// width plus height, as the crow flies along the grid), and the level's
// dives can't cut the swimming route to less than `minDiveShare` of it.
export function isGoodDivingMaze(maze, dives, { minCrowShare, minDiveShare }) {
  const info = mazeInfo(maze);
  const crow = Math.abs(info.baby.col - info.start.col) + Math.abs(info.baby.row - info.start.row);
  if (crow < Math.round(minCrowShare * (info.cols + info.rows - 4))) return false;
  return diveRouteLength(maze, dives) >= minDiveShare * info.pathLength;
}
