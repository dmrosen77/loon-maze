import * as Phaser from 'phaser';
import {
  TILE_SIZE,
  PROCEDURAL_MAZE,
  LEVEL_1_COLS,
  LEVEL_1_ROWS,
  GROWTH_PER_LEVEL,
  MAX_COLS,
  MAX_ROWS,
  LEVEL_POINTS,
  SPEED_BONUS_MAX,
  SPEED_BONUS_LOSS,
  LOON_SPEED,
  LOON_ACCELERATION,
  LOON_GLIDE_DRAG,
  LOON_FLOAT_DRIFT,
  LOON_BOUNCE,
  LOON_HIT_MIN_SPEED,
  LOON_STROKE_MS,
  LOON_TURN_SPEED,
  LOON_BODY_SIZE,
  LOON_MAX_HP,
  HIT_DAMAGE,
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
import HpBar from '../ui/HpBar.js';
import { TouchStick, addMuteButton } from '../ui/touch.js';

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

  // Started with { level, hp, score }. HP and score carry over from the last
  // level (via the reunion cutscene); a new game starts at level 1 with full
  // HP and no score.
  create(data) {
    this.level = data?.level ?? 1;
    this.reunited = false;
    this.gameOver = false;
    this.hp = data?.hp ?? LOON_MAX_HP;
    this.score = data?.score ?? 0;
    this.invulnerableUntil = 0;
    this.lastBumpTime = 0;
    this.nextStrokeTime = 0;
    this.nextWakeTime = 0;
    this.audio = getLakeAudio(this);
    this.audio?.playMusic('lake');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    // Set on the first frame: a restarted scene's clock still holds the time
    // from when the scene last ran until then.
    this.levelStartTime = null;

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
    this.loon.body.setBounce(LOON_BOUNCE);
    this.lastLoonX = loonStart.x;
    this.lastLoonY = loonStart.y;
    this.heading = 0; // Direction the loon faces, before the idle rocking.
    this.impactSpeed = 0; // Speed going into the latest physics step.

    this.physics.add.collider(this.loon, reeds, this.bump, null, this);
    this.physics.add.overlap(this.loon, this.baby, this.reunite, null, this);

    camera.setBounds(lake.x, lake.y, lake.width, lake.height);
    camera.startFollow(this.loon, true);
    this.showLevelText();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.muteKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.stick = new TouchStick(this);
    addMuteButton(this, this.audio, this.scale.width - 12, 34);
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
    this.hpBar = new HpBar(this, 12, 40, { width: 160, height: 12, max: LOON_MAX_HP, value: this.hp });
    this.add
      .text(this.scale.width - 12, 8, `SCORE ${this.score}`, { ...TEXT_STYLE, fontSize: '16px', strokeThickness: 4 })
      .setOrigin(1, 0)
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

  // The collider fires every frame while pushing into reeds, so only count a
  // hit when the loon first touches them, not continuously. Gentle nudges
  // (drifting, easing along a wall) are harmless; only real impacts thud and
  // cost HP.
  bump() {
    const now = this.time.now;
    if (now - this.lastBumpTime > 200 && this.impactSpeed >= LOON_HIT_MIN_SPEED) {
      this.audio?.bump();
      this.takeDamage(now);
    }
    this.lastBumpTime = now;
  }

  takeDamage(now) {
    if (this.reunited || this.gameOver || now < this.invulnerableUntil) return;
    this.hp = Math.max(0, this.hp - HIT_DAMAGE);
    this.invulnerableUntil = now + LOON_INVULNERABLE_MS;
    this.hpBar.setValue(this.hp);
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
        this.scene.start('GameOverScene', { level: this.level, score: this.score });
      });
    });
  }

  reunite() {
    if (this.reunited || this.gameOver) return;
    this.reunited = true;

    // Level points, plus a bonus for finishing quickly.
    const seconds = (this.time.now - this.levelStartTime) / 1000;
    const levelPoints = LEVEL_POINTS * this.level;
    const speedBonus = Math.max(0, Math.round(SPEED_BONUS_MAX - seconds * SPEED_BONUS_LOSS));
    this.loon.body.setVelocity(0, 0);
    this.loon.stop();

    // A beat to see the two touch, then fade into the reunion cutscene, which
    // starts the next level when it's done.
    this.time.delayedCall(400, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('ReunionScene', {
          level: this.level,
          hp: this.hp,
          score: this.score + levelPoints + speedBonus,
          levelPoints,
          speedBonus,
        });
      });
    });
  }

  update(time, delta) {
    this.levelStartTime ??= time;
    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      this.audio?.toggleMute();
    }

    // Whole pixels only, so the pixel art doesn't shimmer as it drifts.
    this.water.tilePositionX = Math.round((time / 1000) * WATER_DRIFT.x);
    this.water.tilePositionY = Math.round((time / 1000) * WATER_DRIFT.y);

    if (this.gameOver || this.reunited) return;

    // Arrow keys, or the touch joystick (whose drag distance sets how hard the
    // loon paddles).
    const { left, right, up, down } = this.cursors;
    let input = new Phaser.Math.Vector2(
      (right.isDown ? 1 : 0) - (left.isDown ? 1 : 0),
      (down.isDown ? 1 : 0) - (up.isDown ? 1 : 0),
    ).normalize(); // So diagonals aren't faster than straight lines.
    if (input.lengthSq() === 0) input = this.stick.vector.clone();
    const paddling = input.lengthSq() > 0;

    this.swim(input, paddling, delta);
    this.animateLoon(paddling, time, delta);

    // Actual speed, from how far the loon really moved since last frame (after
    // the reeds pushed it back, so pushing against a wall counts as still).
    const { x, y } = this.loon;
    const speed = (Math.hypot(x - this.lastLoonX, y - this.lastLoonY) * 1000) / delta;
    this.lastLoonX = x;
    this.lastLoonY = y;
    if (speed < 30) return; // Floating along with the current: no wake.

    if (paddling) this.paddle(time);
    if (time >= this.nextWakeTime) {
      const tail = this.pointBehindLoon(22);
      this.wake.emitParticleAt(tail.x, tail.y, 2);
      this.nextWakeTime = time + WAKE_INTERVAL_MS;
    }
  }

  // Swimming physics. The velocity eases toward a target instead of jumping to
  // it: full speed in the held direction while paddling, or the gentle lake
  // current when not, so the loon speeds up, glides to a stop, curves through
  // turns, and then floats. The body's velocity already includes any bounce
  // off the reeds from the last physics step, so bounces carry through.
  swim(input, paddling, delta) {
    const velocity = this.loon.body.velocity;
    const target = paddling
      ? input.clone().scale(LOON_SPEED)
      : new Phaser.Math.Vector2(WATER_DRIFT.x, WATER_DRIFT.y).scale(LOON_FLOAT_DRIFT);
    const maxChange = ((paddling ? LOON_ACCELERATION : LOON_GLIDE_DRAG) * delta) / 1000;
    const change = target.subtract(velocity);
    if (change.length() > maxChange) change.setLength(maxChange);
    velocity.add(change);
    this.impactSpeed = velocity.length();
  }

  // Paddle while a direction is held; glide with feet tucked otherwise. The
  // loon faces the way it's actually moving, so turns are curves, and rocks
  // gently on the water. (The collision box is square, so turning never
  // changes what the loon hits.)
  animateLoon(paddling, time, delta) {
    if (paddling) {
      this.loon.play('loon-paddle', true);
    } else if (this.loon.anims.isPlaying) {
      this.loon.stop();
      this.loon.setTexture('loon-top-feet-in');
    }

    const velocity = this.loon.body.velocity;
    if (velocity.length() > 25) {
      this.heading = Phaser.Math.Angle.RotateTo(this.heading, velocity.angle(), (LOON_TURN_SPEED * delta) / 1000);
    }
    const rocking = Math.sin(time / 450) * 0.05;
    this.loon.rotation = this.heading + rocking;
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
