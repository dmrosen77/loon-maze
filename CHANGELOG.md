# Changelog

All notable changes to Loon Maze. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Diving.** From level 6 on, hold Space (or the DIVE button on touch screens) to dive and swim under the reeds, shown as a dark shadow trailing bubbles. Each level allows a few dives: one at first, then an extra one at levels 11, 16 and 21, shown as pips beside a blue AIR bar under HP. Each dive is a one-second breath, enough for one short-cut under a wall. Let go to come back up once you're clear of the reeds. If you run out of air under the reeds, the loon pops back up where it dove, gasping, and loses 3 HP.
- **Dive lesson.** After level 5, a short lesson level walls off the chick so you have to dive to reach it. Dives are unlimited there, running out is free, and it doesn't score.

## [1.3.1] - 2026-09-29

### Changed
- README: how world high scores work and how to run the score server, with a screenshot of the world table.

## [1.3.0] - 2026-09-29

### Added
- **World high scores.** When the game is served with its score server (`server/`), the high score table is shared by everyone who plays there, labeled WORLD. Scores are checked on the server. Without the server the game uses this device's table, as before.
- `npm run deploy` script for a self-hosted copy.
- README with screenshots, controls, and how to play and run the game.
- **Corner assist.** When you swim toward an opening you're slightly off-center from, the loon is steered into it instead of catching on the corner. It only nudges when the loon wouldn't fit, and blends into its momentum, so swimming stays smooth.

### Changed
- **More forgiving controls.** The loon's collision box is smaller, so tight corners are easier.
- **Fewer HP hits.** Only impacts at about half speed or faster cost HP (up from about a quarter), and the blink protection after a hit lasts 1.5 seconds instead of 1.

## [1.2.0] - 2026-09-29

### Added
- MIT license.
- Home-screen app support. "Add to Home Screen" gives a Loon Maze icon that opens full screen, with no browser bars. On Android, the first tap on the title also goes full screen and holds the screen sideways.

### Changed
- On phones and tablets the joystick is shown before you touch the screen. It rests, faded, in the bottom-left corner, and its knob circles until your first touch to show how to swim. It still jumps to wherever you put your thumb, and glides back to its corner when you let go.
- On phones and tablets the game widens to fill the screen held sideways, with no black bars at the sides, and shows more of the maze side to side. Desktop is unchanged.
- On phones with a notch or rounded corners, the game stays inside the visible area.

## [1.1.0] - 2026-09-29

### Added
- **Mobile support.** The game scales to fit any screen. On phones and tablets:
  - A floating joystick: drag anywhere to swim, and drag further to paddle harder.
  - Taps work wherever Enter does.
  - Tappable arrows and an OK button for entering initials.
  - A sound on/off button.
  - A message asking you to turn the phone sideways.
- **Scoring.** Finishing a level earns 1000 × the level number, plus a speed bonus of up to 1000 points. The score shows during play, the win screen shows what each level earned, and game over shows the final score.
- **High score table.** A top-10 score gets arcade-style 3-letter initials. Then the eagle flies in carrying the "HIGH SCORES" banner, the rows swoop in, and new high-score music plays. Scores are saved in the browser.
- **Attract mode.** After 20 idle seconds, the title screen shows the high scores, then returns on its own.
- **INSERT COIN.** The title asks you to insert a coin: the first key press or tap plays a coin sound.
- `npm run dev:phone` to try the game on a phone over Wi-Fi.

### Changed
- The game-over eagle is now bigger than the loon, the way a real bald eagle is, and the loon stays visible in its talons as it's carried off.

### Fixed
- The speed bonus no longer counts time spent on the win screen before a level starts.

## [1.0.0] - 2026-09-28

First release.

### Added
- Randomly generated lake mazes that grow each level, with a camera that scrolls on big mazes.
- Swimming physics: acceleration, gliding, curved turns, bouncing off reeds, and drifting with the current.
- 50 HP: hard hits on the reeds cost HP, HP carries between levels, and each reunion heals a little.
- Animated title screen: a moonlit lake with the loon and chick, swaying reeds, lily pads, glinting water and fireflies.
- Reunion cutscene after each level, and a game-over cutscene where a bald eagle carries the loon away.
- Pixel art throughout, with animated reed walls, drifting water and wake particles.
- Synthesized music and sound effects, and an arcade font.

[Unreleased]: https://github.com/dmrosen77/loon-maze/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/dmrosen77/loon-maze/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/dmrosen77/loon-maze/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/dmrosen77/loon-maze/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/dmrosen77/loon-maze/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/dmrosen77/loon-maze/releases/tag/v1.0.0
