import { TILE_SIZE } from '../config.js';

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Facts about a maze (an array of strings, see maze1.js) that the lake's
// extras need for placing things: which tiles are open water, how far each
// is from the loon's start, the path to the chick, and the dead ends.
// Worked out once per level.
export default function mazeInfo(maze) {
  const rows = maze.length;
  const cols = maze[0].length;
  const isOpen = (col, row) => maze[row]?.[col] !== undefined && maze[row][col] !== '#';
  const key = (col, row) => `${col},${row}`;

  const open = [];
  let start;
  let baby;
  maze.forEach((line, row) => {
    [...line].forEach((cell, col) => {
      if (cell === '#') return;
      open.push({ col, row });
      if (cell === 'P') start = { col, row };
      if (cell === 'B') baby = { col, row };
    });
  });

  // Breadth-first from the start: steps to every open tile, and where each
  // was reached from, for tracing the path to the chick.
  const distance = new Map([[key(start.col, start.row), 0]]);
  const cameFrom = new Map();
  const queue = [start];
  while (queue.length > 0) {
    const tile = queue.shift();
    for (const [dc, dr] of STEPS) {
      const next = { col: tile.col + dc, row: tile.row + dr };
      const nextKey = key(next.col, next.row);
      if (!isOpen(next.col, next.row) || distance.has(nextKey)) continue;
      distance.set(nextKey, distance.get(key(tile.col, tile.row)) + 1);
      cameFrom.set(nextKey, tile);
      queue.push(next);
    }
  }

  const path = new Set();
  for (let tile = baby; tile; tile = cameFrom.get(key(tile.col, tile.row))) path.add(key(tile.col, tile.row));

  const openNeighbors = (col, row) => STEPS.filter(([dc, dr]) => isOpen(col + dc, row + dr)).length;
  const deadEnds = open.filter(({ col, row }) => openNeighbors(col, row) === 1);

  return {
    rows,
    cols,
    open,
    start,
    baby,
    deadEnds,
    isOpen,
    onPath: (col, row) => path.has(key(col, row)),
    distanceFromStart: (col, row) => distance.get(key(col, row)) ?? Infinity,
    pathLength: path.size - 1,
  };
}

// The world position of a tile's center.
export function tileCenter({ col, row }) {
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
}

// The tile a world position is in.
export function tileAt(x, y) {
  return { col: Math.floor(x / TILE_SIZE), row: Math.floor(y / TILE_SIZE) };
}
