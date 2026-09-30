import * as Phaser from 'phaser';
import {
  TILE_SIZE,
  SPRITE_PIXEL_SIZE,
  WATER_DRIFT,
  FONT_FAMILY,
  TITLE_COLORS,
  TIME_OF_DAY,
  LAKE_UNLOCK_STARS,
  LAKE_FEATURES,
} from '../config.js';
import { STAR, STAR_EMPTY, LOCK, makePixelTexture, makeWaterTexture } from '../art/pixelArt.js';
import { addMaineMap } from '../art/maineMap.js';
import { getLakeAudio } from '../audio.js';
import { isTouchDevice, addMuteButton } from '../ui/touch.js';
import { LAKES, DAYS_PER_LAKE, TIMES_PER_DAY, LEVELS_PER_LAKE } from '../lakes.js';
import {
  lakeStars,
  totalStars,
  isLakeUnlocked,
  isLevelUnlocked,
  levelRecord,
  isLessonDone,
} from '../progress.js';

const TEXT_STYLE = {
  fontFamily: `"${FONT_FAMILY}"`,
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 4,
};
const YELLOW = TITLE_COLORS.title;
const STARS_PER_LAKE = LEVELS_PER_LAKE * 3;

// Button colors for each time of day (dawn, day, sunset, night).
const TIME_COLORS = [0x6a4c7c, 0x2f6d9e, 0xa0593a, 0x26365f];
const LOCKED_COLOR = 0x1d2530;

// Where a lake's marker sits relative to the lake itself, for the two lakes
// that are only a few miles apart (Rangeley and Mooselookmeguntic).
const MARKER_NUDGE = { Rangeley: { x: 16, y: -12 }, Mooselookmeguntic: { x: -18, y: 12 } };

// The LAKES mode map, in two views:
// - 'lakes': a map of Maine with the five lakes, and a list of them with
//   their stars (locked ones say how many stars open them).
// - 'lake': one lake's 16 levels, as 4 days (rows) of dawn, day, sunset and
//   night (columns), with each level's best stars and score, plus a DIVE
//   LESSON button at the first diving lake.
// Started with { view, lake, select (a level number), notice (a message) }.
export default class LakeMapScene extends Phaser.Scene {
  constructor() {
    super('LakeMapScene');
  }

  create(data = {}) {
    this.view = data.view ?? 'lakes';
    this.leaving = false;
    this.selected = undefined; // A restarted scene keeps its old fields.
    this.audio = getLakeAudio(this);
    this.audio?.playMusic('title');

    makeWaterTexture(this, TILE_SIZE, SPRITE_PIXEL_SIZE);
    makePixelTexture(this, 'star-map', STAR, 2);
    makePixelTexture(this, 'star-map-empty', STAR_EMPTY, 2);
    makePixelTexture(this, 'lock', LOCK, 3);

    const { width, height } = this.scale;
    this.water = this.add.tileSprite(0, 0, width, height, 'water').setOrigin(0).setTileScale(2).setTint(TITLE_COLORS.waterTint);

    if (this.view === 'lakes') this.buildLakesView(data);
    else this.buildLakeView(data);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.muteKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    addMuteButton(this, this.audio, width - 12, 12);
    if (data.notice) this.showNotice(data.notice);
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // ----- The lakes view: a map of Maine and the list of lakes.

  buildLakesView(data) {
    const { width, height } = this.scale;
    const mapHeight = height - 60;
    const map = addMaineMap(this, 20, 30, mapHeight);
    this.add.rectangle(20, 30, map.width, map.height).setOrigin(0).setStrokeStyle(3, 0x0b1320);
    this.add.text(20 + map.width * 0.6, 30 + map.height * 0.9, 'ATLANTIC', { ...TEXT_STYLE, fontSize: '10px', color: '#9fc3e0' }).setOrigin(0.5);
    this.add.text(20 + map.width * 0.68, 30 + map.height * 0.3, 'MAINE', { ...TEXT_STYLE, fontSize: '14px', color: '#d6e8c8' }).setOrigin(0.5).setAlpha(0.8);

    // The list, to the right of the map.
    const listX = 20 + map.width + 24;
    const listWidth = width - listX - 20;
    this.add.text(listX + listWidth / 2, 40, 'MAINE LAKES', { ...TEXT_STYLE, fontSize: '24px', color: YELLOW }).setOrigin(0.5);
    this.add.image(listX + listWidth / 2 - 50, 74, 'star-map');
    this.add.text(listX + listWidth / 2 - 36, 74, `${totalStars()}/${STARS_PER_LAKE * LAKES.length}`, { ...TEXT_STYLE, fontSize: '14px' }).setOrigin(0, 0.5);

    this.items = LAKES.map((lake, index) => {
      const open = isLakeUnlocked(index);
      const y = 100 + index * 90;
      const card = this.add
        .rectangle(listX, y, listWidth, 80, 0x0b1320, 0.72)
        .setOrigin(0)
        .setStrokeStyle(2, 0x3a4a60)
        .setInteractive({ useHandCursor: true });
      const color = open ? '#ffffff' : '#8792a2';
      this.add.text(listX + 14, y + 14, `${index + 1}`, { ...TEXT_STYLE, fontSize: '16px', color: YELLOW });
      this.add.text(listX + 44, y + 14, lake.name.toUpperCase(), { ...TEXT_STYLE, fontSize: '16px', color });
      if (open) {
        this.add.image(listX + 52, y + 54, 'star-map');
        this.add.text(listX + 66, y + 54, `${lakeStars(index)}/${STARS_PER_LAKE}`, { ...TEXT_STYLE, fontSize: '12px' }).setOrigin(0, 0.5);
        const dives = LAKE_FEATURES[index].dives;
        const note = dives > 0 ? `${dives} DIVE${dives > 1 ? 'S' : ''} PER LEVEL` : 'NO DIVING YET';
        this.add.text(listX + listWidth - 14, y + 54, note, { ...TEXT_STYLE, fontSize: '10px', color: '#9fc3e0' }).setOrigin(1, 0.5);
      } else {
        this.add.image(listX + 52, y + 54, 'lock');
        const previous = LAKES[index - 1].name.toUpperCase();
        this.add
          .text(listX + 70, y + 54, `NEED ${LAKE_UNLOCK_STARS} STARS IN\n${previous}`, { ...TEXT_STYLE, fontSize: '10px', color: '#aab3c0', lineSpacing: 4 })
          .setOrigin(0, 0.5);
      }

      // The lake's marker on the map, numbered like the list.
      const spot = map.project(lake.lat, lake.lon);
      const nudge = MARKER_NUDGE[lake.name] ?? { x: 0, y: 0 };
      const markerX = spot.x + nudge.x;
      const markerY = spot.y + nudge.y;
      if (nudge.x || nudge.y) this.add.line(0, 0, spot.x, spot.y, markerX, markerY, 0xffffff, 0.8).setOrigin(0);
      const marker = this.add.circle(markerX, markerY, 11, open ? 0x2f6d9e : 0x4a525e).setStrokeStyle(2, 0xffffff);
      this.add.text(markerX, markerY + 1, `${index + 1}`, { ...TEXT_STYLE, fontSize: '10px', strokeThickness: 3 }).setOrigin(0.5);

      card.on('pointerdown', () => {
        this.select(index);
        this.activate();
      });
      marker.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.select(index);
        this.activate();
      });
      return { card, marker, open, lake: index };
    });

    this.drawPrompt(isTouchDevice() ? 'TAP A LAKE' : 'ARROWS: CHOOSE   ENTER: OPEN   ESC: BACK');
    const first = data.lake ?? LAKES.findLastIndex((_, i) => isLakeUnlocked(i));
    this.select(Math.max(0, first));
  }

  // ----- The lake view: 4 days of dawn, day, sunset and night.

  buildLakeView(data) {
    const { width } = this.scale;
    this.lake = data.lake ?? 0;
    const lake = LAKES[this.lake];
    this.add.text(width / 2, 34, lake.name.toUpperCase(), { ...TEXT_STYLE, fontSize: '24px', color: YELLOW }).setOrigin(0.5);
    this.add.image(width / 2 - 40, 66, 'star-map');
    this.add.text(width / 2 - 26, 66, `${lakeStars(this.lake)}/${STARS_PER_LAKE}`, { ...TEXT_STYLE, fontSize: '14px' }).setOrigin(0, 0.5);

    const buttonW = 124;
    const buttonH = 76;
    const gap = 12;
    const labelW = 84;
    const gridX = (width - (labelW + TIMES_PER_DAY * buttonW + (TIMES_PER_DAY - 1) * gap)) / 2 + labelW;
    const gridY = 118;
    TIME_OF_DAY.forEach((phase, time) => {
      this.add.text(gridX + time * (buttonW + gap) + buttonW / 2, gridY - 14, phase.name, { ...TEXT_STYLE, fontSize: '12px' }).setOrigin(0.5);
    });

    this.items = [];
    for (let day = 0; day < DAYS_PER_LAKE; day++) {
      const rowY = gridY + day * (buttonH + gap);
      this.add.text(gridX - 14, rowY + buttonH / 2, `DAY ${day + 1}`, { ...TEXT_STYLE, fontSize: '12px' }).setOrigin(1, 0.5);
      for (let time = 0; time < TIMES_PER_DAY; time++) {
        const number = day * TIMES_PER_DAY + time + 1;
        const x = gridX + time * (buttonW + gap);
        const open = isLevelUnlocked(this.lake, number);
        const record = levelRecord(this.lake, number);
        const card = this.add
          .rectangle(x, rowY, buttonW, buttonH, open ? TIME_COLORS[time] : LOCKED_COLOR, open ? 0.9 : 0.8)
          .setOrigin(0)
          .setStrokeStyle(2, 0x0b1320)
          .setInteractive({ useHandCursor: true });
        this.add.text(x + 6, rowY + 5, `${number}`, { ...TEXT_STYLE, fontSize: '10px', color: open ? '#ffffff' : '#7a8594' });
        if (open) {
          for (let s = 0; s < 3; s++) {
            this.add.image(x + buttonW / 2 + (s - 1) * 24, rowY + 34, s < (record?.stars ?? 0) ? 'star-map' : 'star-map-empty');
          }
          this.add
            .text(x + buttonW / 2, rowY + buttonH - 12, record ? `${record.score}` : 'NEW', { ...TEXT_STYLE, fontSize: '10px', color: record ? '#ffffff' : YELLOW })
            .setOrigin(0.5);
        } else {
          this.add.image(x + buttonW / 2, rowY + buttonH / 2, 'lock');
        }
        const item = { card, open, number, row: day, col: time };
        card.on('pointerdown', () => {
          this.select(this.items.indexOf(item));
          this.activate();
        });
        this.items.push(item);
      }
    }

    // The dive lesson, replayable at the first lake with diving (once it's been done).
    const lessonLake = LAKE_FEATURES.findIndex((features) => features.dives > 0);
    if (this.lake === lessonLake && isLessonDone()) {
      const y = gridY + DAYS_PER_LAKE * (buttonH + gap) + 8;
      const card = this.add
        .rectangle(width / 2 - 110, y, 220, 34, 0x2f6d9e, 0.9)
        .setOrigin(0)
        .setStrokeStyle(2, 0x0b1320)
        .setInteractive({ useHandCursor: true });
      this.add.text(width / 2, y + 17, 'DIVE LESSON', { ...TEXT_STYLE, fontSize: '12px' }).setOrigin(0.5);
      const item = { card, open: true, lesson: true, row: DAYS_PER_LAKE, col: 0 };
      card.on('pointerdown', () => {
        this.select(this.items.indexOf(item));
        this.activate();
      });
      this.items.push(item);
    }

    this.drawPrompt(isTouchDevice() ? 'TAP A LEVEL' : 'ARROWS: CHOOSE   ENTER: PLAY   ESC: LAKES');
    const select = data.select ?? this.items.findLast((item) => item.open && !item.lesson)?.number ?? 1;
    const index = this.items.findIndex((item) => item.number === Math.min(select, LEVELS_PER_LAKE));
    this.select(Math.max(0, index));

    // A back button for touch screens.
    if (isTouchDevice()) {
      this.add
        .text(12, 12, '< LAKES', { ...TEXT_STYLE, fontSize: '12px', backgroundColor: 'rgba(0, 0, 0, 0.35)', padding: { x: 8, y: 6 } })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.back());
    }
  }

  // ----- Shared.

  drawPrompt(text) {
    const { width, height } = this.scale;
    this.add.text(width / 2, height - 16, text, { ...TEXT_STYLE, fontSize: '12px' }).setOrigin(0.5);
  }

  // A blue message that fades, like the in-game callouts.
  showNotice(text) {
    const { width, height } = this.scale;
    const notice = this.add
      .text(width / 2, height / 2, text, { ...TEXT_STYLE, fontSize: '28px', color: '#4fb3ff', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(10);
    this.audio?.heal();
    this.tweens.add({ targets: notice, alpha: 0, delay: 1800, duration: 700, onComplete: () => notice.destroy() });
  }

  select(index) {
    if (this.selected !== undefined) {
      const old = this.items[this.selected];
      old.card.setStrokeStyle(2, this.view === 'lakes' ? 0x3a4a60 : 0x0b1320);
      if (old.marker) {
        this.tweens.killTweensOf(old.marker);
        old.marker.setScale(1);
      }
    }
    this.selected = index;
    const item = this.items[index];
    item.card.setStrokeStyle(4, 0xffd54f);
    if (item.marker) this.tweens.add({ targets: item.marker, scale: 1.35, duration: 450, yoyo: true, repeat: -1 });
  }

  move(dx, dy) {
    let next = this.selected;
    if (this.view === 'lakes') {
      next = Phaser.Math.Clamp(this.selected + dx + dy, 0, this.items.length - 1);
    } else {
      const current = this.items[this.selected];
      const row = current.row + dy;
      const col = current.lesson ? (dx < 0 ? TIMES_PER_DAY - 1 : 0) : current.col + dx;
      const target =
        this.items.find((item) => item.row === row && (item.lesson || item.col === col)) ??
        this.items.find((item) => item.row === current.row && !current.lesson && item.col === col);
      if (target) next = this.items.indexOf(target);
    }
    if (next !== this.selected) {
      this.audio?.blip();
      this.select(next);
    }
  }

  // Enter or a tap on the selected item.
  activate() {
    if (this.leaving) return;
    const item = this.items[this.selected];
    if (!item.open) {
      this.audio?.bump();
      this.tweens.add({ targets: item.card, x: item.card.x + 6, duration: 50, yoyo: true, repeat: 2 });
      return;
    }
    this.audio?.blip(7);
    if (this.view === 'lakes') this.go('LakeMapScene', { view: 'lake', lake: item.lake });
    else if (item.lesson) this.go('GameScene', { lesson: true, then: null });
    else this.startLevel(this.lake, item.number);
  }

  // Plays a lake level, with the dive lesson first if it's the first diving
  // level this device has played.
  startLevel(lake, number) {
    const level = { mode: 'lakes', lake, number };
    if (LAKE_FEATURES[lake].dives > 0 && !isLessonDone()) this.go('GameScene', { lesson: true, then: level });
    else this.go('GameScene', level);
  }

  back() {
    if (this.view === 'lake') this.go('LakeMapScene', { view: 'lakes', lake: this.lake });
    else this.go('TitleScene');
  }

  go(scene, data) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(scene, data));
  }

  update(time) {
    this.water.tilePositionX = Math.round((time / 1000) * WATER_DRIFT.x);
    this.water.tilePositionY = Math.round((time / 1000) * WATER_DRIFT.y);
    if (this.leaving) return;

    const { JustDown } = Phaser.Input.Keyboard;
    if (JustDown(this.muteKey)) this.audio?.toggleMute();
    if (JustDown(this.cursors.left)) this.move(-1, 0);
    if (JustDown(this.cursors.right)) this.move(1, 0);
    if (JustDown(this.cursors.up)) this.move(0, -1);
    if (JustDown(this.cursors.down)) this.move(0, 1);
    if (JustDown(this.enterKey)) this.activate();
    if (JustDown(this.escKey)) this.back();
  }
}
