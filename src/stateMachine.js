// A tiny explicit state machine for the stages a scene or game system moves
// through, in place of several booleans that could disagree (a level that is
// both "won" and "lost", a screen that is "leaving" twice).
//
//   this.state = new StateMachine('GameScene', 'playing', {
//     playing: ['won', 'lost', 'leaving'],
//     won: [], lost: [], leaving: [],
//   });
//   this.state.is('playing')     // or .is('won', 'lost'), or .current
//   this.state.to('won')         // true if it moved, false if not allowed from here
//
// A move that isn't in the table is refused, so the first of two racing
// events wins (reaching the chick on the frame the last HP goes, say) and the
// caller can just `if (!this.state.to('won')) return;`. A misspelled state
// name throws, so typos show up at once. `history` keeps the last few
// states, for checking from the console or a test script: `__game.scene.getScene('GameScene').state.history`.
const HISTORY = 12;

export default class StateMachine {
  constructor(name, initial, transitions) {
    this.name = name;
    this.transitions = transitions;
    this.current = initial;
    this.history = [initial];
    for (const [from, targets] of Object.entries(transitions)) {
      for (const to of targets) {
        if (!(to in transitions)) throw new Error(`${name}: ${from} -> ${to}, but ${to} isn't a state`);
      }
    }
    if (!(initial in transitions)) throw new Error(`${name}: ${initial} isn't a state`);
  }

  is(...states) {
    return states.includes(this.current);
  }

  can(next) {
    return this.transitions[this.current].includes(next);
  }

  to(next) {
    if (!(next in this.transitions)) throw new Error(`${this.name}: ${next} isn't a state`);
    if (!this.can(next)) return false;
    this.current = next;
    this.history.push(next);
    if (this.history.length > HISTORY) this.history.shift();
    return true;
  }
}
