import * as Phaser from 'phaser';
import { TILE_SIZE, SPRITE_PIXEL_SIZE, WATER_DRIFT, FONT_FAMILY } from '../config.js';
import { makePixelTexture, makeWaterTexture } from '../art/pixelArt.js';
import { getLakeAudio } from '../audio.js';
import loonBigUrl from '../assets/loon-big.png';
import eagleForwardUrl from '../assets/eagle-wings-forward.png';
import eagleBackUrl from '../assets/eagle-wings-back.png';

// Screen pixels per art pixel. The eagle and loon images come from
// art-source/ via tools/pixelize.py.
const LOON_SCALE = 3;
const EAGLE_SCALE = 4;

const LOON_SPOT = { x: 440, y: 350 };
// Light comes from the upper left, so shadows fall down and to the right,
// further the higher the eagle is.
const SHADOW_OFFSET = { x: 70, y: 90 };

const TEXT_STYLE = {
  fontFamily: `"${FONT_FAMILY}"`,
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 6,
};

// Played when the loon runs out of HP: a bald eagle swoops down and carries
// it off. Enter goes back to the title screen.
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  preload() {
    this.load.image('loon-big', loonBigUrl);
    this.load.image('eagle-wings-forward', eagleForwardUrl);
    this.load.image('eagle-wings-back', eagleBackUrl);
  }

  // Two frames cut from one generated image: wings reaching forward, then
  // swept back. Alternating them makes the wingbeat.
  createEagleArt() {
    for (const key of ['loon-big', 'eagle-wings-forward', 'eagle-wings-back']) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    if (!this.anims.exists('eagle-flap')) {
      this.anims.create({
        key: 'eagle-flap',
        frames: [{ key: 'eagle-wings-forward' }, { key: 'eagle-wings-back' }],
        frameRate: 5,
        repeat: -1,
      });
    }
  }

  create(data) {
    this.level = data.level;
    this.canLeave = false;
    this.leaving = false;
    this.carrier = null;
    this.audio = getLakeAudio(this);
    this.audio?.stopMusic();

    this.createEagleArt();
    makeWaterTexture(this, TILE_SIZE, SPRITE_PIXEL_SIZE);
    makePixelTexture(this, 'wake-droplet', { palette: { w: '#f2fafe' }, rows: ['ww', 'ww'] }, SPRITE_PIXEL_SIZE);
    makePixelTexture(this, 'feather', { palette: { B: '#4a3322', b: '#6b4b32' }, rows: ['BBb'] }, EAGLE_SCALE);

    const { width, height } = this.scale;
    // The same lake as the reunion cutscene, but darker and colder.
    this.water = this.add
      .tileSprite(0, 0, width, height, 'water')
      .setOrigin(0)
      .setTileScale(2)
      .setTint(0x6878a0);

    this.loon = this.add.image(LOON_SPOT.x, LOON_SPOT.y, 'loon-big').setScale(LOON_SCALE);
    this.tweens.add({
      targets: this.loon,
      y: LOON_SPOT.y + 4,
      duration: 900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this.eagleShadow = this.add
      .sprite(0, 0, 'eagle-wings-back')
      .setTint(0x000000)
      .setAlpha(0.35)
      .setVisible(false);
    this.eagle = this.add.sprite(width + 300, 120, 'eagle-wings-back').setVisible(false);
    this.eagle.on(Phaser.Animations.Events.ANIMATION_REPEAT, () => this.audio?.wingFlap());

    this.splash = this.add.particles(0, 0, 'wake-droplet', {
      lifespan: { min: 500, max: 1000 },
      speed: { min: 60, max: 170 },
      angle: { min: 0, max: 360 },
      scale: { start: 2, end: 0.5 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    this.feathers = this.add.particles(0, 0, 'feather', {
      lifespan: 2600,
      speed: { min: 20, max: 70 },
      angle: { min: 0, max: 360 },
      gravityY: 25,
      rotate: { start: 0, end: 360 },
      alpha: { start: 1, end: 0, ease: 'Cubic.easeIn' },
      emitting: false,
    });

    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.time.delayedCall(700, () => this.alert());
    this.time.delayedCall(1300, () => this.swoopIn());
  }

  // A red "!" pops up over the loon.
  alert() {
    const mark = this.add
      .text(LOON_SPOT.x + 120, LOON_SPOT.y - 110, '!', { ...TEXT_STYLE, fontSize: '48px', color: '#e8475f' })
      .setOrigin(0.5)
      .setScale(0);
    this.tweens.add({ targets: mark, scale: 1, duration: 250, ease: 'Back.easeOut' });
    this.tweens.add({ targets: mark, alpha: 0, delay: 1300, duration: 300 });
  }

  // The eagle dives in from the upper right with its wings swept back,
  // growing as it drops toward the camera, and pulls up right over the loon.
  swoopIn() {
    this.audio?.screech();
    const start = { x: this.scale.width + 250, y: 60 };
    const hover = { x: LOON_SPOT.x - 20, y: LOON_SPOT.y - 10 };
    this.eagle
      .setPosition(start.x, start.y)
      .setScale(EAGLE_SCALE * 0.7)
      .setRotation(Phaser.Math.Angle.BetweenPoints(start, hover))
      .setVisible(true);
    this.eagleShadow.setVisible(true);

    this.tweens.add({
      targets: this.eagle,
      x: hover.x,
      y: hover.y,
      scale: EAGLE_SCALE,
      duration: 1300,
      ease: 'Cubic.easeOut',
      onComplete: () => this.grab(),
    });
  }

  // Splash, feathers, and the loon is snatched up.
  grab() {
    this.cameras.main.shake(250, 0.012);
    this.splash.emitParticleAt(LOON_SPOT.x, LOON_SPOT.y, 30);
    this.feathers.emitParticleAt(this.eagle.x, this.eagle.y, 8);
    this.audio?.bump();
    this.audio?.wingFlap();
    this.eagle.play('eagle-flap');
    this.tweens.killTweensOf(this.loon);

    // From here the eagle and loon move as one, the loon held just below.
    this.carrier = this.add.container(this.eagle.x, this.eagle.y);
    this.loon.setPosition(this.loon.x - this.eagle.x, this.loon.y - this.eagle.y);
    this.eagle.setPosition(0, 0);
    this.carrier.add([this.loon, this.eagle]);

    // Climb away to the upper left, growing as they rise toward the camera.
    const exit = { x: -450, y: -80 };
    this.time.delayedCall(450, () => {
      this.audio?.screech();
      this.tweens.add({
        targets: this.eagle,
        rotation: Phaser.Math.Angle.BetweenPoints(this.carrier, exit),
        duration: 500,
      });
      this.tweens.add({
        targets: this.carrier,
        x: exit.x,
        y: exit.y,
        scale: 1.4,
        duration: 2000,
        ease: 'Cubic.easeIn',
        onComplete: () => this.showGameOver(),
      });
      this.feathers.emitParticleAt(this.carrier.x, this.carrier.y, 5);
    });
  }

  showGameOver() {
    this.audio?.gameOver();
    const { width, height } = this.scale;
    const letters = [...'GAME OVER'].map((char) =>
      this.add.text(0, 0, char, { ...TEXT_STYLE, fontSize: '56px', color: '#e8475f' }),
    );
    const totalWidth = letters.reduce((sum, letter) => sum + letter.width, 0);
    let x = (width - totalWidth) / 2;
    letters.forEach((letter, i) => {
      letter.setPosition(x, -60).setOrigin(0, 0.5);
      x += letter.width;
      this.tweens.add({ targets: letter, y: height / 2 - 40, duration: 600, delay: i * 80, ease: 'Bounce.easeOut' });
    });

    const subtitle = this.add
      .text(width / 2, height / 2 + 30, `Carried off on level ${this.level}`, { ...TEXT_STYLE, fontSize: '16px' })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: subtitle, alpha: 1, delay: 900, duration: 500 });

    this.time.delayedCall(1400, () => {
      this.canLeave = true;
      const prompt = this.add
        .text(width / 2, height - 60, 'PRESS ENTER', { ...TEXT_STYLE, fontSize: '16px', strokeThickness: 4 })
        .setOrigin(0.5);
      this.time.addEvent({ delay: 500, loop: true, callback: () => prompt.setVisible(!prompt.visible) });
    });
  }

  update(time) {
    this.water.tilePositionX = Math.round((time / 1000) * WATER_DRIFT.x);
    this.water.tilePositionY = Math.round((time / 1000) * WATER_DRIFT.y);

    // The eagle's shadow on the water: same wing pose, trailing down and to
    // the right, further the higher (bigger) the eagle is.
    if (this.eagle.visible) {
      const height = this.carrier ? this.carrier.scale : this.eagle.scale / EAGLE_SCALE;
      const x = this.carrier ? this.carrier.x : this.eagle.x;
      const y = this.carrier ? this.carrier.y : this.eagle.y;
      this.eagleShadow
        .setTexture(this.eagle.texture.key)
        .setPosition(x + SHADOW_OFFSET.x * height, y + SHADOW_OFFSET.y * height)
        .setScale(EAGLE_SCALE * height * 0.9)
        .setRotation(this.eagle.rotation);
    }

    if (this.canLeave && !this.leaving && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.leaving = true;
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('TitleScene');
      });
    }
  }
}
