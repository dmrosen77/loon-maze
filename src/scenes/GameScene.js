import * as Phaser from 'phaser';
import {
  TILE_SIZE,
  SPEED_BONUS_MAX,
  SPEED_BONUS_LOSS,
  LOON_SPEED,
  LOON_ACCELERATION,
  LOON_GLIDE_DRAG,
  LOON_FLOAT_DRIFT,
  LOON_BOUNCE,
  LOON_HIT_MIN_SPEED,
  CORNER_ASSIST_RANGE,
  CORNER_ASSIST_SPEED,
  LOON_STROKE_MS,
  LOON_TURN_SPEED,
  LOON_BODY_SIZE,
  LOON_MAX_HP,
  HIT_DAMAGE,
  LOON_INVULNERABLE_MS,
  RESTART_HP_COST,
  TURTLE_DAMAGE,
  TURTLE_KNOCKBACK,
  SPRITE_PIXEL_SIZE,
  REED_SWAY_SPEED,
  REED_GUST_SPACING,
  WATER_DRIFT,
  WAKE_INTERVAL_MS,
  WAKE_SPLASH,
  DIVE_SPEED_FACTOR,
  AIR_PER_DIVE_MS,
  AIR_REFILL,
  AIR_OUT_DAMAGE,
  DIVE_SHADOW_TINT,
  DIVE_SHADOW_ALPHA,
  DIVE_BUBBLE_MS,
  DAM_DIVE_SPEED_FACTOR,
  LOG_AIR_FACTOR,
  MAT_SPEED_FACTOR,
  FISH_POINTS,
  GOLDEN_FISH_HEAL,
  PAR_SECONDS_BASE,
  PAR_SECONDS_PER_TILE,
  FONT_FAMILY,
} from '../config.js';
import { LESSON_HINTS } from '../mazes/diveLesson.js';
import levelPlan from '../levelPlan.js';
import { recordLevel, isLakeUnlocked, markLessonDone, setLastPlayed, markDayCleared, restartPoint } from '../progress.js';
import { LAKES, TIMES_PER_DAY } from '../lakes.js';
import {
  LOON_TOP_FEET_OUT,
  LOON_TOP_FEET_IN,
  BABY_LOON_TOP,
  HEART,
  REED_TILE_VARIANTS,
  REED_SWAY_FRAMES,
  WATER_SIDE,
  reedTexture,
  rockTexture,
  damTexture,
  logTexture,
  LILY_PAD,
  makePixelTexture,
  makeWaterTexture,
} from '../art/pixelArt.js';
import { getLakeAudio } from '../audio.js';
import mazeInfo, { tileAt } from '../mazes/mazeInfo.js';
import assignTerrain from '../mazes/terrain.js';
import Lighting from '../game/Lighting.js';
import Decor from '../game/Decor.js';
import Fish from '../game/Fish.js';
import Pickups from '../game/Pickups.js';
import Turtles from '../game/Turtles.js';
import WanderingChick from '../game/WanderingChick.js';
import { ripple, popText, hitFlash, heartBurst } from '../game/effects.js';
import HpBar from '../ui/HpBar.js';
import AirBar from '../ui/AirBar.js';
import { TouchStick, addMuteButton, addDiveButton, isTouchDevice } from '../ui/touch.js';
import PadInput, { isGamepadConnected } from '../ui/gamepad.js';

const TEXT_STYLE = {
  fontFamily: `"${FONT_FAMILY}"`,
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 6,
  align: 'center',
  lineSpacing: 16,
};

// Which sides of a wall tile face open water (or the lake beyond the maze),
// as WATER_SIDE flags: those edges fray or crumble.
function waterSides(maze, col, row) {
  const isWater = (c, r) => maze[r]?.[c] === undefined || maze[r][c] !== '#';
  return (
    (isWater(col, row - 1) ? WATER_SIDE.N : 0) |
    (isWater(col + 1, row) ? WATER_SIDE.E : 0) |
    (isWater(col, row + 1) ? WATER_SIDE.S : 0) |
    (isWater(col - 1, row) ? WATER_SIDE.W : 0)
  );
}

// Layers, bottom to top. The time-of-day tint covers everything below it;
// night glows, pop-up effects and the HUD sit above it.
// How close (center to center, in pixels) the loon has to get to reach the chick.
const REUNITE_DISTANCE = 20;

const DEPTH = {
  water: 0,
  pads: 1,
  fish: 1.5,
  wake: 2,
  reeds: 3,
  ripples: 4,
  chick: 5,
  turtles: 5.5,
  loon: 6,
  bubbles: 7,
  critters: 8,
  tint: 9,
  glow: 9.5,
  effects: 9.6,
  flash: 9.8,
  hud: 10,
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // Started with one of (see levelPlan.js):
  // - { mode: 'arcade', level, hp, score }: HP and score carry over from the
  //   last level (via the reunion cutscene); a new game is level 1 with full
  //   HP and no score.
  // - { mode: 'lakes', lake, number, hp, notice }: one lake level, no score;
  //   HP carries over within a day (see ReunionScene), full from the map.
  // - { lesson: true, then, hp, score }: the dive lesson, which then starts
  //   `then` (another GameScene start), or goes back to the lake map if none.
  create(data = {}) {
    this.startData = data;
    this.plan = levelPlan(data);
    this.mode = this.plan.mode;
    this.level = this.plan.level;
    this.lesson = this.plan.lesson;
    this.canDive = this.plan.canDive;
    this.divesLeft = this.plan.dives;
    this.air = AIR_PER_DIVE_MS; // The current breath.
    this.diving = false;
    this.wantedDive = false; // Whether dive was held last frame, to catch new presses.
    this.nextBubbleTime = 0;
    this.airBar = null; // Only made on levels with diving.
    this.reunited = false;
    this.gameOver = false;
    this.leaving = false;
    this.hp = data.hp ?? LOON_MAX_HP; // Carried over in ARCADE and within a LAKES day.
    this.score = this.mode === 'lakes' ? 0 : (data.score ?? 0);
    if (this.mode === 'lakes') setLastPlayed(this.plan.lake, this.plan.number);
    this.invulnerableUntil = 0;
    this.hitsThisLevel = 0; // For the no-hit star.
    this.fishPoints = 0; // Points from fish this level, shown on the reunion screen.
    this.lastBumpTime = 0;
    this.nextStrokeTime = 0;
    this.nextWakeTime = 0;
    this.audio = getLakeAudio(this);
    this.audio?.playMusic('lake');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    // Set on the first frame: a restarted scene's clock still holds the time
    // from when the scene last ran until then.
    this.levelStartTime = null;

    const { maze } = this.plan;
    this.maze = maze; // Kept for corner assist and diving, which need to know where the walls are.
    this.info = mazeInfo(maze); // Open tiles, the path to the chick and so on, for placing things.
    // Rocks, beaver dams, logs and lily pad mats: picked with the plan's
    // random (seeded in LAKES mode), or laid out by hand in the dive lesson.
    this.terrain = assignTerrain(this.info, { layout: this.plan.layout, random: this.plan.random });
    const mazeWidth = maze[0].length * TILE_SIZE;
    const mazeHeight = maze.length * TILE_SIZE;

    this.createSprites();

    // The lake: the maze, or the whole screen if the maze is smaller.
    // Layering is set by DEPTH.
    const camera = this.cameras.main;
    const lakeWidth = Math.max(mazeWidth, camera.width);
    const lakeHeight = Math.max(mazeHeight, camera.height);
    const lake = new Phaser.Geom.Rectangle(
      (mazeWidth - lakeWidth) / 2,
      (mazeHeight - lakeHeight) / 2,
      lakeWidth,
      lakeHeight,
    );
    // Some times of day recolor the water itself.
    const { name, water } = this.plan.phase;
    const waterKey = water ? `water-${name}` : 'water';
    if (water) makeWaterTexture(this, TILE_SIZE, SPRITE_PIXEL_SIZE, { key: waterKey, palette: water });
    this.water = this.add.tileSprite(lake.x, lake.y, lake.width, lake.height, waterKey).setOrigin(0).setDepth(DEPTH.water);
    this.createWake();
    this.addMats();
    // The camera has to be on the loon's start before placing things "in view".
    camera.setBounds(lake.x, lake.y, lake.width, lake.height);

    const reeds = this.physics.add.staticGroup(); // Every wall the loon can dive under.
    const rocks = this.physics.add.staticGroup(); // Walls it can't.
    this.reedTiles = [];
    this.time.addEvent({ delay: 100, loop: true, callback: () => this.swayReeds() });
    let loonStart;
    let babyStart;

    maze.forEach((row, rowIndex) => {
      [...row].forEach((cell, colIndex) => {
        const x = colIndex * TILE_SIZE + TILE_SIZE / 2;
        const y = rowIndex * TILE_SIZE + TILE_SIZE / 2;
        if (cell === '#') {
          this.addWallTile(reeds, rocks, maze, colIndex, rowIndex, x, y);
        } else if (cell === 'P') {
          loonStart = { x, y };
        } else if (cell === 'B') {
          babyStart = { x, y };
        }
      });
    });

    this.createBubbles();

    // The chick faces roughly the way its parent will come from, snapped to
    // up/down/left/right since pixel art looks ragged at odd angles.
    this.baby = this.add.image(babyStart.x, babyStart.y, 'baby-loon-top').setDepth(DEPTH.chick);
    const towardParent = Phaser.Math.Angle.BetweenPoints(babyStart, loonStart);
    this.baby.rotation = Phaser.Math.Snap.To(towardParent, Math.PI / 2);

    // The bounds leave out the maze's outer ring of reeds, so a diving loon
    // can't swim under it to the edge of the lake.
    this.physics.world.setBounds(TILE_SIZE, TILE_SIZE, mazeWidth - 2 * TILE_SIZE, mazeHeight - 2 * TILE_SIZE);
    this.loon = this.add.sprite(loonStart.x, loonStart.y, 'loon-top-feet-in').setDepth(DEPTH.loon);
    this.physics.add.existing(this.loon);
    this.loon.body.setSize(LOON_BODY_SIZE, LOON_BODY_SIZE);
    this.loon.body.setCollideWorldBounds(true);
    this.loon.body.setBounce(LOON_BOUNCE);
    this.lastLoonX = loonStart.x;
    this.lastLoonY = loonStart.y;
    this.heading = 0; // Direction the loon faces, before the idle rocking.
    this.impactSpeed = 0; // Speed going into the latest physics step.

    // Diving switches the reeds' collider off.
    this.reedCollider = this.physics.add.collider(this.loon, reeds, this.bump, null, this);
    this.physics.add.collider(this.loon, rocks, this.bump, null, this); // Rocks go down to the lakebed.
    // Reaching the chick is a distance check in update() (it may be wandering).

    camera.startFollow(this.loon, true);
    camera.centerOn(loonStart.x, loonStart.y);

    this.decor = new Decor(this, this.info, {
      padDepth: DEPTH.pads,
      critterDepth: DEPTH.critters,
      pads: !this.lesson,
      onFrogSplash: (x, y) => {
        this.wake.emitParticleAt(x, y, 6);
        ripple(this, x, y, { depth: DEPTH.ripples, radius: 14 });
        this.audio?.ribbit();
      },
    });
    this.lighting = new Lighting(this, this.info, { phase: this.plan.phase, tintDepth: DEPTH.tint, glowDepth: DEPTH.glow });
    // Fish and the extra-dive bubble; the dive lesson has neither.
    this.fish = new Fish(this, this.info, {
      count: this.plan.fishCount,
      depth: DEPTH.fish,
      random: this.plan.random,
      onCatch: (x, y, golden) => this.catchFish(x, y, golden),
    });
    this.pickups = this.plan.bubbles
      ? new Pickups(this, this.info, {
          depth: DEPTH.pads + 0.2,
          random: this.plan.random,
          onGrab: (x, y) => this.grabDiveBubble(x, y),
        })
      : null;
    this.turtles = this.plan.turtles
      ? new Turtles(this, this.info, {
          count: this.plan.turtles,
          depth: DEPTH.turtles,
          random: this.plan.random,
          onBite: (turtle) => this.turtleBite(turtle),
        })
      : null;
    if (this.plan.chickWander) {
      new WanderingChick(this, this.baby, this.info, {
        radius: this.plan.chickWander,
        onMove: () => {
          if (this.cameras.main.worldView.contains(this.baby.x, this.baby.y)) this.audio?.peep();
        },
      });
    }
    this.showLevelText();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.muteKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.diveKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.stick = new TouchStick(this);
    this.pad = new PadInput();
    this.diveButton = this.canDive ? addDiveButton(this) : { held: false };
    const muteButton = addMuteButton(this, this.audio, this.scale.width - 12, 34);

    // Pausing: Esc or P, Start on a gamepad (see update()), or the II button
    // on touch screens. Leaving the tab or app pauses too.
    for (const key of ['ESC', 'P']) {
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[key]).on('down', () => this.openPause());
    }
    if (muteButton) this.addPauseButton(muteButton);
    this.game.events.on(Phaser.Core.Events.BLUR, this.openPause, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.openPause, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.openPause, this);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.openPause, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    });
  }

  // Whether this level ends (or quits) on the lake map rather than in the arcade run.
  leadsToMap() {
    return this.mode === 'lakes' || (this.lesson && this.startData.then?.mode !== 'arcade');
  }

  // A small pause button beside SOUND on touch screens.
  addPauseButton(muteButton) {
    const button = this.add
      .text(muteButton.x - muteButton.width - 8, muteButton.y, 'II', {
        fontFamily: `"${FONT_FAMILY}"`,
        fontSize: '12px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => this.openPause());
  }

  // Freezes the level (physics, timers, tweens) under the pause menu.
  openPause() {
    if (this.reunited || this.gameOver || this.leaving || !this.scene.isActive()) return;
    this.pausedAt = this.game.loop.time;
    const cost = this.lesson ? 0 : RESTART_HP_COST;
    this.scene.launch('PauseScene', {
      restartCost: cost,
      canRestart: this.hp > cost,
      quitLabel: this.leadsToMap() ? 'QUIT TO MAP' : 'QUIT TO TITLE',
    });
    this.scene.pause();
    this.audio?.blip();
  }

  // Paused time doesn't count: the level timer (speed bonus, par) and the
  // post-hit blinking pick up where they left off.
  onResume() {
    const paused = this.game.loop.time - this.pausedAt;
    if (this.levelStartTime !== null) this.levelStartTime += paused;
    this.invulnerableUntil += paused;
  }

  // From the pause menu: the level again from the start, for RESTART_HP_COST
  // HP (free in the lesson). HP is never refilled, and points from this
  // attempt's fish are taken back.
  restartLevel() {
    const data = { ...this.startData };
    if (!this.lesson) data.hp = this.hp - RESTART_HP_COST;
    if (this.mode === 'arcade') data.score = this.startData.score ?? 0;
    this.scene.restart(data);
  }

  // From the pause menu: back to the lake map (the day's run ends), or in
  // ARCADE back to the title (the run is abandoned, with no score).
  quit() {
    if (this.leadsToMap()) {
      this.quitToMap();
      return;
    }
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('TitleScene'));
  }

  quitToMap() {
    if (this.reunited || this.gameOver || this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const lake = this.plan.lake ?? this.startData.then?.lake ?? 1;
      const select = this.plan.number ? restartPoint(lake, this.plan.number) : 1;
      this.scene.start('LakeMapScene', { view: 'lake', lake, select });
    });
  }

  // Textures and the paddling animation are global, so they're only made once.
  createSprites() {
    makePixelTexture(this, 'loon-top-feet-out', LOON_TOP_FEET_OUT, SPRITE_PIXEL_SIZE);
    makePixelTexture(this, 'loon-top-feet-in', LOON_TOP_FEET_IN, SPRITE_PIXEL_SIZE);
    makePixelTexture(this, 'baby-loon-top', BABY_LOON_TOP, SPRITE_PIXEL_SIZE);
    makeWaterTexture(this, TILE_SIZE, SPRITE_PIXEL_SIZE);
    makePixelTexture(this, 'heart-small', HEART, SPRITE_PIXEL_SIZE);
    makePixelTexture(this, 'bubble', { palette: { w: '#d8f1ff' }, rows: ['.w.', 'w.w', '.w.'] }, SPRITE_PIXEL_SIZE);
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

  // A wall tile: reeds, or one of the special walls the terrain picked. Rocks
  // go in their own group, since they block the loon even when it dives.
  addWallTile(reeds, rocks, maze, col, row, x, y) {
    const kind = this.terrain.wallKind(col, row);
    if (kind === 'reeds') {
      this.addReedTile(reeds, maze, col, row, x, y);
      return;
    }
    const variant = Phaser.Math.Between(0, 3);
    const sides = waterSides(maze, col, row);
    const texture =
      kind === 'rock'
        ? rockTexture(this, variant, sides, TILE_SIZE, SPRITE_PIXEL_SIZE)
        : kind === 'dam'
          ? damTexture(this, variant, sides, TILE_SIZE, SPRITE_PIXEL_SIZE)
          : logTexture(this, variant, this.terrain.logAcross(col, row), TILE_SIZE, SPRITE_PIXEL_SIZE);
    const image = this.add.image(x, y, texture).setDepth(DEPTH.reeds);
    (kind === 'rock' ? rocks : reeds).add(image);
  }

  // Lily pad mats: a tile covered in overlapping pads. They slow the loon on
  // the surface (see swim()).
  addMats() {
    makePixelTexture(this, 'lily-pad-top', LILY_PAD, SPRITE_PIXEL_SIZE);
    const turns = [0, 90, 180, 270];
    for (const { col, row } of this.info.open) {
      if (!this.terrain.isMat(col, row)) continue;
      for (let i = 0; i < 6; i++) {
        this.add
          .image(
            col * TILE_SIZE + Phaser.Math.Between(8, TILE_SIZE - 8),
            row * TILE_SIZE + Phaser.Math.Between(8, TILE_SIZE - 8),
            'lily-pad-top',
          )
          .setAngle(Phaser.Utils.Array.GetRandom(turns))
          .setScale(Phaser.Math.FloatBetween(0.8, 1.1))
          .setDepth(DEPTH.pads - 0.1);
      }
    }
  }

  // A random variation of reeds, with frayed edges on the sides that face
  // water. All its sway frames are made up front so animating never stalls.
  addReedTile(reeds, maze, col, row, x, y) {
    const sides = waterSides(maze, col, row);
    const variant = Phaser.Math.Between(0, REED_TILE_VARIANTS - 1);
    const frames = [];
    for (let frame = 0; frame < REED_SWAY_FRAMES; frame++) {
      frames.push(reedTexture(this, variant, sides, frame, TILE_SIZE, SPRITE_PIXEL_SIZE));
    }

    const upright = 1;
    const image = this.add.image(x, y, frames[upright]).setDepth(DEPTH.reeds);
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
    }).setDepth(DEPTH.wake);
  }

  // Bubbles rising from the diving loon: each swells a little and pops. They
  // show over the reeds while the loon is underneath.
  createBubbles() {
    this.bubbles = this.add.particles(0, 0, 'bubble', {
      lifespan: { min: 400, max: 800 },
      speed: { min: 2, max: 10 },
      scale: { start: 0.8, end: 1.5 },
      alpha: { start: 0.9, end: 0 },
      emitting: false,
    }).setDepth(DEPTH.bubbles);
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
      .text(12, 8, this.plan.label, { ...TEXT_STYLE, fontSize: '16px', strokeThickness: 4 })
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.hpBar = new HpBar(this, 12, 40, { width: 160, height: 12, max: LOON_MAX_HP, value: this.hp });
    if (this.canDive) {
      this.airBar = new AirBar(this, 12, 60, this.hpBar.right - 160, {
        width: 80,
        height: 12,
        max: AIR_PER_DIVE_MS,
        dives: this.lesson ? null : this.plan.dives,
      });
    }
    if (this.lesson) this.showLessonHints();
    this.scoreText = this.add
      .text(this.scale.width - 12, 8, `SCORE ${this.score}`, { ...TEXT_STYLE, fontSize: '16px', strokeThickness: 4 })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);

    const { width, height } = this.scale;
    const banner = this.add
      .text(width / 2, height / 2, this.plan.bannerTitle, { ...TEXT_STYLE, fontSize: this.mode === 'lakes' ? '36px' : '48px' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    const timeOfDay = this.add
      .text(width / 2, height / 2 + 42, this.plan.bannerSubtitle, { ...TEXT_STYLE, fontSize: '16px', strokeThickness: 4 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.tweens.add({
      targets: [banner, timeOfDay],
      alpha: 0,
      delay: 800,
      duration: 700,
      onComplete: () => {
        banner.destroy();
        timeOfDay.destroy();
      },
    });

    // News for this level, under the banner.
    this.showCallouts(this.plan.callouts);
  }

  // Points during a level, shown in the corner right away.
  addScore(points) {
    this.score += points;
    this.scoreText.setText(`SCORE ${this.score}`);
  }

  catchFish(x, y, golden) {
    this.audio?.chomp();
    this.wake.emitParticleAt(x, y, 5);
    ripple(this, x, y, { depth: DEPTH.ripples, radius: 12 });
    if (golden) {
      const healed = Math.min(LOON_MAX_HP, this.hp + GOLDEN_FISH_HEAL) - this.hp;
      this.hp += healed;
      this.hpBar.setValue(this.hp);
      this.audio?.heal();
      popText(this, x, y, healed > 0 ? `+${healed} HP` : 'HP FULL', { depth: DEPTH.effects, color: '#ffd54f' });
    } else {
      this.fishPoints += FISH_POINTS;
      this.addScore(FISH_POINTS);
      popText(this, x, y, `+${FISH_POINTS}`, { depth: DEPTH.effects });
    }
  }

  // A snapping turtle bit the loon (on the surface): a snap, a knockback away
  // from the turtle, and TURTLE_DAMAGE HP, unless it's still blinking from a hit.
  turtleBite(turtle) {
    const now = this.time.now;
    if (this.reunited || this.gameOver || now < this.invulnerableUntil) return;
    this.audio?.snap();
    const away = Phaser.Math.Angle.Between(turtle.x, turtle.y, this.loon.x, this.loon.y);
    this.loon.body.velocity.setToPolar(away, TURTLE_KNOCKBACK);
    ripple(this, this.loon.x, this.loon.y, { depth: DEPTH.ripples, radius: 18 });
    popText(this, this.loon.x, this.loon.y - 16, 'SNAP!', { depth: DEPTH.effects, color: '#ff6a6a' });
    this.takeDamage(now, TURTLE_DAMAGE);
  }

  // An extra dive for this level.
  grabDiveBubble(x, y) {
    this.divesLeft += 1;
    this.airBar.addDive();
    this.airBar.setDivesLeft(this.divesLeft);
    this.audio?.coin();
    ripple(this, x, y, { depth: DEPTH.ripples, color: 0xbfe6ff, radius: 24 });
    popText(this, x, y, '+1 DIVE', { depth: DEPTH.effects, color: '#4fb3ff' });
  }

  // Blue lines of news under the level banner, lingering a little longer.
  showCallouts(lines) {
    if (lines.length === 0) return;
    const { width, height } = this.scale;
    this.audio?.heal();
    lines.forEach((line, i) => {
      const callout = this.add
        .text(width / 2, height / 2 + 80 + i * 32, line, { ...TEXT_STYLE, fontSize: '20px', color: '#4fb3ff' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
      this.tweens.add({
        targets: callout,
        alpha: 0,
        delay: 1600,
        duration: 700,
        onComplete: () => callout.destroy(),
      });
    });
  }

  // The lesson's hint along the bottom of the screen, which changes as the
  // loon reaches each room (see updateLessonHint()).
  showLessonHints() {
    const { width, height } = this.scale;
    this.lessonHint = this.add
      .text(width / 2, height - 76, '', { ...TEXT_STYLE, fontSize: '14px', strokeThickness: 4 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.lessonHintIndex = -1;
    this.updateLessonHint();
  }

  updateLessonHint() {
    const { col } = tileAt(this.loon.x, this.loon.y);
    const index = LESSON_HINTS.findLastIndex((hint) => col >= hint.fromCol);
    if (index === this.lessonHintIndex) return;
    this.lessonHintIndex = index;
    const diveName = isGamepadConnected() ? 'A' : isTouchDevice() ? 'DIVE' : 'SPACE';
    const text = LESSON_HINTS[index].text.replace('{DIVE}', diveName);
    this.lessonHint.setText(text).setAlpha(0);
    this.tweens.add({ targets: this.lessonHint, alpha: 1, duration: 300 });
    if (index > 0) this.audio?.blip(7);
  }

  // The collider fires every frame while pushing into reeds, so only count a
  // hit when the loon first touches them, not continuously. Gentle nudges
  // (drifting, easing along a wall) are harmless; only real impacts thud and
  // cost HP.
  bump() {
    const now = this.time.now;
    // Underwater only rocks can be hit: a muffled bonk, no damage.
    if (this.diving) {
      if (now - this.lastBumpTime > 300) this.audio?.bump();
      this.lastBumpTime = now;
      return;
    }
    if (now - this.lastBumpTime > 200 && this.impactSpeed >= LOON_HIT_MIN_SPEED) {
      this.audio?.bump();
      ripple(this, this.loon.x, this.loon.y, { depth: DEPTH.ripples, radius: 16 });
      if (!this.lesson) this.takeDamage(now); // The dive lesson is for practice: no damage.
    }
    this.lastBumpTime = now;
  }

  // `force` hurts even while the loon is still blinking from the last hit.
  takeDamage(now, amount = HIT_DAMAGE, force = false) {
    if (this.reunited || this.gameOver || (now < this.invulnerableUntil && !force)) return;
    this.tweens.killTweensOf(this.loon);
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = now + LOON_INVULNERABLE_MS;
    this.hitsThisLevel += 1;
    this.hpBar.setValue(this.hp);
    this.cameras.main.shake(120, 0.006);
    hitFlash(this, { depth: DEPTH.flash });

    if (this.hp <= 0) {
      this.loseGame();
      return;
    }

    this.audio?.hurt();
    // Flash red, then blink until the loon can be hurt again.
    this.loon.setTint(0xff6060);
    this.time.delayedCall(150, () => {
      if (!this.diving) this.loon.clearTint();
    });
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
        this.scene.start('GameOverScene', {
          level: this.level,
          score: this.score,
          mode: this.leadsToMap() ? 'lakes' : 'arcade',
          lake: this.plan.lake ?? this.startData.then?.lake ?? 1,
          number: this.plan.number ?? 1,
        });
      });
    });
  }

  reunite() {
    if (this.reunited || this.gameOver) return;
    this.reunited = true;
    if (this.lesson) {
      this.finishLesson();
      return;
    }

    // Level points, plus a bonus for finishing quickly.
    const seconds = (this.time.now - this.levelStartTime) / 1000;
    const { levelPoints } = this.plan;
    const speedBonus = Math.max(0, Math.round(SPEED_BONUS_MAX - seconds * SPEED_BONUS_LOSS));
    // Stars: one for finishing, two for beating par, three for doing it without a hit.
    const par = PAR_SECONDS_BASE + this.info.pathLength * PAR_SECONDS_PER_TILE;
    const stars = seconds > par ? 1 : this.hitsThisLevel > 0 ? 2 : 3;
    this.loon.body.setVelocity(0, 0);
    this.loon.stop();
    heartBurst(this, this.baby.x, this.baby.y, 'heart-small', { depth: DEPTH.effects });
    ripple(this, this.baby.x, this.baby.y, { depth: DEPTH.ripples, radius: 28, duration: 800 });

    // A beat to see the two touch, then fade into the reunion cutscene, which
    // starts the next level when it's done.
    this.time.delayedCall(400, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        const total = this.score + levelPoints + speedBonus;
        const reunion = {
          mode: this.mode,
          level: this.level,
          hp: this.hp,
          score: total,
          levelPoints,
          speedBonus,
          fishPoints: this.fishPoints,
          stars,
        };
        if (this.mode === 'lakes') {
          // Save the result, and notice if it just opened the next lake.
          const { lake, number } = this.plan;
          const nextLake = lake + 1 < LAKES.length ? lake + 1 : null;
          const wasOpen = nextLake !== null && isLakeUnlocked(nextLake);
          const best = recordLevel(lake, number, { stars, score: total });
          // Winning Night means the whole day was survived in one run (a day's
          // later levels can't be picked on the map until it has been).
          const dayCleared = number % TIMES_PER_DAY === 0;
          if (dayCleared) markDayCleared(lake, number / TIMES_PER_DAY - 1);
          Object.assign(reunion, {
            lake,
            number,
            title: `${this.plan.bannerTitle.toUpperCase()}`,
            subtitle: `${this.plan.bannerSubtitle.toUpperCase()} COMPLETE`,
            newBest: best.newBestScore || best.newBestStars,
            unlockedLake: nextLake !== null && !wasOpen && isLakeUnlocked(nextLake) ? nextLake : null,
          });
        }
        this.scene.start('ReunionScene', reunion);
      });
    });
  }

  // The lesson has no points or cutscene: a cheer, then the real level.
  // Finishing the lesson marks it done (so it isn't shown again), then starts
  // the level it came before, or goes back to the lake map (a replay from there).
  finishLesson() {
    markLessonDone();
    this.loon.body.setVelocity(0, 0);
    this.loon.stop();
    this.audio?.heal();
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'YOU CAN DIVE!', { ...TEXT_STYLE, fontSize: '36px', color: '#4fb3ff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.time.delayedCall(1600, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        const { then } = this.startData;
        if (then) this.scene.start('GameScene', then);
        else this.scene.start('LakeMapScene', { view: 'lake', lake: 1 });
      });
    });
  }

  // Diving. A new press of Space (or DIVE), with a dive left this level and a
  // full breath, takes the loon under; letting go brings it back up, but only
  // once it's clear of the reeds. Out of air in open water, it just surfaces;
  // out of air under the reeds, it pops back up where it dove, gasping (and
  // losing HP, except in the lesson). On the surface the breath refills while
  // there are dives left.
  updateDive(time, delta) {
    if (!this.canDive) return;
    const wantsDive = this.diveKey.isDown || this.diveButton.held || this.pad.diveHeld;
    const pressed = wantsDive && !this.wantedDive;
    this.wantedDive = wantsDive;

    if (!this.diving) {
      if (this.divesLeft > 0) this.air = Math.min(AIR_PER_DIVE_MS, this.air + delta * AIR_REFILL);
      if (pressed && this.divesLeft > 0 && this.air >= AIR_PER_DIVE_MS) this.startDive();
    } else {
      this.air = Math.max(0, this.air - delta * (this.wallsOverhead() === 'log' ? LOG_AIR_FACTOR : 1));
      const underReeds = this.isUnderReeds();
      if (this.air <= 0) {
        if (underReeds) this.popBack(time);
        else this.surface();
      } else if (!wantsDive && !underReeds) {
        this.surface();
      } else if (time >= this.nextBubbleTime) {
        this.bubbles.emitParticleAt(this.loon.x + Phaser.Math.Between(-6, 6), this.loon.y + Phaser.Math.Between(-6, 6), 1);
        this.nextBubbleTime = time + DIVE_BUBBLE_MS;
      }
    }
    this.airBar.setValue(this.air);
  }

  // Whether any part of the loon's collision box is over a reed tile.
  isUnderReeds() {
    return this.wallsOverhead() !== null;
  }

  // What the diving loon is under: null (open water), or the slowest kind of
  // wall its collision box overlaps: 'dam', then 'reeds', then 'log' (so a
  // log's air saving only counts when the loon is under nothing but logs).
  wallsOverhead() {
    const { x, y, width, height } = this.loon.body;
    let overhead = null;
    const rank = { log: 1, reeds: 2, dam: 3 };
    for (let row = Math.floor(y / TILE_SIZE); row <= Math.floor((y + height - 1) / TILE_SIZE); row++) {
      for (let col = Math.floor(x / TILE_SIZE); col <= Math.floor((x + width - 1) / TILE_SIZE); col++) {
        if (this.maze[row]?.[col] !== '#') continue;
        const kind = this.terrain.wallKind(col, row);
        if (!overhead || rank[kind] > rank[overhead]) overhead = kind;
      }
    }
    return overhead;
  }

  startDive() {
    this.diving = true;
    this.divesLeft -= 1;
    this.airBar.setDivesLeft(this.divesLeft);
    this.diveStart = { x: this.loon.x, y: this.loon.y };
    this.reedCollider.active = false;
    this.tweens.killTweensOf(this.loon); // Any blinking from a hit.
    this.loon.setTint(DIVE_SHADOW_TINT).setAlpha(DIVE_SHADOW_ALPHA).setScale(0.9);
    this.wake.emitParticleAt(this.loon.x, this.loon.y, 8);
    ripple(this, this.loon.x, this.loon.y, { depth: DEPTH.ripples });
    this.audio?.dive();
  }

  surface() {
    this.diving = false;
    if (this.divesLeft === 0) this.air = 0; // No more dives this level.
    this.reedCollider.active = true;
    this.loon.clearTint().setAlpha(1).setScale(1);
    this.wake.emitParticleAt(this.loon.x, this.loon.y, 8);
    ripple(this, this.loon.x, this.loon.y, { depth: DEPTH.ripples });
    this.audio?.surface();
  }

  popBack(time) {
    this.loon.body.reset(this.diveStart.x, this.diveStart.y);
    this.lastLoonX = this.diveStart.x;
    this.lastLoonY = this.diveStart.y;
    this.surface();
    this.audio?.gasp();
    if (!this.lesson) this.takeDamage(time, AIR_OUT_DAMAGE, true);
  }

  update(time, delta) {
    this.levelStartTime ??= time;
    this.pad.update(time);
    if (Phaser.Input.Keyboard.JustDown(this.muteKey) || this.pad.mute) {
      this.audio?.toggleMute();
    }
    if (this.pad.start) this.openPause();

    // Whole pixels only, so the pixel art doesn't shimmer as it drifts.
    this.water.tilePositionX = Math.round((time / 1000) * WATER_DRIFT.x);
    this.water.tilePositionY = Math.round((time / 1000) * WATER_DRIFT.y);
    this.decor.update(this.loon);
    if (this.lesson && !this.reunited) this.updateLessonHint();
    if (!this.reunited && !this.gameOver) {
      // The chick is reached on the surface, when the two are touching.
      if (!this.diving && Phaser.Math.Distance.Between(this.loon.x, this.loon.y, this.baby.x, this.baby.y) < REUNITE_DISTANCE) {
        this.reunite();
      }
      this.fish.update(this.loon);
      this.turtles?.update(this.loon, this.diving, time);
      this.pickups?.update(this.loon);
    }

    if (this.gameOver || this.reunited) return;

    // Arrow keys, or the touch joystick (whose drag distance sets how hard the
    // loon paddles).
    const { left, right, up, down } = this.cursors;
    let input = new Phaser.Math.Vector2(
      (right.isDown ? 1 : 0) - (left.isDown ? 1 : 0),
      (down.isDown ? 1 : 0) - (up.isDown ? 1 : 0),
    ).normalize(); // So diagonals aren't faster than straight lines.
    if (input.lengthSq() === 0) input = this.stick.vector.clone();
    if (input.lengthSq() === 0) input = this.pad.stick();
    const paddling = input.lengthSq() > 0;

    this.updateDive(time, delta);
    if (this.gameOver) return;
    this.swim(input, paddling, delta);
    if (paddling && !this.diving) this.assistCorners(input, delta);
    this.animateLoon(paddling, time, delta);

    // Actual speed, from how far the loon really moved since last frame (after
    // the reeds pushed it back, so pushing against a wall counts as still).
    const { x, y } = this.loon;
    const speed = (Math.hypot(x - this.lastLoonX, y - this.lastLoonY) * 1000) / delta;
    this.lastLoonX = x;
    this.lastLoonY = y;
    if (speed < 30 || this.diving) return; // Floating along with the current, or underwater: no wake.

    if (paddling) this.paddle(time);
    if (time >= this.nextWakeTime) {
      const tail = this.pointBehindLoon(22);
      this.wake.emitParticleAt(tail.x, tail.y, 2);
      this.nextWakeTime = time + WAKE_INTERVAL_MS;
    }
  }

  // Corner assist. When swimming straight up, down, left or right toward an
  // opening the loon is too far off-center to fit through (its body would
  // clip the corner), ease it sideways just enough to fit. It only nudges
  // when needed and blends into the loon's momentum rather than replacing
  // it, so swimming stays smooth. Deliberately diagonal input is left alone.
  assistCorners(input, delta) {
    if (CORNER_ASSIST_RANGE <= 0) return;
    const horizontal = Math.abs(input.x) > 0.8 && Math.abs(input.y) < 0.45;
    const vertical = Math.abs(input.y) > 0.8 && Math.abs(input.x) < 0.45;
    if (!horizontal && !vertical) return;

    // "Along" is the swimming direction; "across" is the sideways axis we nudge.
    const along = horizontal ? 'x' : 'y';
    const across = horizontal ? 'y' : 'x';
    const step = Math.sign(input[along]);
    const position = { x: this.loon.x, y: this.loon.y };
    const tile = { x: Math.floor(position.x / TILE_SIZE), y: Math.floor(position.y / TILE_SIZE) };
    const centerOf = (index) => index * TILE_SIZE + TILE_SIZE / 2;
    const openAhead = (acrossIndex) => {
      const ahead = { ...tile, [across]: acrossIndex };
      ahead[along] += step;
      return this.maze[ahead.y]?.[ahead.x] !== undefined && this.maze[ahead.y][ahead.x] !== '#';
    };

    // The lane to enter: the loon's own if it's open ahead, otherwise the
    // neighboring one on the side it's leaning toward, if close enough.
    const offset = position[across] - centerOf(tile[across]);
    let lane = null;
    if (openAhead(tile[across])) {
      lane = tile[across];
    } else if (offset !== 0) {
      const neighbor = tile[across] + Math.sign(offset);
      if (openAhead(neighbor) && Math.abs(position[across] - centerOf(neighbor)) <= CORNER_ASSIST_RANGE) {
        lane = neighbor;
      }
    }
    if (lane === null) return;

    // How far outside the room it has to fit. Inside it, no nudge at all.
    const room = (TILE_SIZE - LOON_BODY_SIZE) / 2 - 1;
    const gap = centerOf(lane) - position[across];
    const excess = Math.abs(gap) - room;
    if (excess <= 0) return;

    // Ease the sideways speed toward a gentle slide that slows as it arrives.
    const velocity = this.loon.body.velocity;
    const desired = Math.sign(gap) * Math.min(CORNER_ASSIST_SPEED, excess * 8);
    const maxChange = (LOON_ACCELERATION * delta) / 1000;
    velocity[across] += Phaser.Math.Clamp(desired - velocity[across], -maxChange, maxChange);
  }

  // Swimming physics. The velocity eases toward a target instead of jumping to
  // it: full speed in the held direction while paddling, or the gentle lake
  // current when not, so the loon speeds up, glides to a stop, curves through
  // turns, and then floats. The body's velocity already includes any bounce
  // off the reeds from the last physics step, so bounces carry through.
  swim(input, paddling, delta) {
    const velocity = this.loon.body.velocity;
    const target = paddling
      ? input.clone().scale(LOON_SPEED * this.speedFactor())
      : new Phaser.Math.Vector2(WATER_DRIFT.x, WATER_DRIFT.y).scale(LOON_FLOAT_DRIFT);
    const maxChange = ((paddling ? LOON_ACCELERATION : LOON_GLIDE_DRAG) * delta) / 1000;
    const change = target.subtract(velocity);
    if (change.length() > maxChange) change.setLength(maxChange);
    velocity.add(change);
    this.impactSpeed = velocity.length();
  }

  // How fast the loon can swim here, as a fraction of LOON_SPEED: slower
  // underwater, slower still through a beaver dam, and slow over lily pad mats.
  speedFactor() {
    if (this.diving) return DIVE_SPEED_FACTOR * (this.wallsOverhead() === 'dam' ? DAM_DIVE_SPEED_FACTOR : 1);
    const { col, row } = tileAt(this.loon.x, this.loon.y);
    return this.terrain.isMat(col, row) ? MAT_SPEED_FACTOR : 1;
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
