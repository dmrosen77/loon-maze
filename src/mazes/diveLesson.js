// The dive lesson, played once before DIVE_UNLOCK_LEVEL: four rooms in a row,
// each walled off from the next by a different kind of wall, so getting to
// the chick teaches how each one dives. Like maze1.js, plus letters for the
// special walls and patches (see terrain.js):
//   L  floating log (quick to dive under)
//   D  beaver dam (slow to dive through)
//   R  rock (can't dive under; this wall has one reed gap)
//   M  lily pad mat (slow on the surface)
export default [
  '#####################',
  '#....L....D....R....#',
  '#....L..M.D....R....#',
  '#.P..L..M.D....#..B.#',
  '#....L..M.D....R....#',
  '#....L....D....R....#',
  '#####################',
];

// What the lesson says at the bottom of the screen, by room: the hint whose
// `fromCol` the loon has most recently passed. {DIVE} becomes SPACE or DIVE.
export const LESSON_HINTS = [
  { fromCol: 0, text: 'SWIM UP TO THE LOG, HOLD {DIVE}\nAND DIVE UNDER IT. LOGS ARE QUICK!' },
  { fromCol: 6, text: 'LILY PADS SLOW YOU DOWN.\nDAMS ARE SLOW: DIVE RIGHT BESIDE IT' },
  { fromCol: 11, text: "YOU CAN'T DIVE UNDER ROCKS.\nFIND THE REEDS AND DIVE THERE" },
  { fromCol: 16, text: 'NOW SWIM TO YOUR CHICK!' },
];
