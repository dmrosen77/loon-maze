// Builds a random maze in the same character format as the hand-made mazes.
// Uses a recursive backtracker: carve from the start, knocking down walls to
// unvisited neighbors, backing up at dead ends. Every open tile is reachable.
// cols and rows should be odd so the maze has an even border all around.
export default function generateMaze(cols, rows) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill('#'));
  const steps = [[2, 0], [-2, 0], [0, 2], [0, -2]];

  grid[1][1] = '.';
  const stack = [{ x: 1, y: 1 }];

  while (stack.length > 0) {
    const { x, y } = stack[stack.length - 1];
    const options = steps
      .map(([dx, dy]) => ({ x: x + dx, y: y + dy, dx, dy }))
      .filter((n) => n.x > 0 && n.x < cols - 1 && n.y > 0 && n.y < rows - 1 && grid[n.y][n.x] === '#');

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const next = options[Math.floor(Math.random() * options.length)];
    grid[y + next.dy / 2][x + next.dx / 2] = '.';
    grid[next.y][next.x] = '.';
    stack.push({ x: next.x, y: next.y });
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
