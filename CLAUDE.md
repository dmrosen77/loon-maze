# Loon Maze

Top-down browser game: guide a loon through a lake maze of reeds to its baby. Each level is a larger, randomly generated maze.

Phaser 4 + Vite, plain JavaScript (ES modules, no TypeScript, no framework). Most art is pixel grids in code; the big cutscene sprites are PNGs in `src/assets/`. All audio is synthesized, with no audio files.

## Commands

- `npm run dev`: dev server at http://localhost:5173 (Vite picks 5174+ if the port is taken)
- `npm run dev:phone`: same, but also reachable from a phone on the same Wi-Fi (it prints a Network address)
- `npm run build`: production build into `dist/`
- `npm run scores-server`: the world high score server on 127.0.0.1:3010 (data in `./data`). The dev server passes `/api` to it; without it the game uses this device's table. Restart Vite after changing `vite.config.js`.
- `npm run deploy`: builds and deploys the game and score server to the user's Proxmox container (see `scripts/deploy.sh`; needs the `proxmox` SSH alias).
- There are no tests or linter yet.

## Layout

- `index.html`: page shell; the game mounts into `#game`
- `src/main.js`: Phaser game config (Arcade physics, scaled to fit). The view is 840×600 on desktop. On touch screens the width grows to the screen's sideways shape (up to `MAX_VIEW_WIDTH`), measured once at startup. So never assume 840: lay screens out from `this.scale.width`, for example centered, or as fractions of the width like the title's lily pads.
- `src/config.js`: every tuning value (sizes, speeds, level curve, volumes, colors). Put new tunables here, not inline.
- `src/scenes/TitleScene.js`: title screen, a top-down moonlit lake in the cutscene art style. The big loon swims back and forth with the chick on its back, reed clumps sway in the corners, lily pads bob, and moonlight glints and fireflies are drawn in code. Title music plays, and Enter starts level 1. Attract mode: after `TITLE_IDLE_MS` with no key pressed, it shows the high scores (`HighScoreScene` with `{ attract: true }`), which return here after `ATTRACT_HIGH_SCORES_MS` or on any key.
- `src/scenes/GameScene.js`: gameplay. Builds the maze and handles movement, collisions and HP. Reaching the baby fades to the reunion cutscene. Each new touch of the reeds costs `HIT_DAMAGE` (see `bump()`/`takeDamage()`), followed by `LOON_INVULNERABLE_MS` of blinking. At 0 HP it fades to the game-over cutscene. HP and score carry between levels: scenes pass `{ level, hp, score }`, and the reunion heals `REUNION_HEAL`. Finishing a level scores `LEVEL_POINTS * level` plus a speed bonus. The level timer starts on the first `update()`, not in `create()`, because a restarted scene's clock is stale until its first frame.
- `src/scenes/ReunionScene.js`: the between-levels cutscene. The big parent glides in, the chick hops onto its back, hearts float up and "REUNITED!" appears, then it starts the next level (after `REUNION_MS`, or on Enter).
- `src/scenes/GameOverScene.js`: the game-over cutscene. A bald eagle dives in (wings swept back), grabs the loon and flaps off with it, then GAME OVER with the score. Enter goes to the high scores. The eagle's wingbeat alternates two frames cut from one generated image.
- `src/scenes/HighScoreScene.js`: after game over. A score that makes the top `HIGH_SCORE_COUNT` first gets 3-letter initials: up/down cycle, left/right move, typing sets letters, Enter confirms. Then the eagle flies in with the "HIGH SCORES" banner in its talons, drops it, and the rows swoop in, with the new entry blinking. It plays its own music, and Enter returns to the title.
- `src/ui/touch.js`: mobile support. `TouchStick` is the floating joystick (drag anywhere; distance sets strength 0–1, which `GameScene` uses directly as paddling strength). On touch screens it rests faded in the bottom-left corner and glides back there on release. Its knob circles as a hint until the first touch of the session (a module-level flag). `addMuteButton()` replaces the M key on touch screens. `isTouchDevice()` checks `(pointer: coarse)` to pick touch hints and prompts ("TAP TO START", "DRAG ANYWHERE TO SWIM"). Every "press Enter" also accepts a tap, but not a tap on a button. The game scales to fit with `Phaser.Scale.FIT`, and `index.html` blocks zoom and scrolling and shows a "turn your phone sideways" message on phones held upright. `#game` is inset by the safe-area insets, so it stays clear of notches. `public/` holds the web-app manifest and home-screen icons (made from `loon-big.png`). On iPhone, launching from the home screen is the only way to hide Safari's bars. On Android, the title's first tap calls `scale.startFullscreen()`.
- `src/highScores.js`: the local table, saved in `localStorage` (so per browser; falls back to memory if storage is unavailable), plus `fetchWorldScores`/`submitWorldScore` for the world table at the relative URL `api/scores`. Those return null if there's no server, and `HighScoreScene` then shows the local table labeled THIS DEVICE.
- `server/`: the world high score server (`scores-server.js`, zero dependencies, validates initials and whether a score is possible for its level, rate limits per IP), its systemd unit, and the nginx `/api/` snippet.
- `src/assets/*.png`: big sprites for the title and cutscenes (loon, chick, eagle frames, reed clump, lily pads), made from `art-source/` images by `tools/pixelize.py` (needs Pillow). It removes the magenta background and purple fringe, shrinks the image to its native pixel grid, and can erase regions and rotate. The exact commands for each asset are in the script's docstring. Re-run them if a source image changes. Sprites converted with the same `--cell` share a pixel size on screen. The chick is drawn one scale step smaller than its parent so it's about a third of the parent's length. `HEART` is a grid in `pixelArt.js`.
- `src/art/pixelArt.js`: pixel art as character grids (same idea as mazes) plus `makePixelTexture()` to turn a grid into a texture. It holds the small top-down loon (two paddling frames) and chick for gameplay. Top-down art faces right, and the game rotates it. Reed wall tiles and the water tile are generated from fixed seeds (`reedTexture`, `makeWaterTexture`) rather than hand-drawn, and the water is a drifting TileSprite. Each reed texture is keyed by variant, the sides that face water (those edges fray and get semi-transparent overhang), and a sway frame. `GameScene.swayReeds()` swaps frames in a traveling wind wave. Reed images are 48px with 40px static bodies.
- `art-source/`: reference images the pixel art is based on, such as AI-generated concepts on a magenta background. They aren't loaded by the game. At small in-game sprite size, downscaling gave muddy results, so those grids are redrawn by hand using them as reference. Large cutscene sprites convert well with `tools/pixelize.py`.
- `src/mazes/generateMaze.js`: recursive-backtracker generator; puts the baby on the tile farthest from the start
- `src/mazes/maze1.js`: hand-made maze, used when `PROCEDURAL_MAZE` is false
- `src/ui/HpBar.js`: the HP bar used in gameplay and the reunion. Losses snap down and the lost chunk drains after a moment. Gains grow back smoothly. It turns amber at 40% and red and pulsing at 20%. Fills use `scaleX`, not `width`, because Phaser rectangles don't reliably redraw when `width` changes.
- `src/audio.js`: all sound, synthesized with the Web Audio API. One shared instance survives scene changes. Scenes call `playMusic('title' | 'highscore' | 'lake')`, which crossfades (the chiptunes are data in `CHIPTUNES`) and is a no-op if that music is already playing. `stopMusic()` fades to silence, which the game-over cutscene uses.

## How things work

- Mazes are arrays of equal-length strings: `#` reeds, `.` water, `P` loon start, `B` baby. The generator and hand-made mazes share this format.
- Generated maze sizes must be odd (level 1 sizes odd, growth even).
- A new level is `this.scene.restart({ level })`, and `create(data)` rebuilds everything. Anything that must persist across levels (like audio) lives outside the scene.
- Swimming has inertia (`GameScene.swim()`). Each frame the body's velocity eases toward a target instead of being set directly: full speed in the held direction at `LOON_ACCELERATION`, or the lake current (`WATER_DRIFT * LOON_FLOAT_DRIFT`) at `LOON_GLIDE_DRAG` when no key is held. It works on the body's live velocity, so bounces off the reeds (`LOON_BOUNCE`) carry through. The loon faces its actual velocity, not the input. Only impacts at `LOON_HIT_MIN_SPEED` or faster thud and cost HP, measured by `impactSpeed` from before the physics step.
- Corner assist (`GameScene.assistCorners()`, after `swim()`): for straight up/down/left/right input, it slides the loon sideways toward the center of its lane, or the neighboring lane if that's where the opening ahead is and it's within `CORNER_ASSIST_RANGE`. It reads `this.maze` for walls, and ignores diagonal input.
- The loon's collision box is a square (`LOON_BODY_SIZE`) that is smaller than its sprite, because Arcade bodies don't rotate with the sprite. Its head pokes into the reeds a little by design.
- Layering in GameScene comes from creation order: water, wake particles, reeds, chick, loon, then text (depth 10). The wake sits under the reeds so droplets don't show on top of them.
- Wake particles are emitted manually with `emitParticleAt()` at points computed from the loon's rotation (`pointBehindLoon()`). The emitter itself stays at 0,0.
- Mazes larger than the view scroll with a camera that follows the loon. Smaller mazes are centered.
- Import Phaser as `import * as Phaser from 'phaser'`.

## Gotchas

- The Arcade collider callback fires every frame while the loon pushes into reeds. Throttle anything triggered from it (see `bump()`).
- `body.deltaX()`/`deltaY()` are measured before collision separation, so they report movement even when the loon is blocked. To detect real movement, compare the game object's position with the previous frame's (see `paddle()`).
- All text uses the Press Start 2P arcade font (`FONT_FAMILY` in config), bundled from `@fontsource/press-start-2p`. Phaser renders text with whatever font is loaded at that moment, so `main.js` waits for `document.fonts.load()` before creating the game. Keep that if the startup code changes.
- Browsers block audio until the user interacts. `audio.js` starts on the first keydown or pointerdown, then plays whatever music was last requested. The title screen shows "INSERT COIN" until then: any key "inserts a coin" (with a coin sound) and turns the sound on, and that press doesn't also start the game.

## Testing in the browser pane

- When the pane is hidden, the game loop is throttled, so time-based events like the level advance only move forward while screenshots are being taken.
- Synthetic `KeyboardEvent`s dispatched on `window` drive movement. They don't count as user activation for audio, so click the canvas first.
- Random mazes can't be steered by script. To test reunion or levels, temporarily expose the game (`window.__game = new Phaser.Game(config)`), then use `scene.loon.body.reset(x, y)` or `scene.scene.restart({ level })`. Remove the hook before committing.
- For timing-sensitive tests (physics, speeds), step the game yourself instead of relying on screenshots: `game.loop.step(performance.now())` every 16ms from a script gives normal 60fps frames even while the pane is hidden. Scene changes (`scene.start`) are also only processed on a step. The real time between your script calls also counts as game time on the next step, so timers like `REUNION_MS` can fire "early". Do a whole check inside one script. After editing a file, the dev server can briefly serve the old version, so confirm the running code with `someFunction.toString()` if results look stale.
- A restarted scene is the same object, so anything you patch on it in a test (like `scene.someMethod = () => {}`) survives `scene.restart()` and later `scene.start()`. Use `delete scene.someMethod` to undo it.
- Cutscenes can finish between screenshots. Slow one down with `scene.time.timeScale`, `scene.tweens.timeScale` and `scene.anims.globalTimeScale` (for example 0.3).
- Pointer and tap tests need the canvas to have a real size on the page. When the pane is hidden it can be 0×0, and pointer positions come out as null. Set a viewport with `resize_window` first (and reset it to `desktop` afterwards). Synthetic `MouseEvent`s on the canvas drive the joystick and buttons. The `mobile` preset emulates a touch phone, but a custom landscape size doesn't count as touch.
- The zoom screenshot action doesn't work in the pane. To inspect sprites up close, zoom the game camera instead: `camera.stopFollow()`, `camera.useBounds = false`, `camera.setZoom(5)`, then `camera.setScroll(...)`.
- Starting a scene from a script doesn't run `create()` right away, and it takes longer while the pane is hidden, so wait before touching the new scene's objects.

## Git and deployment

- The repo is public at https://github.com/dmrosen77/loon-maze under the MIT license, and `main` is pushed to `origin`.
- This repo's git email is the GitHub noreply address (`git config --local user.email`), so commits don't expose a personal email. Keep it that way.
- The game is not published on GitHub Pages (that was removed on purpose). Don't add a Pages workflow, a homepage link, or links to hosted copies of the game in the README or elsewhere unless asked.
- The build uses relative paths (`base: './'` in `vite.config.js`, and relative links in `index.html`), so it works from any folder on any web server. Don't add root-absolute `/…` URLs.
- Releases: move the changelog's "Unreleased" entries under the new version, run `npm version X.Y.Z --no-git-tag-version`, commit, tag `vX.Y.Z` (annotated), push the tag, and `gh release create` with notes from the changelog.
