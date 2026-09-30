// The lakes of LAKES mode: five Maine lakes, smallest to largest, so bigger
// lakes have bigger mazes. Each lake is DAYS_PER_LAKE days, and each day is
// one level per time of day (dawn, day, sunset, night): 16 levels a lake.
// `lat`/`lon` place them on the map of Maine (src/art/maineMap.js).
import { TIME_OF_DAY } from './config.js';

export const LAKES = [
  { name: 'Cobbosseecontee', lat: 44.25, lon: -69.93 },
  { name: 'Rangeley', lat: 44.96, lon: -70.7 },
  { name: 'Mooselookmeguntic', lat: 44.9, lon: -70.8 },
  { name: 'Sebago', lat: 43.85, lon: -70.57 },
  { name: 'Moosehead', lat: 45.63, lon: -69.72 },
];
export const DAYS_PER_LAKE = 4;
export const TIMES_PER_DAY = TIME_OF_DAY.length;
export const LEVELS_PER_LAKE = DAYS_PER_LAKE * TIMES_PER_DAY;

const titleCase = (word) => word.charAt(0) + word.slice(1).toLowerCase();

// Everything about one lake level (number 1-16). `d` is its difficulty step:
// each day in a lake is one step harder, and each lake starts one step easier
// than the last lake finished (a sawtooth: lake 2's Day 1 is lake 1's Day 2).
export function lakeLevel(lake, number) {
  const day = Math.floor((number - 1) / TIMES_PER_DAY);
  const time = (number - 1) % TIMES_PER_DAY;
  const { name } = LAKES[lake];
  const key = `${name.toLowerCase()}-${number}`;
  return {
    lake,
    number,
    day,
    time,
    d: lake * 2 + day,
    name,
    key,
    seed: `loon-maze-${key}`,
    dayLabel: `Day ${day + 1} - ${titleCase(TIME_OF_DAY[time].name)}`,
  };
}
