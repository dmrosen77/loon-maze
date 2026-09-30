import * as Phaser from 'phaser';
import { FONT_FAMILY, TITLE_COLORS } from '../config.js';
import { getLakeAudio } from '../audio.js';
import PadInput from '../ui/gamepad.js';

const TEXT_STYLE = {
  fontFamily: `"${FONT_FAMILY}"`,
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 5,
};

// The pause menu, over the frozen level (GameScene pauses itself and
// launches this). RESUME, RESTART LEVEL (costs HP; greyed out without
// enough), QUIT (to the lake map, or the title in ARCADE) and SOUND.
// Up/down and Enter, a tap, or a gamepad's d-pad and A; Esc, P, or the
// gamepad's Start or B resume.
// Started with { restartCost, canRestart, quitLabel }.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(data) {
    const { width, height } = this.scale;
    this.audio = getLakeAudio(this);
    this.game_ = this.scene.get('GameScene');
    this.add.rectangle(0, 0, width, height, 0x050b14, 0.72).setOrigin(0);
    this.add.text(width / 2, height * 0.24, 'PAUSED', { ...TEXT_STYLE, fontSize: '40px', color: TITLE_COLORS.title }).setOrigin(0.5);

    const restartLabel = data.restartCost > 0 ? `RESTART LEVEL  -${data.restartCost} HP` : 'RESTART LEVEL';
    this.items = [
      { label: 'RESUME', action: () => this.resume() },
      { label: data.canRestart ? restartLabel : 'RESTART (NOT ENOUGH HP)', enabled: data.canRestart, action: () => this.restart() },
      { label: data.quitLabel, action: () => this.quit() },
      { label: this.soundLabel(), action: () => this.toggleSound() },
    ];
    this.items.forEach((item, i) => {
      item.enabled = item.enabled ?? true;
      item.text = this.add
        .text(width / 2, height * 0.42 + i * 44, item.label, { ...TEXT_STYLE, fontSize: '20px' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      item.text.on('pointerdown', () => {
        this.select(i);
        this.activate();
      });
    });
    this.selected = 0;
    this.select(0);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('ENTER,SPACE,ESC,P');
    this.pad = new PadInput();
  }

  soundLabel() {
    return this.audio?.muted ? 'SOUND: OFF' : 'SOUND: ON';
  }

  select(index) {
    this.selected = index;
    this.items.forEach((item, i) => {
      const chosen = i === index;
      item.text
        .setText(chosen ? `> ${item.label} <` : item.label)
        .setColor(!item.enabled ? '#6d7684' : chosen ? TITLE_COLORS.title : '#ffffff');
    });
  }

  move(step) {
    this.select(Phaser.Math.Wrap(this.selected + step, 0, this.items.length));
    this.audio?.blip();
  }

  activate() {
    const item = this.items[this.selected];
    if (!item.enabled) {
      this.audio?.bump();
      return;
    }
    this.audio?.blip(7);
    item.action();
  }

  resume() {
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  restart() {
    this.scene.stop();
    this.game_.restartLevel();
  }

  quit() {
    this.scene.resume('GameScene');
    this.scene.stop();
    this.game_.quit();
  }

  toggleSound() {
    this.audio?.toggleMute();
    const item = this.items[this.selected];
    item.label = this.soundLabel();
    this.select(this.selected);
  }

  update(time) {
    const { JustDown } = Phaser.Input.Keyboard;
    const { pad } = this;
    pad.update(time);
    if (JustDown(this.cursors.up) || pad.pressed('up')) this.move(-1);
    if (JustDown(this.cursors.down) || pad.pressed('down')) this.move(1);
    if (JustDown(this.keys.ENTER) || JustDown(this.keys.SPACE) || (pad.confirm && !pad.start)) this.activate();
    if (JustDown(this.keys.ESC) || JustDown(this.keys.P) || pad.start || pad.back) this.resume();
  }
}
