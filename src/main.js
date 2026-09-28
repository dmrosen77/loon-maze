import * as Phaser from 'phaser';
import '@fontsource/press-start-2p';
import { VIEW_WIDTH, VIEW_HEIGHT, FONT_FAMILY, COLORS } from './config.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  backgroundColor: COLORS.water,
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [TitleScene, GameScene], // The first one listed starts automatically.
};

// Phaser draws text with whatever font is ready at the time, so wait for the
// arcade font before starting (and start anyway if it fails to load).
document.fonts
  .load(`16px "${FONT_FAMILY}"`)
  .catch(() => {})
  .then(() => new Phaser.Game(config));
