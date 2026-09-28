import * as Phaser from 'phaser';
import {
  TILE_SIZE,
  PROCEDURAL_MAZE,
  LEVEL_1_COLS,
  LEVEL_1_ROWS,
  GROWTH_PER_LEVEL,
  MAX_COLS,
  MAX_ROWS,
  LEVEL_ADVANCE_MS,
  LOON_SPEED,
  LOON_STROKE_MS,
  LOON_WIDTH,
  LOON_HEIGHT,
  BABY_WIDTH,
  BABY_HEIGHT,
  FONT_FAMILY,
  COLORS,
} from '../config.js';
import handMadeMaze from '../mazes/maze1.js';
import generateMaze from '../mazes/generateMaze.js';
import { getLakeAudio } from '../audio.js';

const TEXT_STYLE = {
  fontFamily: `"${FONT_FAMILY}"`,
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 6,
  align: 'center',
  lineSpacing: 16,
};

// Each level's maze is a little bigger than the last, up to the max size.
function mazeForLevel(level) {
  if (!PROCEDURAL_MAZE) return handMadeMaze;
  const growth = GROWTH_PER_LEVEL * (level - 1);
  return generateMaze(
    Math.min(LEVEL_1_COLS + growth, MAX_COLS),
    Math.min(LEVEL_1_ROWS + growth, MAX_ROWS),
  );
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // create() runs again on scene.restart({ level }), so each level gets a fresh maze.
  create(data) {
    this.level = data?.level ?? 1;
    this.reunited = false;
    this.lastBumpTime = 0;
    this.nextStrokeTime = 0;
    this.audio = getLakeAudio(this);
    this.audio?.playMusic('lake');
    this.cameras.main.fadeIn(400, 0, 0, 0);

    const maze = mazeForLevel(this.level);
    const mazeWidth = maze[0].length * TILE_SIZE;
    const mazeHeight = maze.length * TILE_SIZE;

    const reeds = this.physics.add.staticGroup();
    let loonStart;
    let babyStart;

    maze.forEach((row, rowIndex) => {
      [...row].forEach((cell, colIndex) => {
        const x = colIndex * TILE_SIZE + TILE_SIZE / 2;
        const y = rowIndex * TILE_SIZE + TILE_SIZE / 2;
        if (cell === '#') {
          reeds.add(this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, COLORS.reeds));
        } else if (cell === 'P') {
          loonStart = { x, y };
        } else if (cell === 'B') {
          babyStart = { x, y };
        }
      });
    });

    this.baby = this.add.ellipse(babyStart.x, babyStart.y, BABY_WIDTH, BABY_HEIGHT, COLORS.baby);
    this.physics.add.existing(this.baby, true);

    this.physics.world.setBounds(0, 0, mazeWidth, mazeHeight);
    this.loon = this.add.ellipse(loonStart.x, loonStart.y, LOON_WIDTH, LOON_HEIGHT, COLORS.loon);
    this.physics.add.existing(this.loon);
    this.loon.body.setCollideWorldBounds(true);
    this.lastLoonX = loonStart.x;
    this.lastLoonY = loonStart.y;

    this.physics.add.collider(this.loon, reeds, this.bump, null, this);
    this.physics.add.overlap(this.loon, this.baby, this.reunite, null, this);

    this.setUpCamera(mazeWidth, mazeHeight);
    this.showLevelText();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.muteKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  }

  // Mazes smaller than the screen sit centered; bigger ones scroll with the loon.
  setUpCamera(mazeWidth, mazeHeight) {
    const camera = this.cameras.main;
    const boundsWidth = Math.max(mazeWidth, camera.width);
    const boundsHeight = Math.max(mazeHeight, camera.height);
    camera.setBounds(
      (mazeWidth - boundsWidth) / 2,
      (mazeHeight - boundsHeight) / 2,
      boundsWidth,
      boundsHeight,
    );
    camera.startFollow(this.loon, true);
  }

  // A corner label, plus a big banner that fades out at the start of the level.
  showLevelText() {
    this.add
      .text(12, 8, `Level ${this.level}`, { ...TEXT_STYLE, fontSize: '16px', strokeThickness: 4 })
      .setScrollFactor(0)
      .setDepth(10);

    const { width, height } = this.scale;
    const banner = this.add
      .text(width / 2, height / 2, `Level ${this.level}`, { ...TEXT_STYLE, fontSize: '48px' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 800,
      duration: 700,
      onComplete: () => banner.destroy(),
    });
  }

  // The collider fires every frame while pushing into reeds, so only thud
  // when the loon first hits them, not continuously.
  bump() {
    const now = this.time.now;
    if (now - this.lastBumpTime > 200) this.audio?.bump();
    this.lastBumpTime = now;
  }

  reunite() {
    if (this.reunited) return;
    this.reunited = true;
    this.loon.body.setVelocity(0, 0);
    this.audio?.reunite();

    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, `Reunited!\nLevel ${this.level} complete`, {
        ...TEXT_STYLE,
        fontSize: '32px',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.time.delayedCall(LEVEL_ADVANCE_MS, () => {
      this.scene.restart({ level: this.level + 1 });
    });
  }

  update(time) {
    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      this.audio?.toggleMute();
    }

    if (this.reunited) return;

    const { left, right, up, down } = this.cursors;
    const velocity = new Phaser.Math.Vector2(
      (right.isDown ? 1 : 0) - (left.isDown ? 1 : 0),
      (down.isDown ? 1 : 0) - (up.isDown ? 1 : 0),
    );

    // Normalize so diagonal movement isn't faster than straight movement.
    velocity.normalize().scale(LOON_SPEED);
    this.loon.body.setVelocity(velocity.x, velocity.y);

    this.paddle(time);
  }

  // A stroke sound every LOON_STROKE_MS while the loon is actually moving
  // (holding a key while pressed against the reeds doesn't count).
  paddle(time) {
    // Compare against last frame's position, which is after the reeds pushed
    // the loon back (the body's own delta is measured before that happens).
    const { x, y } = this.loon;
    const moving = Math.abs(x - this.lastLoonX) + Math.abs(y - this.lastLoonY) > 0.1;
    this.lastLoonX = x;
    this.lastLoonY = y;
    if (moving && time >= this.nextStrokeTime) {
      this.audio?.paddle();
      this.nextStrokeTime = time + LOON_STROKE_MS;
    }
  }
}
