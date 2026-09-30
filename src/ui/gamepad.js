import * as Phaser from 'phaser';

// Gamepad (controller) support, read straight from the browser's Gamepad API
// every frame. Works with any controller the browser maps to the standard
// layout (Xbox, PlayStation, Switch Pro and most others). Button names here
// are Xbox's; on PlayStation A is Cross and B is Circle.
//   Left stick or d-pad: swim, and move around menus and the lake map.
//   A: dive (hold), and confirm. RB or RT also dive.
//   Start: confirm; in a level, pause.
//   B: back.  Select (View / Share): mute.
// Browsers only reveal a controller after one of its buttons is pressed.

const BUTTONS = { A: 0, B: 1, RB: 5, RT: 7, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
// The stick has to move this far (0 to 1) before it counts, so a resting
// stick that doesn't sit exactly at zero doesn't swim.
const DEAD_ZONE = 0.2;
// For menus, the stick counts as a direction pressed past this.
const MENU_TILT = 0.6;
// Holding a direction in a menu repeats it, after this delay, this often.
const REPEAT_DELAY_MS = 380;
const REPEAT_EVERY_MS = 130;
const DIRECTIONS = ['up', 'down', 'left', 'right'];

function firstPad() {
  const pads = navigator.getGamepads?.() ?? [];
  return [...pads].find((pad) => pad?.connected) ?? null;
}

export function isGamepadConnected() {
  return firstPad() !== null;
}

// What's held on a pad right now: button indexes, plus 'up'/'down'/'left'/'right'
// from the d-pad or a firmly tilted stick.
function heldOn(pad) {
  const held = new Set();
  if (!pad) return held;
  pad.buttons.forEach((button, index) => {
    if (button?.pressed || button?.value > 0.5) held.add(index);
  });
  const [x = 0, y = 0] = pad.axes;
  if (held.has(BUTTONS.UP) || y < -MENU_TILT) held.add('up');
  if (held.has(BUTTONS.DOWN) || y > MENU_TILT) held.add('down');
  if (held.has(BUTTONS.LEFT) || x < -MENU_TILT) held.add('left');
  if (held.has(BUTTONS.RIGHT) || x > MENU_TILT) held.add('right');
  return held;
}

// One per scene: call update(time) at the start of the scene's update(),
// then ask what happened. Anything already held when it's made (like the A
// press that opened this screen) is ignored until it's let go.
export default class PadInput {
  constructor() {
    this.held = heldOn(firstPad());
    this.ignored = new Set(this.held);
    this.fresh = new Set(); // Newly pressed this frame (or repeating, for directions).
    this.repeatAt = {};
  }

  update(time) {
    this.pad = firstPad();
    const held = heldOn(this.pad);
    this.fresh = new Set();
    for (const key of this.ignored) if (!held.has(key)) this.ignored.delete(key);
    for (const key of held) {
      if (this.ignored.has(key)) continue;
      if (!this.held.has(key)) {
        this.fresh.add(key);
        if (DIRECTIONS.includes(key)) this.repeatAt[key] = time + REPEAT_DELAY_MS;
      } else if (DIRECTIONS.includes(key) && time >= this.repeatAt[key]) {
        this.fresh.add(key);
        this.repeatAt[key] = time + REPEAT_EVERY_MS;
      }
    }
    this.held = held;
  }

  get connected() {
    return this.pad !== null && this.pad !== undefined;
  }

  // Menu directions ('up', 'down', 'left', 'right'), with auto-repeat.
  pressed(direction) {
    return this.fresh.has(direction);
  }

  get confirm() {
    return this.fresh.has(BUTTONS.A) || this.fresh.has(BUTTONS.START);
  }

  get back() {
    return this.fresh.has(BUTTONS.B);
  }

  get start() {
    return this.fresh.has(BUTTONS.START);
  }

  get mute() {
    return this.fresh.has(BUTTONS.SELECT);
  }

  // Any button at all, just pressed (for inserting a coin, or leaving attract mode).
  get any() {
    return [...this.fresh].some((key) => typeof key === 'number');
  }

  get diveHeld() {
    return [BUTTONS.A, BUTTONS.RB, BUTTONS.RT].some((button) => this.held.has(button) && !this.ignored.has(button));
  }

  // Swimming: the left stick (strength 0 to 1, like the touch joystick), or
  // the d-pad at full strength. Zero if neither.
  stick() {
    const vector = new Phaser.Math.Vector2();
    if (!this.pad) return vector;
    const [x = 0, y = 0] = this.pad.axes;
    const tilt = Math.min(1, Math.hypot(x, y));
    if (tilt > DEAD_ZONE) {
      return vector.set(x, y).normalize().scale((tilt - DEAD_ZONE) / (1 - DEAD_ZONE));
    }
    const dx = (this.held.has(BUTTONS.RIGHT) ? 1 : 0) - (this.held.has(BUTTONS.LEFT) ? 1 : 0);
    const dy = (this.held.has(BUTTONS.DOWN) ? 1 : 0) - (this.held.has(BUTTONS.UP) ? 1 : 0);
    return vector.set(dx, dy).normalize();
  }
}
