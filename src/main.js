import * as Phaser from 'phaser';
import { VIEW_WIDTH, VIEW_HEIGHT, COLORS } from './config.js';
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
  scene: [GameScene],
};

new Phaser.Game(config);
