import * as Phaser from 'phaser';
import {
  TILE_SIZE,
  SPRITE_PIXEL_SIZE,
  WATER_DRIFT,
  HIGH_SCORE_COUNT,
  ATTRACT_HIGH_SCORES_MS,
  FONT_FAMILY,
  TITLE_COLORS,
} from '../config.js';
import { makeWaterTexture } from '../art/pixelArt.js';
import { getLakeAudio } from '../audio.js';
import { isTouchDevice } from '../ui/touch.js';
import { loadHighScores, addHighScore, qualifies, fetchWorldScores, submitWorldScore } from '../highScores.js';
import eagleForwardUrl from '../assets/eagle-wings-forward.png';
import eagleBackUrl from '../assets/eagle-wings-back.png';
import PadInput from '../ui/gamepad.js';
import { hasEasterEgg, playEasterEgg } from '../game/easterEggs.js';

const EAGLE_SCALE = 3;
const EAGLE_Y = 80;
// The "HIGH SCORES" banner hangs from the eagle's talons, this far behind it.
const BANNER_BEHIND = 120;
const ROW_TOP = 150;
const ROW_SPACING = 36;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const RANKS = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH', '9TH', '10TH'];
const RANK_COLORS = ['#ffd54f', '#d8dde3', '#e0a060']; // Gold, silver, bronze.

const TEXT_STYLE = {
  fontFamily: `"${FONT_FAMILY}"`,
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 5,
};

// After game over. A score good enough for the table first gets three
// initials, arcade style. Then the eagle screeches in carrying the
// "HIGH SCORES" banner, drops it, and the scores fly in one by one.
// Started with { score, level }. Enter returns to the title screen.
//
// Also the title's attract mode, started with { attract: true }: just the
// table, then back to the title on its own after ATTRACT_HIGH_SCORES_MS, or
// straight away on any key.
//
// It shows the world table from the score server when there is one, and this
// device's table otherwise (see src/highScores.js).
export default class HighScoreScene extends Phaser.Scene {
  constructor() {
    super('HighScoreScene');
  }

  preload() {
    this.load.image('eagle-wings-forward', eagleForwardUrl);
    this.load.image('eagle-wings-back', eagleBackUrl);
  }

  create(data) {
    this.attract = Boolean(data.attract);
    this.score = data.score ?? 0;
    this.level = data.level ?? 1;
    this.canLeave = false;
    this.leaving = false;
    this.carryingBanner = false;
    this.audio = getLakeAudio(this);
    this.audio?.playMusic('highscore');

    for (const key of ['eagle-wings-forward', 'eagle-wings-back']) {
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
    makeWaterTexture(this, TILE_SIZE, SPRITE_PIXEL_SIZE);

    const { width, height } = this.scale;
    this.water = this.add
      .tileSprite(0, 0, width, height, 'water')
      .setOrigin(0)
      .setTileScale(2)
      .setTint(0x6878a0);

    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.pad = new PadInput();
    // A tap on the table works like Enter (but not a tap on a button).
    this.tapped = false;
    this.input.on('pointerdown', (pointer, overObjects) => {
      if (overObjects.length === 0) this.tapped = true;
    });
    this.cameras.main.fadeIn(500, 0, 0, 0);

    if (this.attract) {
      this.time.delayedCall(ATTRACT_HIGH_SCORES_MS, () => this.returnToTitle());
      const onKey = (event) => {
        if (!event.repeat) this.returnToTitle();
      };
      this.input.keyboard.on('keydown', onKey);
      this.input.on('pointerdown', () => this.returnToTitle());
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard.off('keydown', onKey));
    }

    // Ask the score server for the world table first (it answers in a
    // moment, or not at all where there's no server), then carry on with
    // whichever table we have.
    this.worldScores = null;
    fetchWorldScores().then((world) => {
      if (this.leaving || !this.sys.isActive()) return; // Left before it answered.
      this.worldScores = world;
      this.useTable(world ?? loadHighScores(), world ? 'WORLD' : 'THIS DEVICE');
      if (!this.attract && qualifies(this.tableScores, this.score)) this.enterInitials();
      else this.showTable(-1);
    });
  }

  useTable(scores, label) {
    this.tableScores = scores;
    this.tableLabel = label;
  }

  returnToTitle() {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('TitleScene'));
  }

  // "NEW HIGH SCORE!" and three letter slots. Up/down change the letter,
  // left/right move between slots, typing a letter sets it, Enter moves on
  // (and saves after the third).
  enterInitials() {
    const { width } = this.scale;
    this.initials = ['A', 'A', 'A'];
    this.slot = 0;

    const heading = this.wavyText('NEW HIGH SCORE!', 110, '40px', TITLE_COLORS.title);
    const parts = [
      ...heading,
      this.add.text(width / 2, 180, `SCORE ${this.score}`, { ...TEXT_STYLE, fontSize: '24px' }).setOrigin(0.5),
      this.add.text(width / 2, 250, 'ENTER YOUR INITIALS', { ...TEXT_STYLE, fontSize: '16px' }).setOrigin(0.5),
      this.add
        .text(
          width / 2,
          560,
          isTouchDevice()
            ? 'TAP THE ARROWS TO PICK LETTERS, THEN OK'
            : 'UP/DOWN: LETTER   LEFT/RIGHT: MOVE   ENTER: OK',
          { ...TEXT_STYLE, fontSize: '10px', strokeThickness: 4 },
        )
        .setOrigin(0.5),
    ];

    this.slotTexts = [-1, 0, 1].map((offset) =>
      this.add.text(width / 2 + offset * 90, 340, '', { ...TEXT_STYLE, fontSize: '64px', strokeThickness: 8 }).setOrigin(0.5),
    );
    this.cursor = this.add.rectangle(0, 385, 64, 6, 0xffd54f);
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.cursor.setVisible(!this.cursor.visible) });
    this.initialsParts = [...parts, ...this.slotTexts, this.cursor, ...this.addInitialsButtons()];
    this.refreshInitials();

    const onKey = (event) => {
      if (event.repeat || !this.initials) return;
      const key = event.key.toUpperCase();
      if (event.key === 'ArrowUp') this.changeLetter(1);
      else if (event.key === 'ArrowDown') this.changeLetter(-1);
      else if (event.key === 'ArrowRight') this.moveSlot(1);
      else if (event.key === 'ArrowLeft' || event.key === 'Backspace') this.moveSlot(-1);
      else if (event.key === 'Enter') this.confirmSlot();
      else if (key.length === 1 && LETTERS.includes(key)) {
        this.initials[this.slot] = key;
        this.audio?.blip();
        if (this.slot < 2) this.moveSlot(1);
        else this.refreshInitials();
      }
    };
    this.input.keyboard.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard.off('keydown', onKey));
  }

  // Tappable (or clickable) controls: an arrow above and below each letter,
  // tapping a letter selects it, and OK saves. Each has a finger-sized
  // invisible hit area bigger than what's drawn.
  addInitialsButtons() {
    const { width } = this.scale;
    const parts = [];
    const tappable = (x, y, w, h, onTap) => {
      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', onTap);
      parts.push(zone);
    };

    this.slotTexts.forEach((text, i) => {
      const select = () => {
        if (!this.initials) return;
        this.slot = i;
        this.refreshInitials();
      };
      parts.push(this.add.triangle(text.x, 272, 0, 24, 20, 0, 40, 24, 0xffffff, 0.8)); // Up
      parts.push(this.add.triangle(text.x, 416, 0, 0, 20, 24, 40, 0, 0xffffff, 0.8)); // Down
      tappable(text.x, 268, 84, 60, () => {
        select();
        if (this.initials) this.changeLetter(1);
      });
      tappable(text.x, 420, 84, 60, () => {
        select();
        if (this.initials) this.changeLetter(-1);
      });
      tappable(text.x, 340, 84, 80, select);
    });

    const ok = this.add
      .text(width / 2, 490, 'OK', { ...TEXT_STYLE, fontSize: '24px', backgroundColor: 'rgba(0, 0, 0, 0.4)', padding: { x: 18, y: 10 } })
      .setOrigin(0.5);
    parts.push(ok);
    tappable(width / 2, 490, 160, 64, () => this.finishInitials());
    return parts;
  }

  changeLetter(step) {
    const index = LETTERS.indexOf(this.initials[this.slot]);
    this.initials[this.slot] = LETTERS[(index + step + LETTERS.length) % LETTERS.length];
    this.audio?.blip();
    this.refreshInitials();
  }

  moveSlot(step) {
    this.slot = Phaser.Math.Clamp(this.slot + step, 0, 2);
    this.audio?.blip(-5);
    this.refreshInitials();
  }

  confirmSlot() {
    if (this.slot < 2) {
      this.audio?.blip(7);
      this.moveSlot(1);
      return;
    }
    this.finishInitials();
  }

  // Enter on the last letter, or the OK button, saves the initials. Some
  // cheeky ones get a silly show first (src/game/easterEggs.js).
  finishInitials() {
    if (!this.initials) return;
    const name = this.initials.join('');
    this.initials = null; // No more typing.
    if (hasEasterEgg(name)) playEasterEgg(this, name, this.audio).then(() => this.saveInitials(name));
    else this.saveInitials(name);
  }

  // Save (on this device, and to the world table when there is one), clear
  // the entry screen, and bring on the table.
  saveInitials(name) {
    if (!this.sys.isActive()) return;
    const entry = { name, score: this.score, level: this.level };
    this.audio?.heal();
    const localRank = addHighScore(entry);
    const saved = this.worldScores ? submitWorldScore(entry) : Promise.resolve(null);

    const fadedOut = new Promise((resolve) => {
      this.tweens.add({ targets: this.initialsParts, alpha: 0, duration: 400, onComplete: resolve });
    });
    Promise.all([saved, fadedOut]).then(([world]) => {
      if (!this.sys.isActive()) return;
      this.initialsParts.forEach((part) => part.destroy());
      if (world) {
        this.useTable(world.scores, 'WORLD');
        this.showTable(world.rank);
      } else {
        // No server, or it turned the score down: show this device's table.
        this.useTable(loadHighScores(), 'THIS DEVICE');
        this.showTable(localRank);
      }
    });
  }

  refreshInitials() {
    this.slotTexts.forEach((text, i) => {
      text.setText(this.initials[i]).setColor(i === this.slot ? TITLE_COLORS.title : '#ffffff');
    });
    this.cursor.setX(this.slotTexts[this.slot].x).setVisible(true);
  }

  // The eagle screeches in from the right carrying the banner, drops it at the
  // top, and flies off; then the rows fly in. `highlight` is the new entry's
  // position in the table, or -1.
  showTable(highlight) {
    const { width } = this.scale;
    this.highlight = highlight;
    this.audio?.screech();

    this.banner = this.add
      .text(0, 0, 'HIGH SCORES', { ...TEXT_STYLE, fontSize: '40px', color: TITLE_COLORS.title, strokeThickness: 7 })
      .setOrigin(0.5);
    this.eagle = this.add
      .sprite(width + 200, EAGLE_Y, 'eagle-wings-back')
      .setScale(EAGLE_SCALE)
      .setRotation(Math.PI) // Facing left.
      .play('eagle-flap');
    this.eagle.on(Phaser.Animations.Events.ANIMATION_REPEAT, () => this.audio?.wingFlap());
    this.carryingBanner = true;

    this.tweens.add({
      targets: this.eagle,
      x: -250,
      duration: 2400,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        // Let go once the banner is centered.
        if (this.carryingBanner && this.banner.x <= width / 2) this.dropBanner();
      },
      onComplete: () => this.eagle.destroy(),
    });
  }

  dropBanner() {
    this.carryingBanner = false;
    this.tweens.add({ targets: this.banner, x: this.scale.width / 2, y: 60, duration: 500, ease: 'Bounce.easeOut' });
    // Which table this is: the world's, or just this device's.
    const label = this.add
      .text(this.scale.width / 2, 104, this.tableLabel, { ...TEXT_STYLE, fontSize: '12px', strokeThickness: 4 })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: label, alpha: 1, delay: 400, duration: 400 });
    this.time.delayedCall(300, () => this.flyInRows());
  }

  // Each row swoops in from the right, one after another.
  flyInRows() {
    const { width, height } = this.scale;
    const scores = this.tableScores;
    let lastDelay = 0;
    for (let i = 0; i < HIGH_SCORE_COUNT; i++) {
      const entry = scores[i];
      const line = entry
        ? `${RANKS[i].padEnd(5)}${entry.name.padEnd(5)}${String(entry.score).padStart(7)}   LV${String(entry.level).padStart(2)}`
        : `${RANKS[i].padEnd(5)}${'---'.padEnd(5)}${'0'.padStart(7)}       `;
      const row = this.add
        .text(width + 400, ROW_TOP + i * ROW_SPACING, line, { ...TEXT_STYLE, fontSize: '16px', strokeThickness: 4 })
        .setOrigin(0.5)
        .setColor(entry ? RANK_COLORS[i] ?? '#ffffff' : '#6d7890');
      lastDelay = i * 110;
      this.tweens.add({ targets: row, x: width / 2, delay: lastDelay, duration: 500, ease: 'Back.easeOut' });
      if (i === this.highlight) {
        // The new entry blinks.
        this.tweens.add({ targets: row, alpha: 0.25, delay: lastDelay + 500, duration: 250, yoyo: true, repeat: -1 });
      }
    }

    if (this.highlight < 0 && !this.attract) {
      this.add
        .text(width / 2, ROW_TOP + HIGH_SCORE_COUNT * ROW_SPACING + 12, `YOUR SCORE ${this.score}`, {
          ...TEXT_STYLE,
          fontSize: '16px',
        })
        .setOrigin(0.5);
    }

    this.time.delayedCall(lastDelay + 700, () => {
      this.canLeave = true;
      const prompt = this.add
        .text(width / 2, height - 24, this.attract ? 'INSERT COIN' : isTouchDevice() ? 'TAP TO CONTINUE' : 'PRESS ENTER', {
          ...TEXT_STYLE,
          fontSize: '14px',
          strokeThickness: 4,
        })
        .setOrigin(0.5);
      this.time.addEvent({ delay: 500, loop: true, callback: () => prompt.setVisible(!prompt.visible) });
    });
  }

  // Centered text whose letters bob in a wave. Returns the letter objects.
  wavyText(text, y, fontSize, color) {
    const letters = [...text].map((char) => this.add.text(0, 0, char, { ...TEXT_STYLE, fontSize, color }));
    const totalWidth = letters.reduce((sum, letter) => sum + letter.width, 0);
    let x = (this.scale.width - totalWidth) / 2;
    letters.forEach((letter, i) => {
      letter.setPosition(x, y).setOrigin(0, 0.5);
      x += letter.width;
      this.tweens.add({ targets: letter, y: y - 10, duration: 600, delay: i * 70, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
    });
    return letters;
  }

  update(time) {
    this.water.tilePositionX = Math.round((time / 1000) * WATER_DRIFT.x);
    this.water.tilePositionY = Math.round((time / 1000) * WATER_DRIFT.y);

    if (this.carryingBanner) {
      this.banner.setPosition(this.eagle.x + BANNER_BEHIND, this.eagle.y + 10);
    }

    // A controller: in attract mode any button goes back to the title; while
    // entering initials, up/down change the letter, left/right (or B) move,
    // and A or Start confirm, like the arrow keys and Enter.
    const { pad } = this;
    pad.update(time);
    if (this.attract && pad.any) this.returnToTitle();
    const typing = Boolean(this.initials);
    if (typing) {
      if (pad.pressed('up')) this.changeLetter(1);
      if (pad.pressed('down')) this.changeLetter(-1);
      if (pad.pressed('right')) this.moveSlot(1);
      if (pad.pressed('left') || pad.back) this.moveSlot(-1);
      if (pad.confirm) this.confirmSlot();
    }

    // Read every frame so earlier presses (like confirming the initials) are
    // used up and don't count as leaving once the table is shown.
    const enterPressed = Phaser.Input.Keyboard.JustDown(this.enterKey) || this.tapped || (!typing && pad.confirm);
    this.tapped = false;
    if (this.canLeave && enterPressed) this.returnToTitle();
  }
}
