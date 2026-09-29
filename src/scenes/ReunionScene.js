import * as Phaser from 'phaser';
import {
  TILE_SIZE,
  SPRITE_PIXEL_SIZE,
  WATER_DRIFT,
  REUNION_MS,
  LOON_MAX_HP,
  REUNION_HEAL,
  FONT_FAMILY,
  TITLE_COLORS,
  DIVE_UNLOCK_LEVEL,
} from '../config.js';
import { HEART, makePixelTexture, makeWaterTexture } from '../art/pixelArt.js';
import { getLakeAudio } from '../audio.js';
import { isTouchDevice } from '../ui/touch.js';
import loonBigUrl from '../assets/loon-big.png';
import babyLoonBigUrl from '../assets/baby-loon-big.png';
import HpBar from '../ui/HpBar.js';

// Screen pixels per art pixel for the big cutscene sprites.
const BIG_PIXEL = 4;
// The chick is drawn a size down so it's about a third of its parent's length.
const CHICK_PIXEL = 3;

// Where things sit on the parent sprite, relative to its center, in screen
// pixels at BIG_PIXEL scale (measured from src/assets/loon-big.png).
const PARENT_BILL_TIP = 240;
const PARENT_TAIL = -230;
const PARENT_BACK = { x: -20, y: -14 };

// Where the parent settles: a little left of center, leaving room for the
// chick to paddle in from the right.
const PARENT_REST_Y = 330;
const PARENT_REST_LEFT_OF_CENTER = 90;

const TEXT_STYLE = {
  fontFamily: `"${FONT_FAMILY}"`,
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 6,
};

// Played after each maze: the parent glides in, the chick paddles over and
// hops onto its back, hearts float up, the loon gets a little HP back, then
// the next level starts.
export default class ReunionScene extends Phaser.Scene {
  constructor() {
    super('ReunionScene');
  }

  preload() {
    this.load.image('loon-big', loonBigUrl);
    this.load.image('baby-loon-big', babyLoonBigUrl);
  }

  create(data) {
    this.level = data.level;
    this.hp = data.hp ?? LOON_MAX_HP;
    this.healedHp = Math.min(LOON_MAX_HP, this.hp + REUNION_HEAL);
    // The score already includes this level's points; they're shown separately.
    this.score = data.score ?? 0;
    this.levelPoints = data.levelPoints ?? 0;
    this.speedBonus = data.speedBonus ?? 0;
    this.leaving = false;
    this.riding = false;
    this.nextWakeTime = 0;
    this.audio = getLakeAudio(this);

    for (const key of ['loon-big', 'baby-loon-big']) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    makePixelTexture(this, 'heart', HEART, BIG_PIXEL);
    makeWaterTexture(this, TILE_SIZE, SPRITE_PIXEL_SIZE);
    makePixelTexture(this, 'wake-droplet', { palette: { w: '#f2fafe' }, rows: ['ww', 'ww'] }, SPRITE_PIXEL_SIZE);

    const { width, height } = this.scale;
    this.parentRestX = width / 2 - PARENT_REST_LEFT_OF_CENTER;
    // The lake at night: the in-game water, doubled in scale to match the big
    // sprites' chunkier pixels and tinted darker.
    this.water = this.add
      .tileSprite(0, 0, width, height, 'water')
      .setOrigin(0)
      .setTileScale(2)
      .setTint(0x8aa2d0);
    this.wake = this.add.particles(0, 0, 'wake-droplet', {
      lifespan: { min: 700, max: 1300 },
      speed: { min: 20, max: 60 },
      angle: { min: 150, max: 210 },
      scale: { start: 1.5, end: 0.5 },
      alpha: { start: 0.9, end: 0 },
      emitting: false,
    });

    this.parent = this.add.image(-300, PARENT_REST_Y, 'loon-big').setScale(BIG_PIXEL);
    this.baby = this.add.image(width + 100, PARENT_REST_Y - 30, 'baby-loon-big').setScale(CHICK_PIXEL).setFlipX(true);

    // The HP bar (label, gap and 300px bar: 340px in all) is centered.
    this.hpBar = new HpBar(this, width / 2 - 170, 490, {
      width: 300,
      height: 16,
      max: LOON_MAX_HP,
      value: this.hp,
      fontSize: 16,
      fixed: false,
    });

    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.playSequence();

    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.input.on('pointerdown', () => this.nextLevel()); // A tap works like Enter.
    this.time.delayedCall(REUNION_MS, () => this.nextLevel());
  }

  playSequence() {
    // The parent glides in from the left and settles into a gentle bob.
    this.tweens.add({
      targets: this.parent,
      x: this.parentRestX,
      duration: 2000,
      ease: 'Sine.easeOut',
    });
    this.bob(this.parent, 0);

    // The chick paddles in from the right to meet the parent's bill.
    const meetX = this.parentRestX + PARENT_BILL_TIP + 80;
    this.tweens.add({
      targets: this.baby,
      x: meetX,
      delay: 700,
      duration: 1700,
      ease: 'Sine.easeOut',
      onComplete: () => this.hopOnBack(),
    });
    this.bob(this.baby, 300);
  }

  bob(target, delay) {
    this.tweens.add({
      targets: target,
      y: '+=5',
      duration: 900,
      delay,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // Seen from above, a hop is the chick getting bigger (closer to us) and
  // then smaller again as it lands on the parent's back.
  hopOnBack() {
    this.tweens.killTweensOf(this.baby);
    this.baby.setFlipX(false);
    const back = { x: this.parent.x + PARENT_BACK.x, y: this.parent.y + PARENT_BACK.y };
    this.tweens.add({
      targets: this.baby,
      x: back.x,
      y: back.y,
      duration: 700,
      ease: 'Sine.easeInOut',
      onComplete: () => this.celebrate(),
    });
    this.tweens.add({
      targets: this.baby,
      scale: { from: CHICK_PIXEL, to: CHICK_PIXEL * 1.35 },
      duration: 350,
      ease: 'Sine.easeOut',
      yoyo: true,
    });
  }

  celebrate() {
    this.riding = true;
    this.audio?.reunite();

    // Hearts float up from the pair: a burst, then a trickle. They stay solid
    // for most of their rise and fade out at the end.
    const hearts = this.add.particles(0, 0, 'heart', {
      lifespan: 2400,
      speed: { min: 50, max: 100 },
      angle: { min: 245, max: 295 },
      scale: { start: 1, end: 1.3 },
      alpha: { start: 1, end: 0, ease: 'Cubic.easeIn' },
      emitting: false,
    });
    hearts.emitParticleAt(this.baby.x, this.baby.y - 30, 8);
    this.time.addEvent({
      delay: 300,
      repeat: 12,
      callback: () => hearts.emitParticleAt(this.baby.x + Phaser.Math.Between(-80, 80), this.baby.y - 30, 1),
    });

    this.showTitle();
    this.time.delayedCall(1100, () => this.heal());
    this.time.delayedCall(700, () => this.showPoints());
  }

  // What this level earned, then the total counting up to include it.
  showPoints() {
    const { width } = this.scale;
    const previous = this.score - this.levelPoints - this.speedBonus;
    const line = this.add
      .text(width / 2, 528, '', { ...TEXT_STYLE, fontSize: '14px', strokeThickness: 4 })
      .setOrigin(0.5);
    const counter = { value: previous };
    const show = () =>
      line.setText(`LEVEL +${this.levelPoints}   SPEED +${this.speedBonus}   SCORE ${Math.round(counter.value)}`);
    show();
    this.tweens.add({ targets: counter, value: this.score, delay: 400, duration: 1000, ease: 'Sine.easeOut', onUpdate: show });
  }

  // The HP bar grows back, with a "+5 HP" floating up beside it.
  heal() {
    const gained = this.healedHp - this.hp;
    this.hpBar.setValue(this.healedHp);
    if (gained > 0) this.audio?.heal();

    const popup = this.add
      .text(this.hpBar.right + 16, 490, gained > 0 ? `+${gained} HP` : 'HP FULL', {
        ...TEXT_STYLE,
        fontSize: '16px',
        strokeThickness: 4,
        color: '#5ad04a',
      })
      .setOrigin(0, 0.5);
    this.tweens.add({ targets: popup, y: 450, alpha: 0, delay: 700, duration: 900, ease: 'Sine.easeIn' });
  }

  // "REUNITED!" drops in letter by letter, then keeps bobbing in a wave.
  showTitle() {
    const { width, height } = this.scale;
    const letters = [...'REUNITED!'].map((char) =>
      this.add.text(0, 0, char, { ...TEXT_STYLE, fontSize: '56px', color: TITLE_COLORS.title }),
    );
    const totalWidth = letters.reduce((sum, letter) => sum + letter.width, 0);
    let x = (width - totalWidth) / 2;
    letters.forEach((letter, i) => {
      letter.setPosition(x, -60).setOrigin(0, 0.5);
      x += letter.width;
      this.tweens.chain({
        targets: letter,
        tweens: [
          { y: 110, duration: 500, delay: i * 70, ease: 'Bounce.easeOut' },
          { y: 98, duration: 700, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 },
        ],
      });
    });

    const subtitle = this.add
      .text(width / 2, 178, `LEVEL ${this.level} COMPLETE`, { ...TEXT_STYLE, fontSize: '20px' })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: subtitle, alpha: 1, delay: 700, duration: 500 });

    const prompt = this.add
      .text(width / 2, height - 40, isTouchDevice() ? 'TAP TO CONTINUE' : 'PRESS ENTER', {
        ...TEXT_STYLE,
        fontSize: '14px',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.time.addEvent({
      delay: 500,
      startAt: 0,
      loop: true,
      callback: () => prompt.setVisible(!prompt.visible),
    });
  }

  nextLevel() {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Just before diving unlocks, the next level starts with the dive lesson.
      const level = this.level + 1;
      this.scene.start('GameScene', { level, hp: this.healedHp, score: this.score, lesson: level === DIVE_UNLOCK_LEVEL });
    });
  }

  update(time) {
    this.water.tilePositionX = Math.round((time / 1000) * WATER_DRIFT.x);
    this.water.tilePositionY = Math.round((time / 1000) * WATER_DRIFT.y);

    // The chick rides along as the parent bobs.
    if (this.riding) {
      this.baby.setPosition(this.parent.x + PARENT_BACK.x, this.parent.y + PARENT_BACK.y);
    }

    // A wake streams from the parent's tail while it's still gliding in.
    if (this.parent.x < this.parentRestX - 5 && time >= this.nextWakeTime) {
      this.wake.emitParticleAt(this.parent.x + PARENT_TAIL, this.parent.y + Phaser.Math.Between(-30, 30), 2);
      this.nextWakeTime = time + 30;
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.nextLevel();
    }
  }
}
