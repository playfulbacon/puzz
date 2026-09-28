// Sasquatch art: a stretch of Pacific Northwest woods seen from above, split into patches by creeks.
// Hikers in bright jackets cast warm sight beams the way they face; your Sasquatches hide in the
// patches. Reuses the forest pieces (floor, conifers, hikers, the Sasquatch).
import { defs as forestDefs, sky, floor, trees, beams, hikerSvg, sasquatchSvg } from "./forest.js";

const f = (x) => Math.round(x * 10) / 10;
const TINTS = ["#5C7F4E", "#3F6446", "#6E8A4A", "#4D7355", "#587A3F", "#44694E"];

export function geometry(p, s = 60) {
  const topH = Math.round(s * 1.1), botH = Math.round(s * 0.5);
  const W = p.cols * s, Y0 = topH, Yb = Y0 + p.rows * s, H = Yb + botH;
  return { s, W, H, Y0, Yb, cx: (c) => c * s + s / 2, cy: (r) => Y0 + r * s + s / 2 };
}

export const defs = (id) => forestDefs(id);

/** A faint tint per patch so the patches read at a glance, under the creeks. */
export function patches(p, g) {
  const { s } = g, ids = [...new Set(p.regions)].sort();
  let out = "";
  for (let i = 0; i < p.regions.length; i++) {
    const k = ids.indexOf(p.regions[i]);
    out += `<rect x="${(i % p.cols) * s}" y="${g.Y0 + Math.floor(i / p.cols) * s}" width="${s}" height="${s}" fill="${TINTS[(k * 7 + p.seed) % TINTS.length]}"/>`;
  }
  return `<g class="patches" opacity="0.55">${out}</g>`;
}

/** Creeks along every border between two patches (and a bank around the woods). */
export function creeks(p, g) {
  const { s } = g, R = p.rows, C = p.cols;
  let d = "";
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const i = r * C + c, x = c * s, y = g.Y0 + r * s;
    if (c + 1 < C && p.regions[i] !== p.regions[i + 1]) d += `M${x + s} ${y}V${y + s}`;
    if (r + 1 < R && p.regions[i] !== p.regions[i + C]) d += `M${x} ${y + s}H${x + s}`;
  }
  return `<g class="creeks" fill="none" stroke-linecap="round">
    <path d="${d}" stroke="#23404A" stroke-width="${f(s * 0.13)}" stroke-opacity="0.55"/>
    <path d="${d}" stroke="#5F9AB0" stroke-width="${f(s * 0.085)}"/>
    <path d="${d}" stroke="#BFE3EC" stroke-width="${f(s * 0.02)}" stroke-dasharray="${f(s * 0.12)} ${f(s * 0.2)}" stroke-opacity="0.8"/>
    <rect x="1.5" y="${g.Y0 + 1.5}" width="${g.W - 3}" height="${g.Yb - g.Y0 - 3}" stroke="#23404A" stroke-width="3" stroke-opacity="0.6"/>
  </g>`;
}

export function hikersLayer(p, g) {
  const facing = {};
  for (const [c, h] of Object.entries(p.hikers || {})) facing[c] = h.dir;
  const b = beams(p, g, facing);
  let people = "", k = 0;
  for (const [c, h] of Object.entries(p.hikers || {})) {
    const i = +c;
    people += hikerSvg(g.cx(i % p.cols), g.cy(Math.floor(i / p.cols)), g.s, h.dir, null, p.seed * 13 + k++);
  }
  return { beams: b.svg, seen: b.seen, people: `<g class="people">${people}</g>` };
}

export function ground(g) {
  return `<g><rect x="0" y="${g.Yb}" width="${g.W}" height="${g.H - g.Yb}" fill="#4E3C2B"/>
  <text x="${g.s * 0.25}" y="${f(g.Yb + (g.H - g.Yb) / 2)}" class="shore-label light">TRAILHEAD · NO SASQUATCH SIGHTINGS REPORTED</text></g>`;
}

export function family(p, g, cells, cls = "") {
  return `<g class="family">${cells.map((i) => sasquatchSvg(g.cx(i % p.cols), g.cy(Math.floor(i / p.cols)), g.s * 0.92, cls)).join("")}</g>`;
}

export function staticSvg(p, { s = 60, solved = false, id = "wd" + p.seed, cls = "" } = {}) {
  const g = geometry(p, s); g.id = id;
  const h = hikersLayer(p, g);
  return `<svg class="board ${cls}" viewBox="0 0 ${g.W} ${g.H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sasquatch puzzle">
${defs(id)}${sky(p, g)}${floor(p, g)}${patches(p, g)}${h.beams}${creeks(p, g)}${trees(p, g)}${h.people}${solved ? family(p, g, p.solution) : ""}${ground(g)}
</svg>`;
}
