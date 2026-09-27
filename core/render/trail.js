// Sasquatch art: you're the Sasquatch sneaking from the den (a cave in the hillside, bottom) to the
// river (top) through the woods. Hikers face a fixed way and cast warm sight beams; the trail is a
// line of big footprints; when it's done, the Sasquatch walks it to the water.
import { layout } from "../road/engine.js";
import { defs as forestDefs, floor, trees, beams, hikerSvg, sasquatchSvg } from "./forest.js";

const f = (x) => Math.round(x * 10) / 10;
const hash = (n) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 13; x = Math.imul(x, 1274126177) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

export function geometry(p, s = 60) {
  const topH = Math.round(s * 1.15), botH = Math.round(s * 1.25);
  const W = p.cols * s, Y0 = topH, Yb = Y0 + p.rows * s, H = Yb + botH;
  const L = layout(p.rows, p.cols, p.start, p.end);
  return {
    s, W, H, Y0, Yb, X0: 0, L,
    cx: (c) => c * s + s / 2, cy: (r) => Y0 + r * s + s / 2,
    river: [p.end * s + s / 2, Math.round(topH * 0.62)],
    den: [p.start * s + s / 2, Yb + Math.round(botH * 0.42)],
  };
}

export const defs = (id, g) => forestDefs(id) + `<defs><linearGradient id="${id}-river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5F8FA3"/><stop offset="1" stop-color="#3E6E83"/></linearGradient></defs>`;

export function river(p, g) {
  const { W, Y0, s } = g;
  let firs = "", ripples = "";
  for (let x = -s * 0.1; x < W + s * 0.2; x += s * 0.2) {
    const h = s * (0.16 + hash(p.seed * 5 + Math.round(x)) * 0.18);
    firs += `M${f(x)} ${f(Y0 * 0.34)}L${f(x + s * 0.1)} ${f(Y0 * 0.34 - h)}L${f(x + s * 0.2)} ${f(Y0 * 0.34)}Z`;
  }
  for (let k = 0; k < 10; k++) {
    const x = hash(p.seed * 11 + k) * W, y = Y0 * (0.45 + hash(p.seed * 13 + k) * 0.35);
    ripples += `M${f(x)} ${f(y)}q${s * 0.1} -${s * 0.05} ${s * 0.2} 0`;
  }
  const [rx, ry] = g.river;
  return `<g class="river">
  <rect x="0" y="0" width="${W}" height="${Y0}" fill="#C7D6D2"/>
  <path d="${firs}" fill="#2E4B3A"/>
  <rect x="0" y="${f(Y0 * 0.34)}" width="${W}" height="${f(Y0 * 0.56)}" fill="url(#${g.id}-river)"/>
  <path d="${ripples}" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M0 ${f(Y0 * 0.9)}H${W}V${Y0}H0Z" fill="#8C7A5A"/>
  <g transform="translate(${rx} ${ry})"><ellipse rx="${f(s * 0.24)}" ry="${f(s * 0.1)}" fill="#E8F1F2" opacity="0.8"/><ellipse rx="${f(s * 0.12)}" ry="${f(s * 0.05)}" fill="#FFFFFF"/></g>
  <text x="${f(W - s * 0.25)}" y="${f(Y0 * 0.72)}" class="shore-label light" text-anchor="end">THE RIVER</text>
</g>`;
}

export function den(p, g) {
  const { W, Yb, H, s } = g;
  const [dx, dy] = g.den;
  let rocks = "";
  for (let k = 0; k < 14; k++) {
    const x = hash(p.seed * 17 + k) * W, y = Yb + s * (0.35 + hash(p.seed * 19 + k) * 0.8), r = s * (0.08 + hash(k * 7 + p.seed) * 0.1);
    if (Math.abs(x - dx) < s * 0.6) continue;
    rocks += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 1.4)}" ry="${f(r)}" fill="#6E6557"/>`;
  }
  return `<g class="den">
  <path d="M0 ${Yb}H${W}V${H}H0Z" fill="#7C6F5B"/>
  <path d="M0 ${f(Yb + s * 0.25)}Q${f(W * 0.3)} ${f(Yb + s * 0.1)} ${f(W * 0.55)} ${f(Yb + s * 0.3)}T${W} ${f(Yb + s * 0.2)}V${H}H0Z" fill="#5E5446" opacity="0.6"/>
  ${rocks}
  <path d="M${f(dx - s * 0.36)} ${f(dy + s * 0.3)}V${f(dy)}A${f(s * 0.36)} ${f(s * 0.36)} 0 0 1 ${f(dx + s * 0.36)} ${f(dy)}V${f(dy + s * 0.3)}Z" fill="#1E1812" stroke="#3E352A" stroke-width="3"/>
  <text x="${f(dx + (dx < W / 2 ? s * 0.5 : -s * 0.5))}" y="${f(dy + s * 0.12)}" class="shore-label light" text-anchor="${dx < W / 2 ? "start" : "end"}">THE DEN</text>
</g>`;
}

export function hikers(p, g, cls = "") {
  let out = "", k = 0;
  const facing = {};
  for (const [c, h] of Object.entries(p.hikers || {})) facing[c] = h.dir;
  const b = beams(p, g, facing);
  for (const [c, h] of Object.entries(p.hikers || {})) {
    const i = +c;
    out += hikerSvg(g.cx(i % p.cols), g.cy(Math.floor(i / p.cols)), g.s, h.dir, h.n ?? null, p.seed * 13 + k++);
  }
  return { beams: b.svg, people: `<g class="people ${cls}">${out}</g>` };
}

// The trail: a worn path with big footprints along it.
export function trailSvg(g, d) {
  const s = g.s;
  return `<g class="trail" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="${d}" stroke="#2B1E12" stroke-opacity="0.35" stroke-width="${f(s * 0.3)}" transform="translate(1.5 2.5)"/>
    <path d="${d}" stroke="#9C7A52" stroke-width="${f(s * 0.28)}"/>
    <path d="${d}" stroke="#B89468" stroke-width="${f(s * 0.18)}"/>
    <path d="${d}" stroke="#4A3321" stroke-width="${f(s * 0.1)}" stroke-dasharray="${f(s * 0.07)} ${f(s * 0.2)}"/>
  </g>`;
}

/** Ordered squares of the solved trail, den to river. */
function route(p, g) {
  const { L } = g, on = new Set(p.solution), out = [L.S];
  let prev = -1, cur = L.S;
  for (let k = 0; k < L.n && cur !== L.T; k++) {
    let next = -1;
    for (let d = 0; d < 4; d++) { const ed = L.cellEdges[cur][d]; if (ed >= 0 && ed < L.PS && on.has(ed) && L.nb(cur, d) !== prev) { next = L.nb(cur, d); break; } }
    if (next < 0) break;
    prev = cur; cur = next; out.push(cur);
  }
  return out;
}

// Completion: the Sasquatch walks out of the den, along the trail, to the river.
export function walk(p, g) {
  const cells = route(p, g);
  const pts = [[g.den[0], g.den[1]], ...cells.map((c) => [g.cx(c % p.cols), g.cy(Math.floor(c / p.cols))]), [g.river[0], g.river[1] + g.s * 0.1]];
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${f(x)} ${f(y)}`).join("");
  const dur = Math.max(3, cells.length * 0.28);
  return `<g class="walker"><animateMotion dur="${dur}s" fill="freeze" calcMode="linear" path="${d}"/>${sasquatchSvg(0, 0, g.s, "waving")}</g>`;
}

export function staticSvg(p, { s = 60, solved = false, id = "tr" + p.seed, cls = "" } = {}) {
  const g = geometry(p, s); g.id = id;
  const h = hikers(p, g);
  let trail = "";
  if (solved) {
    const cells = route(p, g);
    const pts = [[g.den[0], g.den[1]], ...cells.map((c) => [g.cx(c % p.cols), g.cy(Math.floor(c / p.cols))]), [g.river[0], g.river[1]]];
    trail = trailSvg(g, pts.map(([x, y], i) => `${i ? "L" : "M"}${f(x)} ${f(y)}`).join(""));
  }
  return `<svg class="board ${cls}" viewBox="0 0 ${g.W} ${g.H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sasquatch puzzle">
${defs(id, g)}${river(p, g)}${floor(p, g)}${h.beams}${trees(p, g)}${den(p, g)}${trail}${h.people}${solved ? sasquatchSvg(g.river[0], g.river[1] + g.s * 0.1, g.s) : ""}
</svg>`;
}
