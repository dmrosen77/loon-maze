import * as Phaser from 'phaser';
import {
  TILE_SIZE,
  SPRITE_PIXEL_SIZE,
  WATER_DRIFT,
  FONT_FAMILY,
  TITLE_COLORS,
  TITLE_LOON_SPEED,
  TITLE_IDLE_MS,
} from '../config.js';
import { makePixelTexture, makeWaterTexture } from '../art/pixelArt.js';
import { startGlints, addFirefly } from '../art/lakeAmbience.js';
import { getLakeAudio } from '../audio.js';
import { isTouchDevice, addMuteButton } from '../ui/touch.js';
import { version } from '../../package.json';
import { hasPlayedLakes, continuePoint } from '../progress.js';
import loonBigUrl from '../assets/loon-big.png';
import babyLoonBigUrl from '../assets/baby-loon-big.png';
import reedsClumpUrl from '../assets/reeds-clump.png';
import lilyPadFlowerUrl from '../assets/lily-pad-flower.png';
import lilyPadUrl from '../assets/lily-pad.png';
import lilyPadSmallUrl from '../assets/lily-pad-small.png';

// Screen pixels per art pixel for the PNG sprites (made by tools/pixelize.py).
const ART_SCALE = 3;
// The chick is drawn a size down so it's about a third of its parent's length.
const CHICK_SCALE = 2;

// The loon swims back and forth along this line, turning around off-screen.
const LANE_Y = 380;
// How far past each edge of the screen it swims before turning around.
const LANE_OVERSHOOT = 260;
// Where the chick rides on its parent's back, and where the wake starts,
// relative to the parent's center (at ART_SCALE, facing right).
const CHICK_ON_BACK = { x: -25, y: -6 };
const PARENT_TAIL = -170;

// Draw order, back to front.
const DEPTH = { water: 0, glints: 1, pads: 2, wake: 3, loon: 4, reeds: 5, fireflies: 6, text: 10 };

const TEXT_STYLE = {
  fontFamily: `"${FONT_FAMILY}"`,
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 6,
};

// A moonlit lake seen from above: the loon swims back and forth with its
// chick riding on its back, reeds sway in the corners, lily pads bob, moonlight
// glitters and fireflies drift.
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  preload() {
    this.load.image('loon-big', loonBigUrl);
    this.load.image('baby-loon-big', babyLoonBigUrl);
    this.load.image('reeds-clump', reedsClumpUrl);
    this.load.image('lily-pad-flower', lilyPadFlowerUrl);
    this.load.image('lily-pad', lilyPadUrl);
    this.load.image('lily-pad-small', lilyPadSmallUrl);
  }

  create() {
    this.starting = false;
    this.audio = getLakeAudio(this);
    this.audio?.playMusic('title');

    for (const key of ['loon-big', 'baby-loon-big', 'reeds-clump', 'lily-pad-flower', 'lily-pad', 'lily-pad-small']) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    makeWaterTexture(this, TILE_SIZE, SPRITE_PIXEL_SIZE);
    makePixelTexture(this, 'wake-droplet', { palette: { w: '#f2fafe' }, rows: ['ww', 'ww'] }, SPRITE_PIXEL_SIZE);

    const { width, height } = this.scale;
    this.water = this.add
      .tileSprite(0, 0, width, height, 'water')
      .setOrigin(0)
      .setTileScale(2)
      .setTint(TITLE_COLORS.waterTint)
      .setDepth(DEPTH.water);

    this.startGlints();
    this.addLilyPads();
    this.addLoons();
    this.addReeds();
    this.addFireflies();
    this.drawTitle();
    this.drawPrompt();

    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.muteKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    addMuteButton(this, this.audio, this.scale.width - 12, 12);

    // A tap works like Enter (the first one inserts the coin), except on a button.
    this.tapped = false;
    this.input.on('pointerdown', (pointer, overObjects) => {
      if (overObjects.length === 0) this.tapped = true;
    });

    // On Android the first tap also goes full screen and holds the screen
    // sideways. iPhones don't allow web pages to do either; there, "Add to
    // Home Screen" gives full screen instead.
    if (isTouchDevice() && this.sys.game.device.fullscreen.available && !this.scale.isFullscreen) {
      this.input.once('pointerup', () => {
        this.scale.startFullscreen();
        this.scale.lockOrientation('landscape');
      });
    }

    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.startIdleTimer();
  }

  // Attract mode: if nobody presses a key or taps for TITLE_IDLE_MS, show the
  // high scores (which come back here on their own). Any input restarts the wait.
  startIdleTimer() {
    const restart = () => {
      this.idleTimer?.remove();
      this.idleTimer = this.time.delayedCall(TITLE_IDLE_MS, () => this.showHighScores());
    };
    restart();
    this.input.keyboard.on('keydown', restart);
    this.input.on('pointerdown', restart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard.off('keydown', restart));
  }

  showHighScores() {
    if (this.starting) return;
    this.starting = true; // Ignore Enter while fading out.
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('HighScoreScene', { attract: true });
    });
  }

  // Moonlight glittering on the water: brief flecks, mostly in a shimmering
  // column under the (off-screen) moon to the upper right.
  startGlints() {
    const { width, height } = this.scale;
    startGlints(
      this,
      () => {
        const inMoonPath = Math.random() < 0.6;
        const x = inMoonPath ? width * 0.77 + Phaser.Math.Between(-70, 70) : Phaser.Math.Between(0, width);
        return { x, y: Phaser.Math.Between(0, height), bright: inMoonPath };
      },
      { depth: DEPTH.glints },
    );
  }

  // Lily pads kept clear of the loon's lane, each gently turning and bobbing.
  addLilyPads() {
    // Across the screen as fractions of its width, so they spread out on wide
    // (phone) screens instead of bunching in the middle.
    const { width } = this.scale;
    const pads = [
      ['lily-pad-flower', 0.25, 250, 10],
      ['lily-pad', 0.775, 245, -25],
      ['lily-pad-small', 0.255, 500, 40],
      ['lily-pad-small', 0.75, 505, -60],
    ];
    pads.forEach(([key, across, y, angle], i) => {
      const x = width * across;
      const pad = this.add.image(x, y, key).setScale(ART_SCALE).setAngle(angle).setDepth(DEPTH.pads);
      this.tweens.add({
        targets: pad,
        angle: angle + 4,
        y: y + 3,
        duration: 2400 + i * 300,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    });
  }

  // The parent with the chick on its back, as one container so they move
  // together. Flipping the container turns them both around.
  addLoons() {
    const parent = this.add.image(0, 0, 'loon-big').setScale(ART_SCALE);
    const chick = this.add.image(CHICK_ON_BACK.x, CHICK_ON_BACK.y, 'baby-loon-big').setScale(CHICK_SCALE);
    this.loons = this.add.container(260, LANE_Y, [parent, chick]).setDepth(DEPTH.loon);
    this.swimDirection = 1;

    this.tweens.add({
      targets: this.loons,
      y: LANE_Y + 4,
      duration: 1100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this.wake = this.add
      .particles(0, 0, 'wake-droplet', {
        lifespan: { min: 700, max: 1300 },
        speed: { min: 15, max: 45 },
        angle: { onEmit: () => (this.swimDirection > 0 ? 180 : 0) + Phaser.Math.Between(-35, 35) },
        scale: { start: 1.5, end: 0.5 },
        alpha: { start: 0.8, end: 0 },
        emitting: false,
      })
      .setDepth(DEPTH.wake);
    this.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        const tailX = this.loons.x + PARENT_TAIL * this.swimDirection;
        this.wake.emitParticleAt(tailX, this.loons.y + Phaser.Math.Between(-25, 25), 1);
      },
    });
  }

  // A reed clump in each corner, partly off-screen, swaying in the breeze.
  // Different turns and flips keep the four from looking identical.
  addReeds() {
    const { width, height } = this.scale;
    const corners = [
      [30, 20, 0, false],
      [width - 20, 40, 90, true],
      [40, height - 10, 200, true],
      [width - 30, height - 20, 290, false],
    ];
    corners.forEach(([x, y, angle, flip], i) => {
      const clump = this.add
        .image(x, y, 'reeds-clump')
        .setScale(ART_SCALE)
        .setAngle(angle)
        .setFlipX(flip)
        .setDepth(DEPTH.reeds);
      this.tweens.add({
        targets: clump,
        angle: angle + 3,
        scale: ART_SCALE * 1.03,
        duration: 1800 + i * 250,
        delay: i * 400,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    });
  }

  // Fireflies blinking and wandering, mostly around the reeds.
  addFireflies() {
    const { width, height } = this.scale;
    const homes = [[90, 80], [width - 90, 90], [100, height - 80], [width - 100, height - 80]];
    for (let i = 0; i < 16; i++) {
      const [hx, hy] = homes[i % homes.length];
      addFirefly(this, hx, hy, { depth: DEPTH.fireflies, rangeX: 100, rangeY: 75 });
    }
  }

  // "LOON MAZE" with each letter bobbing in a wave.
  drawTitle() {
    const letters = [...'LOON MAZE'].map((char) =>
      this.add
        .text(0, 0, char, { ...TEXT_STYLE, fontSize: '64px', color: TITLE_COLORS.title })
        .setDepth(DEPTH.text),
    );
    const totalWidth = letters.reduce((sum, letter) => sum + letter.width, 0);
    let x = (this.scale.width - totalWidth) / 2;
    letters.forEach((letter, i) => {
      letter.setPosition(x, 140).setOrigin(0, 0.5);
      x += letter.width;
      this.tweens.add({
        targets: letter,
        y: 126,
        duration: 700,
        delay: i * 90,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    });
  }

  drawPrompt() {
    const { width, height } = this.scale;
    // Browsers block sound until the first key press, so ask for one first,
    // arcade style: any key "inserts a coin" (and turns the sound on).
    this.waitingForSound = Boolean(this.audio) && !this.audio.started;
    this.prompt = this.add
      .text(width / 2, 530, 'INSERT COIN', {
        ...TEXT_STYLE,
        fontSize: '22px',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.text)
      .setVisible(this.waitingForSound);
    this.menu = null;
    if (!this.waitingForSound) this.showMenu();

    // Classic arcade blink.
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => this.prompt.setVisible(this.waitingForSound && !this.prompt.visible),
    });

    this.add
      .text(width / 2, 578, isTouchDevice() ? 'DRAG ANYWHERE TO SWIM' : 'ARROWS: SWIM   M: MUTE', {
        ...TEXT_STYLE,
        fontSize: '12px',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.text);

    // Version from package.json, so it updates with each release.
    this.add
      .text(width - 10, height - 8, `v${version}`, { ...TEXT_STYLE, fontSize: '10px', strokeThickness: 4 })
      .setOrigin(1, 1)
      .setAlpha(0.8)
      .setDepth(DEPTH.text);
  }

  // The start menu, once the coin is in: CONTINUE (after LAKES has been
  // played), LAKES and ARCADE. Up/down and Enter, or tap one.
  showMenu() {
    const { width } = this.scale;
    const choices = [...(hasPlayedLakes() ? ['CONTINUE'] : []), 'LAKES', 'ARCADE'];
    const top = 515 - ((choices.length - 1) * 30) / 2;
    this.menu = choices.map((label, i) => {
      const item = this.add
        .text(width / 2, top + i * 30, label, { ...TEXT_STYLE, fontSize: '20px', strokeThickness: 5 })
        .setOrigin(0.5)
        .setDepth(DEPTH.text)
        .setInteractive({ useHandCursor: true });
      item.on('pointerdown', () => {
        this.chooseMenu(i);
        this.start();
      });
      item.label = label;
      return item;
    });
    this.chooseMenu(0);
  }

  chooseMenu(index) {
    this.menuIndex = Phaser.Math.Wrap(index, 0, this.menu.length);
    this.menu.forEach((item, i) => {
      const chosen = i === this.menuIndex;
      item.setText(chosen ? `> ${item.label} <` : item.label).setColor(chosen ? TITLE_COLORS.title : '#ffffff');
    });
  }

  start() {
    if (this.starting) return;
    this.starting = true;
    const choice = this.menu[this.menuIndex].label;
    this.audio?.startJingle();
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (choice === 'CONTINUE') {
        const { lake, number } = continuePoint();
        this.scene.start('LakeMapScene', { view: 'lake', lake, select: number });
      } else if (choice === 'LAKES') {
        this.scene.start('LakeMapScene', { view: 'lakes' });
      } else {
        this.scene.start('GameScene', { mode: 'arcade', level: 1 });
      }
    });
  }

  update(time, delta) {
    this.water.tilePositionX = Math.round((time / 1000) * WATER_DRIFT.x);
    this.water.tilePositionY = Math.round((time / 1000) * WATER_DRIFT.y);

    // Swim across, turning around once off-screen.
    this.loons.x += (this.swimDirection * TITLE_LOON_SPEED * delta) / 1000;
    const overshoot = this.loons.x > this.scale.width + LANE_OVERSHOOT || this.loons.x < -LANE_OVERSHOOT;
    if (overshoot) {
      this.swimDirection *= -1;
      this.loons.setScale(this.swimDirection, 1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      this.audio?.toggleMute();
    }

    // JustDown is read every frame so the key press that turns the sound on
    // doesn't also count as pressing Enter to start.
    const enterPressed = Phaser.Input.Keyboard.JustDown(this.enterKey) || this.tapped;
    this.tapped = false;
    if (this.waitingForSound) {
      if (this.audio.started) {
        this.waitingForSound = false;
        this.audio.coin();
        this.prompt.setVisible(false);
        this.showMenu();
      }
      return;
    }

    if (this.starting) return;
    if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.chooseMenu(this.menuIndex - 1);
      this.audio?.blip();
    }
    if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
      this.chooseMenu(this.menuIndex + 1);
      this.audio?.blip();
    }
    if (enterPressed) this.start();
  }
}
