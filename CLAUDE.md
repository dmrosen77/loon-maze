# Loon Maze

Top-down browser game: guide a loon through a lake maze of reeds to its baby. Each level is a larger, randomly generated maze.

Phaser 4 + Vite, plain JavaScript (ES modules, no TypeScript, no framework). Most art is pixel grids in code; the big cutscene sprites are PNGs in `src/assets/`. All audio is synthesized, with no audio files.

## Commands

- `npm run dev`: dev server at http://localhost:5173 (Vite picks 5174+ if the port is taken)
- `npm run build`: production build into `dist/`
- There are no tests or linter yet.

## Layout

- `index.html`: page shell; the game mounts into `#game`
- `src/main.js`: Phaser game config (fixed-size view, Arcade physics)
- `src/config.js`: every tuning value (sizes, speeds, level curve, volumes, colors). Put new tunables here, not inline.
- `src/scenes/TitleScene.js`: title screen, a top-down moonlit lake in the cutscene art style. The big loon swims back and forth with the chick on its back, reed clumps sway in the corners, lily pads bob, and moonlight glints and fireflies are drawn in code. Title music plays, and Enter starts level 1.
- `src/scenes/GameScene.js`: gameplay. Builds the maze and handles movement, collisions and HP. Reaching the baby fades to the reunion cutscene. Each new touch of the reeds costs `HIT_DAMAGE` (see `bump()`/`takeDamage()`), followed by `LOON_INVULNERABLE_MS` of blinking. At 0 HP it fades to the game-over cutscene. HP carries between levels: scenes pass `{ level, hp }`, and the reunion heals `REUNION_HEAL`.
- `src/scenes/ReunionScene.js`: the between-levels cutscene. The big parent glides in, the chick hops onto its back, hearts float up and "REUNITED!" appears, then it starts the next level (after `REUNION_MS`, or on Enter).
- `src/scenes/GameOverScene.js`: the game-over cutscene. A bald eagle dives in (wings swept back), grabs the loon and flaps off with it, then GAME OVER. Enter returns to the title. The eagle's wingbeat alternates two frames cut from one generated image.
- `src/assets/*.png`: big sprites for the title and cutscenes (loon, chick, eagle frames, reed clump, lily pads), made from `art-source/` images by `tools/pixelize.py` (needs Pillow). It removes the magenta background and purple fringe, shrinks the image to its native pixel grid, and can erase regions and rotate. The exact commands for each asset are in the script's docstring. Re-run them if a source image changes. Sprites converted with the same `--cell` share a pixel size on screen. The chick is drawn one scale step smaller than its parent so it's about a third of the parent's length. `HEART` is a grid in `pixelArt.js`.
- `src/art/pixelArt.js`: pixel art as character grids (same idea as mazes) plus `makePixelTexture()` to turn a grid into a texture. It holds the small top-down loon (two paddling frames) and chick for gameplay. Top-down art faces right, and the game rotates it. Reed wall tiles and the water tile are generated from fixed seeds (`reedTexture`, `makeWaterTexture`) rather than hand-drawn, and the water is a drifting TileSprite. Each reed texture is keyed by variant, the sides that face water (those edges fray and get semi-transparent overhang), and a sway frame. `GameScene.swayReeds()` swaps frames in a traveling wind wave. Reed images are 48px with 40px static bodies.
- `art-source/`: reference images the pixel art is based on, such as AI-generated concepts on a magenta background. They aren't loaded by the game. At small in-game sprite size, downscaling gave muddy results, so those grids are redrawn by hand using them as reference. Large cutscene sprites convert well with `tools/pixelize.py`.
- `src/mazes/generateMaze.js`: recursive-backtracker generator; puts the baby on the tile farthest from the start
- `src/mazes/maze1.js`: hand-made maze, used when `PROCEDURAL_MAZE` is false
- `src/ui/HpBar.js`: the HP bar used in gameplay and the reunion. Losses snap down and the lost chunk drains after a moment. Gains grow back smoothly. It turns amber at 40% and red and pulsing at 20%. Fills use `scaleX`, not `width`, because Phaser rectangles don't reliably redraw when `width` changes.
- `src/audio.js`: all sound, synthesized with the Web Audio API. One shared instance survives scene changes. Scenes call `playMusic('title' | 'lake')`, which crossfades and is a no-op if that music is already playing. `stopMusic()` fades to silence, which the game-over cutscene uses.

## How things work

- Mazes are arrays of equal-length strings: `#` reeds, `.` water, `P` loon start, `B` baby. The generator and hand-made mazes share this format.
- Generated maze sizes must be odd (level 1 sizes odd, growth even).
- A new level is `this.scene.restart({ level })`, and `create(data)` rebuilds everything. Anything that must persist across levels (like audio) lives outside the scene.
- The loon's collision box is a square (`LOON_BODY_SIZE`) that is smaller than its sprite, because Arcade bodies don't rotate with the sprite. Its head pokes into the reeds a little by design.
- Layering in GameScene comes from creation order: water, wake particles, reeds, chick, loon, then text (depth 10). The wake sits under the reeds so droplets don't show on top of them.
- Wake particles are emitted manually with `emitParticleAt()` at points computed from the loon's rotation (`pointBehindLoon()`). The emitter itself stays at 0,0.
- Mazes larger than the view scroll with a camera that follows the loon. Smaller mazes are centered.
- Import Phaser as `import * as Phaser from 'phaser'`.

## Gotchas

- The Arcade collider callback fires every frame while the loon pushes into reeds. Throttle anything triggered from it (see `bump()`).
- `body.deltaX()`/`deltaY()` are measured before collision separation, so they report movement even when the loon is blocked. To detect real movement, compare the game object's position with the previous frame's (see `paddle()`).
- All text uses the Press Start 2P arcade font (`FONT_FAMILY` in config), bundled from `@fontsource/press-start-2p`. Phaser renders text with whatever font is loaded at that moment, so `main.js` waits for `document.fonts.load()` before creating the game. Keep that if the startup code changes.
- Browsers block audio until the user interacts. `audio.js` starts on the first keydown or pointerdown, then plays whatever music was last requested. The title screen shows "PRESS ANY KEY" until then, so that press doesn't also start the game.

## Testing in the browser pane

- When the pane is hidden, the game loop is throttled, so time-based events like the level advance only move forward while screenshots are being taken.
- Synthetic `KeyboardEvent`s dispatched on `window` drive movement. They don't count as user activation for audio, so click the canvas first.
- Random mazes can't be steered by script. To test reunion or levels, temporarily expose the game (`window.__game = new Phaser.Game(config)`), then use `scene.loon.body.reset(x, y)` or `scene.scene.restart({ level })`. Remove the hook before committing.
- Cutscenes can finish between screenshots. Slow one down with `scene.time.timeScale`, `scene.tweens.timeScale` and `scene.anims.globalTimeScale` (for example 0.3).
- The zoom screenshot action doesn't work in the pane. To inspect sprites up close, zoom the game camera instead: `camera.stopFollow()`, `camera.useBounds = false`, `camera.setZoom(5)`, then `camera.setScroll(...)`.
- Starting a scene from a script doesn't run `create()` right away, and it takes longer while the pane is hidden, so wait before touching the new scene's objects.

## Git

The repo is private at https://github.com/dmrosen77/loon-maze, and `main` is pushed to `origin`.
