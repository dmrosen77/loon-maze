import * as Phaser from 'phaser';
import {
  TILE_SIZE,
  PROCEDURAL_MAZE,
  LEVEL_1_COLS,
  LEVEL_1_ROWS,
  GROWTH_PER_LEVEL,
  MAX_COLS,
  MAX_ROWS,
  LOON_SPEED,
  LOON_STROKE_MS,
  LOON_TURN_SPEED,
  LOON_BODY_SIZE,
  LOON_MAX_HP,
  LOON_INVULNERABLE_MS,
  SPRITE_PIXEL_SIZE,
  REED_SWAY_SPEED,
  REED_GUST_SPACING,
  WATER_DRIFT,
  WAKE_INTERVAL_MS,
  WAKE_SPLASH,
  FONT_FAMILY,
} from '../config.js';
import handMadeMaze from '../mazes/maze1.js';
import generateMaze from '../mazes/generateMaze.js';
import {
  LOON_TOP_FEET_OUT,
  LOON_TOP_FEET_IN,
  BABY_LOON_TOP,
  REED_TILE_VARIANTS,
  REED_SWAY_FRAMES,
  WATER_SIDE,
  reedTexture,
  makePixelTexture,
  makeWaterTexture,
} from '../art/pixelArt.js';
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
    this.gameOver = false;
    this.hp = LOON_MAX_HP;
    this.invulnerableUntil = 0;
    this.lastBumpTime = 0;
    this.nextStrokeTime = 0;
    this.nextWakeTime = 0;
    this.audio = getLakeAudio(this);
    this.audio?.playMusic('lake');
    this.cameras.main.fadeIn(400, 0, 0, 0);

    const maze = mazeForLevel(this.level);
    const mazeWidth = maze[0].length * TILE_SIZE;
    const mazeHeight = maze.length * TILE_SIZE;

    this.createSprites();

    // The lake: the maze, or the whole screen if the maze is smaller.
    // Drawing order sets layering: water, then wake, then reeds, then loons.
    const camera = this.cameras.main;
    const lakeWidth = Math.max(mazeWidth, camera.width);
    const lakeHeight = Math.max(mazeHeight, camera.height);
    const lake = new Phaser.Geom.Rectangle(
      (mazeWidth - lakeWidth) / 2,
      (mazeHeight - lakeHeight) / 2,
      lakeWidth,
      lakeHeight,
    );
    this.water = this.add.tileSprite(lake.x, lake.y, lake.width, lake.height, 'water').setOrigin(0);
    this.createWake();

    const reeds = this.physics.add.staticGroup();
    this.reedTiles = [];
    this.time.addEvent({ delay: 100, loop: true, callback: () => this.swayReeds() });
    let loonStart;
    let babyStart;

    maze.forEach((row, rowIndex) => {
      [...row].forEach((cell, colIndex) => {
        const x = colIndex * TILE_SIZE + TILE_SIZE / 2;
        const y = rowIndex * TILE_SIZE + TILE_SIZE / 2;
        if (cell === '#') {
          this.addReedTile(reeds, maze, colIndex, rowIndex, x, y);
        } else if (cell === 'P') {
          loonStart = { x, y };
        } else if (cell === 'B') {
          babyStart = { x, y };
        }
      });
    });

    // The chick faces roughly the way its parent will come from, snapped to
    // up/down/left/right since pixel art looks ragged at odd angles.
    this.baby = this.add.image(babyStart.x, babyStart.y, 'baby-loon-top');
    const towardParent = Phaser.Math.Angle.BetweenPoints(babyStart, loonStart);
    this.baby.rotation = Phaser.Math.Snap.To(towardParent, Math.PI / 2);
    this.physics.add.existing(this.baby, true);

    this.physics.world.setBounds(0, 0, mazeWidth, mazeHeight);
    this.loon = this.add.sprite(loonStart.x, loonStart.y, 'loon-top-feet-in');
    this.physics.add.existing(this.loon);
    this.loon.body.setSize(LOON_BODY_SIZE, LOON_BODY_SIZE);
    this.loon.body.setCollideWorldBounds(true);
    this.lastLoonX = loonStart.x;
    this.lastLoonY = loonStart.y;

    this.physics.add.collider(this.loon, reeds, this.bump, null, this);
    this.physics.add.overlap(this.loon, this.baby, this.reunite, null, this);

    camera.setBounds(lake.x, lake.y, lake.width, lake.height);
    camera.startFollow(this.loon, true);
    this.showLevelText();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.muteKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  }

  // Textures and the paddling animation are global, so they're only made once.
  createSprites() {
    makePixelTexture(this, 'loon-top-feet-out', LOON_TOP_FEET_OUT, SPRITE_PIXEL_SIZE);
    makePixelTexture(this, 'loon-top-feet-in', LOON_TOP_FEET_IN, SPRITE_PIXEL_SIZE);
    makePixelTexture(this, 'baby-loon-top', BABY_LOON_TOP, SPRITE_PIXEL_SIZE);
    makeWaterTexture(this, TILE_SIZE, SPRITE_PIXEL_SIZE);
    makePixelTexture(this, 'wake-droplet', { palette: { w: '#f2fafe' }, rows: ['ww', 'ww'] }, SPRITE_PIXEL_SIZE);
    if (!this.anims.exists('loon-paddle')) {
      this.anims.create({
        key: 'loon-paddle',
        frames: [{ key: 'loon-top-feet-out' }, { key: 'loon-top-feet-in' }],
        frameRate: 2000 / LOON_STROKE_MS, // One kick per paddling sound.
        repeat: -1,
      });
    }
  }

  // A random variation of reeds, with frayed edges on the sides that face
  // water. All its sway frames are made up front so animating never stalls.
  addReedTile(reeds, maze, col, row, x, y) {
    const isWater = (c, r) => maze[r]?.[c] === undefined || maze[r][c] !== '#';
    const waterSides =
      (isWater(col, row - 1) ? WATER_SIDE.N : 0) |
      (isWater(col + 1, row) ? WATER_SIDE.E : 0) |
      (isWater(col, row + 1) ? WATER_SIDE.S : 0) |
      (isWater(col - 1, row) ? WATER_SIDE.W : 0);
    const variant = Phaser.Math.Between(0, REED_TILE_VARIANTS - 1);
    const frames = [];
    for (let frame = 0; frame < REED_SWAY_FRAMES; frame++) {
      frames.push(reedTexture(this, variant, waterSides, frame, TILE_SIZE, SPRITE_PIXEL_SIZE));
    }

    const upright = 1;
    const image = this.add.image(x, y, frames[upright]);
    reeds.add(image);
    image.body.setSize(TILE_SIZE, TILE_SIZE); // The image includes overhang; walls don't.
    this.reedTiles.push({ image, frames, frame: upright });
  }

  // Gusts of wind sweep diagonally across the lake, bending each tile's
  // blades one way, then back upright, then the other way.
  swayReeds() {
    const time = this.time.now / 1000;
    for (const tile of this.reedTiles) {
      const phase = ((tile.image.x + tile.image.y) / REED_GUST_SPACING) * Math.PI * 2;
      const wind = Math.sin(time * REED_SWAY_SPEED - phase);
      const frame = wind > 0.4 ? 2 : wind < -0.4 ? 0 : 1;
      if (frame !== tile.frame) {
        tile.frame = frame;
        tile.image.setTexture(tile.frames[frame]);
      }
    }
  }

  // Droplets in the loon's wake. They're emitted by hand from update() and
  // paddle(), always heading away from the way the loon is facing.
  createWake() {
    this.wake = this.add.particles(0, 0, 'wake-droplet', {
      lifespan: { min: 500, max: 1000 },
      speed: { min: 12, max: 40 },
      angle: { onEmit: () => this.loon.angle + 180 + Phaser.Math.Between(-40, 40) },
      scale: { start: 1, end: 0.5 },
      alpha: { start: 0.9, end: 0 },
      emitting: false,
    });
  }

  // A point behind the loon's center (and optionally to one side), following
  // its rotation.
  pointBehindLoon(distance, sideways = 0) {
    const { x, y, rotation } = this.loon;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
      x: x - cos * distance - sin * sideways,
      y: y - sin * distance + cos * sideways,
    };
  }

  // A corner label, plus a big banner that fades out at the start of the level.
  showLevelText() {
    this.add
      .text(12, 8, `Level ${this.level}`, { ...TEXT_STYLE, fontSize: '16px', strokeThickness: 4 })
      .setScrollFactor(0)
      .setDepth(10);
    this.createHpBar();

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

  // "HP" and one segment per hit point, under the level label.
  createHpBar() {
    const x = 12;
    const y = 34;
    this.add
      .text(x, y, 'HP', { ...TEXT_STYLE, fontSize: '12px', strokeThickness: 4 })
      .setScrollFactor(0)
      .setDepth(10);
    this.hpSegments = [];
    for (let i = 0; i < LOON_MAX_HP; i++) {
      const segment = this.add
        .rectangle(x + 34 + i * 20, y + 2, 16, 10, 0x5ad04a)
        .setOrigin(0)
        .setStrokeStyle(2, 0x000000)
        .setScrollFactor(0)
        .setDepth(10);
      this.hpSegments.push(segment);
    }
  }

  updateHpBar() {
    this.hpSegments.forEach((segment, i) => {
      this.tweens.killTweensOf(segment);
      segment.setAlpha(1);
      if (i >= this.hp) {
        segment.setFillStyle(0x3a1d1d); // Lost.
      } else if (this.hp === 1) {
        // Last one left: red and pulsing.
        segment.setFillStyle(0xe8475f);
        this.tweens.add({ targets: segment, alpha: 0.3, duration: 300, yoyo: true, repeat: -1 });
      } else {
        segment.setFillStyle(0x5ad04a);
      }
    });
  }

  // The collider fires every frame while pushing into reeds, so only count a
  // hit (thud and damage) when the loon first touches them, not continuously.
  bump() {
    const now = this.time.now;
    if (now - this.lastBumpTime > 200) {
      this.audio?.bump();
      this.takeDamage(now);
    }
    this.lastBumpTime = now;
  }

  takeDamage(now) {
    if (this.reunited || this.gameOver || now < this.invulnerableUntil) return;
    this.hp -= 1;
    this.invulnerableUntil = now + LOON_INVULNERABLE_MS;
    this.updateHpBar();
    this.cameras.main.shake(120, 0.006);

    if (this.hp <= 0) {
      this.loseGame();
      return;
    }

    this.audio?.hurt();
    // Flash red, then blink until the loon can be hurt again.
    this.loon.setTint(0xff6060);
    this.time.delayedCall(150, () => this.loon.clearTint());
    this.tweens.add({
      targets: this.loon,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(LOON_INVULNERABLE_MS / 200) - 1,
      onComplete: () => this.loon.setAlpha(1),
    });
  }

  // Out of HP: a moment frozen in red, then fade into the eagle cutscene.
  loseGame() {
    this.gameOver = true;
    this.loon.body.setVelocity(0, 0);
    this.loon.stop();
    this.tweens.killTweensOf(this.loon);
    this.loon.setAlpha(1).setTint(0xff6060);
    this.audio?.hurt();

    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('GameOverScene', { level: this.level });
      });
    });
  }

  reunite() {
    if (this.reunited || this.gameOver) return;
    this.reunited = true;
    this.loon.body.setVelocity(0, 0);
    this.loon.stop();

    // A beat to see the two touch, then fade into the reunion cutscene, which
    // starts the next level when it's done.
    this.time.delayedCall(400, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('ReunionScene', { level: this.level });
      });
    });
  }

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      this.audio?.toggleMute();
    }

    // Whole pixels only, so the pixel art doesn't shimmer as it drifts.
    this.water.tilePositionX = Math.round((time / 1000) * WATER_DRIFT.x);
    this.water.tilePositionY = Math.round((time / 1000) * WATER_DRIFT.y);

    if (this.gameOver || this.reunited) return;

    const { left, right, up, down } = this.cursors;
    const velocity = new Phaser.Math.Vector2(
      (right.isDown ? 1 : 0) - (left.isDown ? 1 : 0),
      (down.isDown ? 1 : 0) - (up.isDown ? 1 : 0),
    );

    // Normalize so diagonal movement isn't faster than straight movement.
    velocity.normalize().scale(LOON_SPEED);
    this.loon.body.setVelocity(velocity.x, velocity.y);

    this.animateLoon(velocity, delta);

    // Compare against last frame's position, which is after the reeds pushed
    // the loon back (the body's own delta is measured before that happens),
    // so holding a key while pressed against the reeds doesn't count.
    const { x, y } = this.loon;
    const moving = Math.abs(x - this.lastLoonX) + Math.abs(y - this.lastLoonY) > 0.1;
    this.lastLoonX = x;
    this.lastLoonY = y;
    if (!moving) return;

    this.paddle(time);
    if (time >= this.nextWakeTime) {
      const tail = this.pointBehindLoon(22);
      this.wake.emitParticleAt(tail.x, tail.y, 2);
      this.nextWakeTime = time + WAKE_INTERVAL_MS;
    }
  }

  // Paddle while a direction is held, and turn smoothly to face it.
  // (The collision box is square, so turning never changes what the loon hits.)
  animateLoon(velocity, delta) {
    if (velocity.lengthSq() === 0) {
      this.loon.stop();
      this.loon.setTexture('loon-top-feet-in');
      return;
    }
    this.loon.play('loon-paddle', true);
    this.loon.rotation = Phaser.Math.Angle.RotateTo(
      this.loon.rotation,
      velocity.angle(),
      (LOON_TURN_SPEED * delta) / 1000,
    );
  }

  // While swimming: a stroke sound and a splash at each foot every LOON_STROKE_MS.
  paddle(time) {
    if (time < this.nextStrokeTime) return;
    this.audio?.paddle();
    for (const side of [-1, 1]) {
      const foot = this.pointBehindLoon(20, side * 8);
      this.wake.emitParticleAt(foot.x, foot.y, WAKE_SPLASH);
    }
    this.nextStrokeTime = time + LOON_STROKE_MS;
  }
}
