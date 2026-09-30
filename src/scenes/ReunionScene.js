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
import { HEART, STAR, STAR_EMPTY, COIN, makePixelTexture, makeWaterTexture } from '../art/pixelArt.js';
import { getLakeAudio } from '../audio.js';
import { isTouchDevice } from '../ui/touch.js';
import loonBigUrl from '../assets/loon-big.png';
import babyLoonBigUrl from '../assets/baby-loon-big.png';
import HpBar from '../ui/HpBar.js';
import { isLessonDone } from '../progress.js';
import { LAKES, LEVELS_PER_LAKE } from '../lakes.js';

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

// How much longer the reunion lasts after a perfect (3-star) level, for its celebration.
const PERFECT_EXTRA_MS = 3000;

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
    this.fishPoints = data.fishPoints ?? 0;
    this.stars = data.stars ?? 1;
    this.starImages = [];
    // LAKES mode: each level stands alone, so there's no HP to heal; instead
    // it says whether this was a new best, and goes back to the lake map.
    this.mode = data.mode ?? 'arcade';
    this.lake = data.lake;
    this.number = data.number;
    this.lakeTitle = data.title ? `${data.title} ${data.subtitle}` : null;
    this.newBest = Boolean(data.newBest);
    this.unlockedLake = data.unlockedLake ?? null;
    this.leaving = false;
    this.riding = false;
    this.nextWakeTime = 0;
    this.audio = getLakeAudio(this);

    for (const key of ['loon-big', 'baby-loon-big']) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    makePixelTexture(this, 'heart', HEART, BIG_PIXEL);
    makePixelTexture(this, 'star', STAR, 3);
    makePixelTexture(this, 'star-empty', STAR_EMPTY, 3);
    makePixelTexture(this, 'coin', COIN, 3);
    makePixelTexture(this, 'confetti', { palette: { w: '#ffffff' }, rows: ['ww', 'ww', 'ww'] }, 3);
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
      .setTint(0x8aa2d0)
      .setDepth(-2); // Under everything, including a perfect level's light rays.
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
    this.hpBar = this.mode === 'lakes' ? null : new HpBar(this, width / 2 - 170, 490, {
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
    // A perfect level's celebration gets a few more seconds.
    this.time.delayedCall(REUNION_MS + (this.stars === 3 ? PERFECT_EXTRA_MS : 0), () => this.nextLevel());
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
    this.time.delayedCall(1100, () => (this.hpBar ? this.heal() : this.showNewBest()));
    this.time.delayedCall(700, () => this.showPoints());
    this.time.delayedCall(1000, () => this.showStars());
  }

  // What this level earned, then the total counting up to include it.
  showPoints() {
    const { width } = this.scale;
    const previous = this.score - this.levelPoints - this.speedBonus - this.fishPoints;
    const line = this.add
      .text(width / 2, 528, '', { ...TEXT_STYLE, fontSize: '14px', strokeThickness: 4 })
      .setOrigin(0.5);
    const counter = { value: previous };
    const show = () =>
      line.setText(
        [
          `LEVEL +${this.levelPoints}`,
          `SPEED +${this.speedBonus}`,
          ...(this.fishPoints > 0 ? [`FISH +${this.fishPoints}`] : []),
          `SCORE ${Math.round(counter.value)}`,
        ].join('   '),
      );
    show();
    this.tweens.add({ targets: counter, value: this.score, delay: 400, duration: 1000, ease: 'Sine.easeOut', onUpdate: show });
  }

  // Three stars between "REUNITED!" and "LEVEL N COMPLETE": the earned ones pop in one by one,
  // each with a higher chime, over dark empty ones.
  showStars() {
    const { width } = this.scale;
    [-1, 0, 1].forEach((offset, i) => {
      const x = width / 2 + offset * 44;
      this.add.image(x, 150, 'star-empty');
      if (i >= this.stars) return;
      const star = this.add.image(x, 150, 'star').setScale(0);
      this.tweens.add({
        targets: star,
        scale: 1,
        delay: i * 280,
        duration: 320,
        ease: 'Back.easeOut',
        onStart: () => this.audio?.star(i),
      });
      this.starImages.push(star);
    });
    if (this.stars === 3) this.time.delayedCall(2 * 280 + 320, () => this.perfect());
  }

  // A perfect (3-star) level, celebrated completely over the top: a flash, a
  // boom and a screen shake; gold and white light rays spinning behind the
  // stars; a fountain of coins from the stars and a coin rain; confetti; a
  // flood of hearts filling the screen; and "PERFECT!" slamming in letter by
  // letter in cycling rainbow colors. With a fanfare and a coin shower.
  perfect() {
    const { width, height } = this.scale;
    const camera = this.cameras.main;
    this.audio?.boom();
    this.audio?.fanfare();
    this.time.delayedCall(250, () => this.audio?.coinShower(1.8));
    camera.shake(350, 0.012);
    camera.zoomTo(1.06, 90, 'Sine.easeOut', true, (cam, progress) => {
      if (progress === 1) cam.zoomTo(1, 260, 'Sine.easeInOut', true);
    });
    const flash = this.add.rectangle(0, 0, width, height, 0xffffff, 0.85).setOrigin(0).setDepth(50);
    this.tweens.add({ targets: flash, alpha: 0, duration: 450, onComplete: () => flash.destroy() });

    // Light rays: alternating gold and white wedges, spinning slowly.
    const rays = this.add.graphics({ x: width / 2, y: 150 }).setDepth(-1).setScale(0);
    const count = 18;
    const reach = Math.max(width, height) * 1.2;
    for (let k = 0; k < count; k++) {
      const a0 = (k / count) * Math.PI * 2;
      const a1 = a0 + (Math.PI / count) * 0.9;
      rays.fillStyle(k % 2 ? 0xfff6c2 : 0xffd54f, 0.22);
      rays.fillTriangle(0, 0, Math.cos(a0) * reach, Math.sin(a0) * reach, Math.cos(a1) * reach, Math.sin(a1) * reach);
    }
    this.tweens.add({ targets: rays, scale: 1, duration: 500, ease: 'Back.easeOut' });
    this.tweens.add({ targets: rays, angle: 360, duration: 9000, repeat: -1 });

    // The stars pulse.
    this.tweens.add({ targets: this.starImages, scale: 1.35, duration: 220, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Coins: a fountain out of each star, then a rain across the screen.
    const fountain = this.add
      .particles(0, 0, 'coin', {
        speed: { min: 260, max: 560 },
        angle: { min: 200, max: 340 },
        gravityY: 800,
        lifespan: 2400,
        rotate: { start: 0, end: 720 },
        scale: { min: 0.8, max: 1.3 },
        emitting: false,
      })
      .setDepth(30);
    for (const star of this.starImages) fountain.emitParticleAt(star.x, star.y, 45);
    const coinRain = this.add
      .particles(0, -20, 'coin', {
        x: { min: 0, max: width },
        speedY: { min: 120, max: 280 },
        speedX: { min: -50, max: 50 },
        gravityY: 350,
        lifespan: 3200,
        rotate: { start: 0, end: 540 },
        frequency: 25,
        quantity: 2,
      })
      .setDepth(30);
    this.time.delayedCall(1700, () => coinRain.stop());

    // Confetti in every color, bursting out and tumbling down.
    const rainbow = [0xff4f7a, 0xffd54f, 0x5ad04a, 0x4fb3ff, 0xb57bff, 0xff9a3c, 0xffffff];
    const confettiStyle = {
      rotate: { start: 0, end: 900 },
      lifespan: 4200,
      tint: { onEmit: () => Phaser.Utils.Array.GetRandom(rainbow) },
    };
    const confetti = this.add
      .particles(0, -10, 'confetti', {
        ...confettiStyle,
        x: { min: 0, max: width },
        speedY: { min: 60, max: 170 },
        speedX: { min: -70, max: 70 },
        frequency: 15,
        quantity: 3,
      })
      .setDepth(32);
    this.time.delayedCall(2400, () => confetti.stop());
    const confettiBurst = this.add
      .particles(0, 0, 'confetti', { ...confettiStyle, speed: { min: 200, max: 600 }, gravityY: 400, emitting: false })
      .setDepth(32);
    confettiBurst.emitParticleAt(width / 2, 150, 120);

    // A flood of hearts rising from the whole bottom of the screen, and a burst from the pair.
    const pinks = [0xffffff, 0xffc2d1, 0xff8fab, 0xff5c8a];
    const heartFlood = this.add
      .particles(0, height + 30, 'heart', {
        x: { min: 0, max: width },
        speedY: { min: -140, max: -300 },
        speedX: { min: -40, max: 40 },
        scale: { min: 0.4, max: 1.2 },
        alpha: { start: 1, end: 0, ease: 'Cubic.easeIn' },
        tint: { onEmit: () => Phaser.Utils.Array.GetRandom(pinks) },
        lifespan: 4200,
        frequency: 18,
        quantity: 3,
      })
      .setDepth(25);
    this.time.delayedCall(2800, () => heartFlood.stop());
    const heartBurst = this.add
      .particles(0, 0, 'heart', {
        speed: { min: 150, max: 450 },
        scale: { start: 1.2, end: 0.4 },
        alpha: { start: 1, end: 0 },
        tint: { onEmit: () => Phaser.Utils.Array.GetRandom(pinks) },
        lifespan: 1600,
        emitting: false,
      })
      .setDepth(25);
    heartBurst.emitParticleAt(this.baby.x, this.baby.y - 20, 40);

    this.showPerfectText();
  }

  // "PERFECT!" slams in letter by letter, bounces in a wave, and cycles
  // through the rainbow, then fades so the loons show again.
  showPerfectText() {
    const { width, height } = this.scale;
    const y = height * 0.46;
    const letters = [...'PERFECT!'].map((char) =>
      this.add.text(0, y, char, { ...TEXT_STYLE, fontSize: '72px', strokeThickness: 10 }).setOrigin(0.5).setDepth(40),
    );
    const totalWidth = letters.reduce((sum, letter) => sum + letter.width, 0);
    let x = (width - totalWidth) / 2;
    letters.forEach((letter, i) => {
      letter.setX(x + letter.width / 2).setScale(4).setAlpha(0);
      x += letter.width;
      this.tweens.chain({
        targets: letter,
        tweens: [
          { scale: 1, alpha: 1, duration: 260, delay: i * 70, ease: 'Back.easeOut' },
          { y: y - 14, duration: 300, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 },
        ],
      });
    });

    let hue = 0;
    const cycle = this.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        hue = (hue + 0.05) % 1;
        letters.forEach((letter, i) => {
          const { color } = Phaser.Display.Color.HSVToRGB((hue + i * 0.1) % 1, 0.75, 1);
          letter.setColor(`#${color.toString(16).padStart(6, '0')}`);
        });
      },
    });
    this.time.delayedCall(3600, () => {
      this.tweens.add({
        targets: letters,
        alpha: 0,
        duration: 600,
        onComplete: () => {
          cycle.remove();
          letters.forEach((letter) => letter.destroy());
        },
      });
    });
  }

  // LAKES mode: "NEW BEST!" where the HP bar would be, if it was one.
  showNewBest() {
    if (!this.newBest) return;
    const { width } = this.scale;
    const label = this.add
      .text(width / 2, 486, 'NEW BEST!', { ...TEXT_STYLE, fontSize: '24px', color: TITLE_COLORS.title })
      .setOrigin(0.5)
      .setScale(0);
    this.tweens.add({ targets: label, scale: 1, duration: 400, ease: 'Back.easeOut' });
    this.audio?.coin();
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
      .text(width / 2, 178, this.lakeTitle ?? `LEVEL ${this.level} COMPLETE`, {
        ...TEXT_STYLE,
        fontSize: this.lakeTitle ? '16px' : '20px',
        strokeThickness: this.lakeTitle ? 5 : 6,
      })
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
      if (this.mode === 'lakes') {
        this.backToMap();
        return;
      }
      // The first time a run reaches diving, the dive lesson comes first.
      const level = this.level + 1;
      const next = { mode: 'arcade', level, hp: this.healedHp, score: this.score };
      if (level === DIVE_UNLOCK_LEVEL && !isLessonDone()) {
        this.scene.start('GameScene', { lesson: true, then: next, hp: next.hp, score: next.score });
      } else {
        this.scene.start('GameScene', next);
      }
    });
  }

  // Back to the lake map: the next level selected, or the lakes view if this
  // finished the lake or opened a new one.
  backToMap() {
    if (this.unlockedLake !== null) {
      const name = LAKES[this.unlockedLake].name.toUpperCase();
      this.scene.start('LakeMapScene', { view: 'lakes', lake: this.unlockedLake, notice: `${name} UNLOCKED!` });
    } else if (this.number >= LEVELS_PER_LAKE) {
      this.scene.start('LakeMapScene', { view: 'lakes', lake: this.lake, notice: 'LAKE COMPLETE!' });
    } else {
      this.scene.start('LakeMapScene', { view: 'lake', lake: this.lake, select: this.number + 1 });
    }
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
