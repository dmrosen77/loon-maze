import * as Phaser from 'phaser';
import { LAKES } from '../lakes.js';

// A map of Maine for the lake map: the state's outline (coarse, from real
// longitude/latitude), its neighbors (New Hampshire, Quebec, New Brunswick)
// as muted land, the Atlantic left clear, and the five lakes in blue at their
// real spots. It's drawn small and scaled up, so it has the game's chunky
// pixels.

// Maine's land border, from Kittery north along New Hampshire, around Quebec,
// and down New Brunswick to Eastport. [longitude, latitude]
const BORDER = [
  [-70.7, 43.08], [-70.82, 43.23], [-70.98, 43.37], [-70.96, 43.55], [-71.0, 43.93], [-71.03, 44.5],
  [-71.08, 45.3], [-70.9, 45.34], [-70.82, 45.43], [-70.63, 45.6], [-70.4, 45.73], [-70.3, 45.95],
  [-70.25, 46.1], [-70.05, 46.4], [-70.02, 46.7], [-69.72, 47.0], [-69.23, 47.45], [-69.05, 47.3],
  [-68.9, 47.18], [-68.6, 47.25], [-68.37, 47.35], [-68.1, 47.25], [-67.79, 47.07], [-67.78, 46.6],
  [-67.78, 45.95], [-67.62, 45.75], [-67.43, 45.6], [-67.46, 45.3], [-67.2, 45.18], [-67.03, 44.9],
];
// The coast, from Eastport back down to Kittery, with its biggest bays
// (Frenchman and Mount Desert, Penobscot, Casco).
const COAST = [
  [-67.1, 44.7], [-67.3, 44.62], [-67.55, 44.5], [-67.75, 44.48], [-67.9, 44.4], [-68.1, 44.33],
  [-68.2, 44.45], [-68.3, 44.24], [-68.45, 44.2], [-68.55, 44.3], [-68.75, 44.33], [-68.82, 44.5],
  [-68.95, 44.33], [-69.05, 44.08], [-69.25, 43.93], [-69.45, 43.95], [-69.55, 43.8], [-69.7, 43.86],
  [-69.85, 43.72], [-70.0, 43.84], [-70.18, 43.66], [-70.25, 43.55], [-70.38, 43.4], [-70.55, 43.25],
  [-70.62, 43.12],
];

// The area the map shows.
const WEST = -71.6;
const EAST = -66.6;
const SOUTH = 42.7;
const NORTH = 47.6;
// Longitude degrees are shorter than latitude ones this far north.
const LON_SQUASH = Math.cos((45.2 * Math.PI) / 180);

const PIXEL = 3; // Screen pixels per map pixel.

const COLORS = {
  neighbors: '#2c3a2b',
  maine: '#467838',
  maineDark: '#3b6830',
  coast: '#1c2b1b',
  lake: '#7cc0ea',
  lakeEdge: '#2b5f86',
};

// The map's width for a given height, keeping real proportions.
export function mapWidthForHeight(height) {
  return Math.round((height * (EAST - WEST) * LON_SQUASH) / (NORTH - SOUTH));
}

// Draws the map image with its top-left at (x, y), `height` tall, and returns
// the image plus `project(lat, lon)`, which gives a spot's screen position.
export function addMaineMap(scene, x, y, height, { depth = 0 } = {}) {
  const width = mapWidthForHeight(height);
  const w = Math.round(width / PIXEL);
  const h = Math.round(height / PIXEL);
  const toMap = ([lon, lat]) => [((lon - WEST) / (EAST - WEST)) * w, ((NORTH - lat) / (NORTH - SOUTH)) * h];

  const key = `maine-map-${w}x${h}`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, w, h);
    const ctx = texture.getContext();
    const path = (points) => {
      ctx.beginPath();
      points.map(toMap).forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      ctx.closePath();
    };

    // Neighbors: everything west and north of the border, plus New Brunswick
    // east of it, out to the map's edges (and Massachusetts in the corner).
    path([...BORDER, [-66.6, 44.95], [EAST, NORTH], [WEST, NORTH], [WEST, SOUTH], [-70.85, SOUTH]]);
    ctx.fillStyle = COLORS.neighbors;
    ctx.fill();

    // Maine, speckled with darker forest, with a dark coastline.
    path([...BORDER, ...COAST]);
    ctx.fillStyle = COLORS.maine;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const rng = new Phaser.Math.RandomDataGenerator(['maine']);
    ctx.fillStyle = COLORS.maineDark;
    for (let i = 0; i < (w * h) / 6; i++) ctx.fillRect(rng.between(0, w), rng.between(0, h), 1, 1);
    ctx.restore();
    path([...BORDER, ...COAST]);
    ctx.strokeStyle = COLORS.coast;
    ctx.lineWidth = 1;
    ctx.stroke();

    // The lakes. Moosehead is long and narrow, running north-northwest.
    for (const { name, lat, lon } of LAKES) {
      const [px, py] = toMap([lon, lat]);
      const big = name === 'Moosehead';
      ctx.beginPath();
      ctx.ellipse(px, py, big ? 2.2 : 1.8, big ? 6.5 : 1.8, big ? -0.35 : 0, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.lake;
      ctx.fill();
      ctx.strokeStyle = COLORS.lakeEdge;
      ctx.stroke();
    }
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  const image = scene.add.image(x, y, key).setOrigin(0).setScale(PIXEL).setDepth(depth);
  const project = (lat, lon) => {
    const [px, py] = toMap([lon, lat]);
    return { x: x + px * PIXEL, y: y + py * PIXEL };
  };
  return { image, width, height, project };
}
