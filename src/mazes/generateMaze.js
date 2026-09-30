// Builds a random maze in the same character format as the hand-made mazes.
// Uses the "growing tree" method: carve from the start, knocking down walls
// to unvisited neighbors, and keep a list of cells that may still have some.
// Each step carries on from the newest cell (which makes long, winding
// corridors) or, with probability `branching`, from a random one on the list
// (which sprouts a fork there, so more forks and short dead ends). Every open
// tile is reachable. cols and rows should be odd so the maze has an even
// border all around. `random` (0 to 1, like Math.random) can be seeded to
// make the same maze every time.
export default function generateMaze(cols, rows, branching = 0, random = Math.random) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill('#'));
  const steps = [[2, 0], [-2, 0], [0, 2], [0, -2]];

  grid[1][1] = '.';
  const active = [{ x: 1, y: 1 }];

  while (active.length > 0) {
    const index = random() < branching ? Math.floor(random() * active.length) : active.length - 1;
    const { x, y } = active[index];
    const options = steps
      .map(([dx, dy]) => ({ x: x + dx, y: y + dy, dx, dy }))
      .filter((n) => n.x > 0 && n.x < cols - 1 && n.y > 0 && n.y < rows - 1 && grid[n.y][n.x] === '#');

    if (options.length === 0) {
      active.splice(index, 1);
      continue;
    }

    const next = options[Math.floor(random() * options.length)];
    grid[y + next.dy / 2][x + next.dx / 2] = '.';
    grid[next.y][next.x] = '.';
    active.push({ x: next.x, y: next.y });
  }

  // Put the baby on the tile with the longest swim from the start.
  const far = farthestTile(grid, 1, 1);
  grid[1][1] = 'P';
  grid[far.y][far.x] = 'B';

  return grid.map((row) => row.join(''));
}

function farthestTile(grid, startX, startY) {
  const seen = new Set([`${startX},${startY}`]);
  const queue = [{ x: startX, y: startY }];
  let last = queue[0];

  while (queue.length > 0) {
    last = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = last.x + dx;
      const y = last.y + dy;
      const key = `${x},${y}`;
      if (grid[y][x] !== '#' && !seen.has(key)) {
        seen.add(key);
        queue.push({ x, y });
      }
    }
  }

  return last;
}
