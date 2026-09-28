# Loon Maze

Top-down browser game: guide a loon through a lake maze of reeds to its baby. Each level is a larger, randomly generated maze.

Phaser 4 + Vite, plain JavaScript (ES modules, no TypeScript, no framework). Simple shapes only for now; no image or audio assets.

## Commands

- `npm run dev`: dev server at http://localhost:5173 (Vite picks 5174+ if the port is taken)
- `npm run build`: production build into `dist/`
- There are no tests or linter yet.

## Layout

- `index.html`: page shell; the game mounts into `#game`
- `src/main.js`: Phaser game config (fixed-size view, Arcade physics)
- `src/config.js`: every tuning value (sizes, speeds, level curve, volumes, colors). Put new tunables here, not inline.
- `src/scenes/GameScene.js`: the only scene. Builds the maze, handles movement, collisions, reunion, and level advance.
- `src/mazes/generateMaze.js`: recursive-backtracker generator; puts the baby on the tile farthest from the start
- `src/mazes/maze1.js`: hand-made maze, used when `PROCEDURAL_MAZE` is false
- `src/audio.js`: all sound, synthesized with the Web Audio API. One shared instance survives scene restarts.

## How things work

- Mazes are arrays of equal-length strings: `#` reeds, `.` water, `P` loon start, `B` baby. The generator and hand-made mazes share this format.
- Generated maze sizes must be odd (level 1 sizes odd, growth even).
- A new level is `this.scene.restart({ level })`, and `create(data)` rebuilds everything. Anything that must persist across levels (like audio) lives outside the scene.
- Mazes larger than the view scroll with a camera that follows the loon. Smaller mazes are centered.
- Import Phaser as `import * as Phaser from 'phaser'`.

## Gotchas

- The Arcade collider callback fires every frame while the loon pushes into reeds. Throttle anything triggered from it (see `bump()`).
- `body.deltaX()`/`deltaY()` are measured before collision separation, so they report movement even when the loon is blocked. To detect real movement, compare the game object's position with the previous frame's (see `paddle()`).
- Browsers block audio until the user interacts. `audio.js` starts on the first keydown or pointerdown.

## Testing in the browser pane

- When the pane is hidden, the game loop is throttled, so time-based events like the level advance only move forward while screenshots are being taken.
- Synthetic `KeyboardEvent`s dispatched on `window` drive movement. They don't count as user activation for audio, so click the canvas first.
- Random mazes can't be steered by script. To test reunion or levels, temporarily expose the game (`window.__game = new Phaser.Game(config)`), then use `scene.loon.body.reset(x, y)` or `scene.scene.restart({ level })`. Remove the hook before committing.

## Git

The repo is private at https://github.com/dmrosen77/loon-maze, and `main` is pushed to `origin`.
