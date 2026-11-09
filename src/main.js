import * as Phaser from 'phaser';
import '@fontsource/press-start-2p';
import { VIEW_WIDTH, VIEW_HEIGHT, MAX_VIEW_WIDTH, FONT_FAMILY, COLORS } from './config.js';
import { isTouchDevice } from './ui/touch.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import ReunionScene from './scenes/ReunionScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import HighScoreScene from './scenes/HighScoreScene.js';
import LakeMapScene from './scenes/LakeMapScene.js';
import PauseScene from './scenes/PauseScene.js';

// On phones and tablets, widen the game to the screen's sideways shape so it
// fills the screen instead of leaving black bars. (Measured as if held
// sideways, even if it's upright right now, since that's how it's played.)
// Desktop keeps the standard width. Screens lay themselves out from
// this.scale.width, so they adapt to whatever width this picks.
function gameWidth() {
  if (!isTouchDevice()) return VIEW_WIDTH;
  const box = document.getElementById('game').getBoundingClientRect();
  const long = Math.max(box.width, box.height);
  const short = Math.min(box.width, box.height);
  if (!short) return VIEW_WIDTH;
  return Phaser.Math.Clamp(Math.round((VIEW_HEIGHT * long) / short), VIEW_WIDTH, MAX_VIEW_WIDTH);
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: gameWidth(),
  height: VIEW_HEIGHT,
  // Scale the whole game to fit the window (or phone screen), centered.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: COLORS.water,
  // Two fingers at once: one on the joystick, one holding DIVE.
  input: { activePointers: 2 },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [TitleScene, LakeMapScene, GameScene, PauseScene, ReunionScene, GameOverScene, HighScoreScene], // The first one listed starts automatically.
};

// Phaser draws text with whatever font is ready at the time, so wait for the
// arcade font before starting (and start anyway if it fails to load).
document.fonts
  .load(`16px "${FONT_FAMILY}"`)
  .catch(() => {})
  .then(() => {
    const game = new Phaser.Game(config);
    // Development builds only: a handle for the console and for test scripts
    // (`npm run build` leaves this out). `__game` is the Phaser game, and
    // `__states()` lists the state of each running or paused scene, like
    // { GameScene: 'playing (paused)', PauseScene: null }.
    if (import.meta.env.DEV) {
      window.__game = game;
      window.__states = () =>
        Object.fromEntries(
          game.scene
            .getScenes(false)
            .filter((scene) => scene.sys.isActive() || scene.sys.isPaused())
            .map((scene) => [scene.sys.settings.key, scene.state ? `${scene.state.current}${scene.sys.isPaused() ? ' (paused)' : ''}` : null]),
        );
    }
  });
