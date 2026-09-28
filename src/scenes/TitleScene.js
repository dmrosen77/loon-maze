import * as Phaser from 'phaser';
import { FONT_FAMILY, TITLE_COLORS } from '../config.js';
import { LOON, BABY_LOON, makePixelTexture } from '../art/pixelArt.js';
import { getLakeAudio } from '../audio.js';

const HORIZON_Y = 330;
const MOON = { x: 680, y: 95, radius: 34 };
const LOON_PIXEL_SIZE = 8;
const BABY_PIXEL_SIZE = 5;

const TEXT_STYLE = {
  fontFamily: `"${FONT_FAMILY}"`,
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 6,
};

// A night lake with the loon (and chick on its back) drifting on the water.
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    this.starting = false;
    this.audio = getLakeAudio(this);
    this.audio?.playMusic('title');

    this.drawSky();
    this.drawWater();
    this.drawLoon();
    this.drawReeds();
    this.drawTitle();
    this.drawPrompt();

    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.muteKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  }

  drawSky() {
    const { width } = this.scale;
    const bandHeight = HORIZON_Y / TITLE_COLORS.sky.length;
    TITLE_COLORS.sky.forEach((color, i) => {
      this.add.rectangle(0, i * bandHeight, width, bandHeight, color).setOrigin(0);
    });

    // Twinkling stars, each on its own rhythm.
    for (let i = 0; i < 45; i++) {
      const size = Phaser.Math.RND.pick([2, 3, 3, 4]);
      const star = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, HORIZON_Y - 60),
        size,
        size,
        TITLE_COLORS.stars,
      );
      this.tweens.add({
        targets: star,
        alpha: 0.2,
        duration: Phaser.Math.Between(600, 2000),
        delay: Phaser.Math.Between(0, 2000),
        yoyo: true,
        repeat: -1,
      });
    }

    this.add.circle(MOON.x, MOON.y, MOON.radius, TITLE_COLORS.moon);

    // Blocky treeline on the far shore.
    for (let x = 0; x < width; x += 12) {
      const height = Phaser.Math.Between(10, 38);
      this.add.rectangle(x, HORIZON_Y, 12, height, TITLE_COLORS.forest).setOrigin(0, 1);
    }
  }

  drawWater() {
    const { width, height } = this.scale;
    this.add.rectangle(0, HORIZON_Y, width, height - HORIZON_Y, TITLE_COLORS.water).setOrigin(0);

    // The moon's reflection: stacked bars that shimmer in width.
    for (let y = HORIZON_Y + 12; y < height - 40; y += 14) {
      const bar = this.add.rectangle(MOON.x, y, Phaser.Math.Between(30, 70), 4, TITLE_COLORS.moon, 0.6);
      this.tweens.add({
        targets: bar,
        scaleX: Phaser.Math.FloatBetween(0.4, 0.8),
        duration: Phaser.Math.Between(500, 1100),
        yoyo: true,
        repeat: -1,
      });
    }

    // Surface ripples that drift left, faster the closer they are.
    this.ripples = [];
    for (let i = 0; i < 28; i++) {
      const y = Phaser.Math.Between(HORIZON_Y + 8, height - 10);
      const nearness = (y - HORIZON_Y) / (height - HORIZON_Y);
      const ripple = this.add.rectangle(
        Phaser.Math.Between(0, width),
        y,
        Phaser.Math.Between(16, 30) + nearness * 40,
        3,
        TITLE_COLORS.ripple,
        0.35,
      );
      ripple.speed = 8 + nearness * 30;
      this.ripples.push(ripple);
    }
  }

  drawLoon() {
    makePixelTexture(this, 'pixel-loon', LOON, LOON_PIXEL_SIZE);
    makePixelTexture(this, 'pixel-baby-loon', BABY_LOON, BABY_PIXEL_SIZE);

    const loonY = 420;
    const adult = this.add.image(0, 0, 'pixel-loon');
    // The chick rides on the adult's back, just behind the neck.
    const baby = this.add.image(-32, -4, 'pixel-baby-loon');
    this.loon = this.add.container(this.scale.width / 2, loonY, [adult, baby]);

    // Bob on the water.
    this.tweens.add({
      targets: this.loon,
      y: loonY + 5,
      duration: 1100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Drift back and forth, turning to face the way it's swimming.
    this.tweens.add({
      targets: this.loon,
      x: { from: 340, to: 500 },
      duration: 7000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      onYoyo: () => this.loon.setScale(-1, 1),
      onRepeat: () => this.loon.setScale(1, 1),
    });

    // Rings spreading out from where the loon sits in the water.
    this.time.addEvent({
      delay: 1300,
      loop: true,
      callback: () => {
        const ring = this.add
          .ellipse(this.loon.x, loonY + 50, 220, 22)
          .setStrokeStyle(3, TITLE_COLORS.ripple, 0.6);
        this.children.moveBelow(ring, this.loon);
        this.tweens.add({
          targets: ring,
          scaleX: 1.8,
          scaleY: 1.8,
          alpha: 0,
          duration: 2200,
          onComplete: () => ring.destroy(),
        });
      },
    });
  }

  // Clumps of reeds in the corners, swaying from their bases.
  drawReeds() {
    const { width, height } = this.scale;
    const clumps = [
      [20, 170],
      [width - 170, width - 20],
    ];
    clumps.forEach(([from, to]) => {
      for (let x = from; x < to; x += Phaser.Math.Between(8, 16)) {
        const reed = this.add
          .rectangle(x, height, 6, Phaser.Math.Between(60, 150), Phaser.Math.RND.pick(TITLE_COLORS.reeds))
          .setOrigin(0.5, 1);
        this.tweens.add({
          targets: reed,
          angle: { from: -3, to: 3 },
          duration: Phaser.Math.Between(1400, 2200),
          delay: Phaser.Math.Between(0, 1000),
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      }
    });
  }

  // "LOON MAZE" with each letter bobbing in a wave.
  drawTitle() {
    const letters = [...'LOON MAZE'].map((char) =>
      this.add.text(0, 0, char, { ...TEXT_STYLE, fontSize: '64px', color: TITLE_COLORS.title }),
    );
    const totalWidth = letters.reduce((sum, letter) => sum + letter.width, 0);
    let x = (this.scale.width - totalWidth) / 2;
    letters.forEach((letter, i) => {
      letter.setPosition(x, 150).setOrigin(0, 0.5);
      x += letter.width;
      this.tweens.add({
        targets: letter,
        y: 136,
        duration: 700,
        delay: i * 90,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    });
  }

  drawPrompt() {
    const { width } = this.scale;
    // Browsers block sound until the first key press, so ask for one first.
    this.waitingForSound = Boolean(this.audio) && !this.audio.started;
    this.prompt = this.add
      .text(width / 2, 530, this.waitingForSound ? 'PRESS ANY KEY' : 'PRESS ENTER TO START', {
        ...TEXT_STYLE,
        fontSize: '22px',
      })
      .setOrigin(0.5);

    // Classic arcade blink.
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => this.prompt.setVisible(!this.prompt.visible),
    });

    this.add
      .text(width / 2, 578, 'ARROWS: SWIM   M: MUTE', { ...TEXT_STYLE, fontSize: '12px', strokeThickness: 4 })
      .setOrigin(0.5);
  }

  update(time, delta) {
    for (const ripple of this.ripples) {
      ripple.x -= (ripple.speed * delta) / 1000;
      if (ripple.x < -ripple.width) ripple.x = this.scale.width + ripple.width;
    }

    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      this.audio?.toggleMute();
    }

    // JustDown is read every frame so the key press that turns the sound on
    // doesn't also count as pressing Enter to start.
    const enterPressed = Phaser.Input.Keyboard.JustDown(this.enterKey);
    if (this.waitingForSound) {
      if (this.audio.started) {
        this.waitingForSound = false;
        this.prompt.setText('PRESS ENTER TO START').setVisible(true);
      }
      return;
    }

    if (enterPressed && !this.starting) {
      this.starting = true;
      this.audio?.startJingle();
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('GameScene', { level: 1 });
      });
    }
  }
}
