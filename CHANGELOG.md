# Changelog

All notable changes to Loon Maze. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- **The level-clear heal depends on your stars.** Instead of +5 HP every time, a reunion heals +1 HP for one star, +2 for two and +4 for a perfect three, so clean runs keep you healthy and sloppy ones wear you down.

## [1.9.0] - 2026-09-30

### Added
- **A pause menu.** Esc or P (Start on a gamepad, the new II button on touch screens) pauses a level: RESUME, RESTART LEVEL, QUIT (to the lake map, or the title in ARCADE, which abandons the run) and SOUND. Restarting costs 5 HP (free in the dive lesson) and takes back that attempt's fish points; it's greyed out if you don't have the HP. Paused time doesn't count against the speed bonus or par. The game also pauses by itself when you switch tabs or apps.
- **Cheeky easter eggs.** Enter certain initials on the high score screen and see what happens: ASS gets a "JUICY!" storm of bouncing peaches, POO a "STINKS!" rain of smiling poops (with sound), and PEE turns the screen yellow ("EWWW..."). ASS still isn't allowed on the world table, so that score stays on the player's device.

## [1.8.0] - 2026-09-30

### Changed
- **Each LAKES day is one run.** Your HP now carries from Dawn through Day and Sunset to Night, with the usual heal after each reunion, and winning a level goes straight on to the next. Survive the whole day to open the next one. Die or quit partway and you start that day again from Dawn. Stars and best scores you won along the way are always kept, and days you've survived can be replayed level by level.

### Security
- **Harder to fake high scores.** Each ARCADE run now gets a one-time ticket from the score server when it starts, and a score is only accepted with its run's ticket, once, and only after enough real time has passed to have played that far. Levels over 99 are refused. `npm run remove-score -- NAME [SCORE]` takes a bad entry off the world table.
- The score server's rate limit now only trusts Cloudflare's visitor-IP header (or the real connection), not `X-Forwarded-For`, which anyone can fake.
- The score server runs sandboxed by systemd: no privilege gain, a read-only system except its scores folder, and a memory cap.
- The hosted site sends security headers: a Content Security Policy (everything from this site only), `nosniff`, a referrer policy, no framing, and no camera, microphone or location access.

## [1.7.0] - 2026-09-30

### Fixed
- **Too-easy diving levels.** Some LAKES levels put the chick just a wall or two from the start, so one dive finished them (Rangeley's Day 1 - Day was the worst). Diving levels are now checked: the chick has to be a fair way across the lake, and your dives can't cut the route to less than half of it (less with more dives). 29 of the 64 diving levels got new mazes. Levels that were fine, and all of Cobbosseecontee, are unchanged.

### Added
- **Gamepad support.** Play with a controller: the left stick or d-pad swims (tilt further to paddle harder), hold A to dive, and the d-pad, A and B work the menus, lake map and high score initials. Start quits a LAKES level to the map, and Select mutes. Any button inserts the coin. Works with Xbox, PlayStation, Switch Pro and most other controllers.

## [1.6.0] - 2026-09-30

### Added
- **LAKES mode.** Five Maine lakes, smallest to largest: Cobbosseecontee, Rangeley, Mooselookmeguntic, Sebago and Moosehead. Each lake is 4 days, and each day is 4 levels: dawn, day, sunset and night. That's 80 levels, each with the same maze every time you play it, so you can learn it and beat your best. Each level saves its best stars and score on your device.
- **A map of Maine** shows the lakes in their real places, with your stars for each. The next lake opens once you've earned 32 of the previous lake's 48 stars. Each lake's screen shows its 16 levels by day and time of day.
- **Difficulty by lake and day.** Mazes grow bigger and branchier each day, and each lake starts a little easier than the last one ended, then climbs higher. Diving starts at Rangeley, with the dive lesson first, and each lake after adds a dive per level.
- **PERFECT! celebration.** A 3-star level goes completely over the top: a flash, a boom and a screen shake, spinning light rays, a fountain of coins bursting from the stars and raining down, confetti, a flood of hearts filling the screen, and "PERFECT!" slamming in letter by letter in cycling rainbow colors, with a victory fanfare and a slot-machine shower of coin chimes.
- **A start menu:** CONTINUE (straight back to the next level you haven't beaten), LAKES, and ARCADE (the endless run with the world high score table).

### Changed
- **ARCADE mazes grow in stages.** Instead of a little bigger every level, they stay the same size for four levels, then jump 4 tiles bigger each way (11×9, 15×13, 19×17 and so on, up to 41×31), with "BIGGER LAKE!" announced. Each stage is also branchier, with more forks to choose between.
- The dive lesson only plays once per device. It can be replayed from Rangeley's screen.
- Bumping the reeds in the dive lesson no longer costs HP. It's for practice, and HP carries into the next level.

## [1.5.0] - 2026-09-30

### Added
- **Fish.** From level 2, fish dart around the open water and bolt when you get close. Catch one for 50 points; golden ones heal 3 HP instead. More fish on later levels. Points show in the corner as you earn them, and fish points get their own line on the reunion screen.
- **Extra-dive bubbles.** From level 7, some levels hide a big air bubble in a dead end off the main path. Grab it for an extra dive that level.
- **Stars.** The reunion screen rates each level: one star for finishing, two for beating par time, three for beating par without a hit.
- **Rocks, beaver dams, logs and lily pad mats.** Some walls are now special. They all block you on the surface like reeds, but they change diving: you can't dive under rocks, beaver dams are slow to dive through (a risky short-cut on one breath), and floating logs use half the air. Lily pad mats in some corridors slow you on the surface; diving under them is normal speed.
- **A new dive lesson.** It's now four rooms, each walled off by something different (floating logs, a beaver dam, then rocks with one reed gap, with lily pad mats along the way), and a hint for each room teaches how to get past.
- New features now announce themselves under the level banner the first time they appear.

### Changed
- The world high score server allows for fish points when checking whether a score is possible.

## [1.4.0] - 2026-09-29

### Added
- **Time of day.** Levels cycle through dawn, day, sunset and night, shown under the level banner. Sunset turns the water dusky purple with pink and gold highlights; at night the lake goes deep blue, with moonlight glinting on the water and fireflies over the reeds.
- **Lake life.** Lily pads (some with water lilies) float in the open water off the main path, frogs sit on some of them and hop off with a ribbit when you swim close, and dragonflies dart around.
- **Juicier effects.** Ripples spread when you bump the reeds, dive or surface; a red flash marks each hit; and hearts burst from the chick when you reach it.
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

[Unreleased]: https://github.com/dmrosen77/loon-maze/compare/v1.9.0...HEAD
[1.9.0]: https://github.com/dmrosen77/loon-maze/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/dmrosen77/loon-maze/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/dmrosen77/loon-maze/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/dmrosen77/loon-maze/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/dmrosen77/loon-maze/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/dmrosen77/loon-maze/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/dmrosen77/loon-maze/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/dmrosen77/loon-maze/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/dmrosen77/loon-maze/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/dmrosen77/loon-maze/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/dmrosen77/loon-maze/releases/tag/v1.0.0
