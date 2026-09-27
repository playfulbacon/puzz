// Cable Cars art: a terraced city on the hills above the bay. Heights are shaded terraces with
// contour lines, houses are Painted Ladies, lines are colour-coded rails, and when the puzzle is
// solved little cable cars ride their lines back and forth.
import { layout } from "../tracks/engine.js";

export const LINE_COLORS = ["#B8322A", "#2F6B4F", "#2E5A8A", "#8A5A2E"];
export const LINE_NAMES = ["Powell–Hyde", "Powell–Mason", "California", "Van Ness"];
const TERRACE = ["#F2ECDD", "#E0CFA9", "#C9AD7C", "#A98A5A"];
const CONTOUR = "#8C7350";
const INK = "#2A2622";
const PASTELS = ["#E9B7B5", "#A9C6DB", "#F1D98E", "#B8D6AE", "#D5C1E0", "#F2C7A0"];

const hash = (n) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 13; x = Math.imul(x, 1274126177) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const f = (x) => Math.round(x * 10) / 10;

export function geometry(p, s = 60) {
  const topH = Math.round(s * 1.1), botH = Math.round(s * 0.45);
  const W = p.cols * s, Y0 = topH, Yb = Y0 + p.rows * s, H = Yb + botH;
  return { s, W, H, Y0, Yb, topH, L: layout(p.rows, p.cols), cx: (c) => c * s + s / 2, cy: (r) => Y0 + r * s + s / 2 };
}

export function defs(id, g) {
  return `<defs>
  <linearGradient id="${id}-bay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FC3D4"/><stop offset="0.45" stop-color="#5E93AE"/><stop offset="1" stop-color="#2F6A87"/></linearGradient>
  <pattern id="${id}-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="${CONTOUR}" stroke-opacity="0.12" stroke-width="2"/></pattern>
</defs>`;
}

// The bay across the top, with Alcatraz and a sailboat.
export function bay(p, g) {
  const { W, topH, s } = g;
  const ax = W * (0.3 + hash(p.seed) * 0.4), ay = topH * 0.42;
  let waves = "";
  for (let k = 0; k < 9; k++) {
    const x = hash(p.seed * 5 + k) * W, y = topH * (0.25 + hash(p.seed * 9 + k) * 0.6);
    waves += `M${f(x)} ${f(y)}q${s * 0.08} -${s * 0.06} ${s * 0.16} 0`;
  }
  const bx = (ax + W * 0.45) % (W - s) + s * 0.3, by = topH * 0.68;
  return `<g class="bay">
  <rect x="0" y="0" width="${W}" height="${topH}" fill="url(#${g.id}-bay)"/>
  <path d="${waves}" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <g transform="translate(${f(ax)} ${f(ay)})">
    <path d="M${-s * 0.55} ${s * 0.12}Q${-s * 0.3} ${-s * 0.08} 0 ${-s * 0.1}Q${s * 0.35} ${-s * 0.1} ${s * 0.6} ${s * 0.12}Z" fill="#6E6A5E"/>
    <rect x="${-s * 0.18}" y="${-s * 0.24}" width="${s * 0.36}" height="${s * 0.16}" fill="#D8D2C2"/>
    <rect x="${s * 0.12}" y="${-s * 0.42}" width="${s * 0.05}" height="${s * 0.22}" fill="#D8D2C2"/>
  </g>
  <g transform="translate(${f(bx)} ${f(by)})"><path d="M0 0L${s * 0.1} ${-s * 0.34}L${s * 0.1} 0Z" fill="#F7F3EA"/><path d="M${-s * 0.04} ${s * 0.02}H${s * 0.2}L${s * 0.16} ${s * 0.07}H0Z" fill="#7A2E24"/></g>
  <text x="${W - s * 0.25}" y="${f(topH * 0.3)}" class="shore-label light" text-anchor="end">SAN FRANCISCO BAY</text>
</g>`;
}

export function terrain(p, g) {
  const { s, L } = g, h = Array.from(p.heights, Number);
  let tiles = "", contours = "", nums = "";
  for (let i = 0; i < L.n; i++) {
    const r = Math.floor(i / p.cols), c = i % p.cols, x = c * s, y = g.Y0 + r * s;
    tiles += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${TERRACE[h[i]]}"/>`;
    if (h[i] === 3) tiles += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="url(#${g.id}-hatch)"/>`;
    if (p.cells[i] === ".") nums += `<text x="${x + s * 0.13}" y="${y + s * 0.2}" class="height">${h[i]}</text>`;
    // Contour lines on edges between different heights; heavier for bigger steps.
    if (c + 1 < p.cols && h[i + 1] !== h[i]) contours += `<path d="M${x + s} ${y}V${y + s}" stroke-width="${1.2 + Math.abs(h[i + 1] - h[i]) * 1.2}"/>`;
    if (r + 1 < p.rows && h[i + p.cols] !== h[i]) contours += `<path d="M${x} ${y + s}H${x + s}" stroke-width="${1.2 + Math.abs(h[i + p.cols] - h[i]) * 1.2}"/>`;
  }
  let grid = "";
  for (let c = 1; c < p.cols; c++) grid += `M${c * s} ${g.Y0}V${g.Yb}`;
  for (let r = 1; r < p.rows; r++) grid += `M0 ${g.Y0 + r * s}H${g.W}`;
  return `<g class="terrain">${tiles}<path d="${grid}" stroke="${INK}" stroke-opacity="0.06"/><g stroke="${CONTOUR}" stroke-opacity="0.75" stroke-linecap="round" fill="none">${contours}</g><g class="heights">${nums}</g></g>`;
}

// A Painted Lady: gabled front, bay window, door.
function house(x, y, s, k) {
  const col = PASTELS[Math.floor(hash(k) * PASTELS.length)], trim = "#FBF8F1";
  const w = s * 0.62, hgt = s * 0.5, l = x - w / 2, b = y + s * 0.34;
  return `<g class="house">
    <path d="M${f(l)} ${f(b)}V${f(b - hgt)}L${f(x)} ${f(b - hgt - s * 0.2)}L${f(l + w)} ${f(b - hgt)}V${f(b)}Z" fill="${col}" stroke="${INK}" stroke-opacity="0.55" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M${f(l - 2)} ${f(b - hgt + 1)}L${f(x)} ${f(b - hgt - s * 0.22)}L${f(l + w + 2)} ${f(b - hgt + 1)}" fill="none" stroke="${trim}" stroke-width="2"/>
    <rect x="${f(l + w * 0.12)}" y="${f(b - hgt * 0.8)}" width="${f(w * 0.36)}" height="${f(hgt * 0.34)}" fill="${trim}" stroke="${INK}" stroke-opacity="0.4"/>
    <rect x="${f(l + w * 0.58)}" y="${f(b - hgt * 0.62)}" width="${f(w * 0.26)}" height="${f(hgt * 0.62)}" fill="${INK}" fill-opacity="0.65"/>
    <circle cx="${f(x)}" cy="${f(b - hgt - s * 0.06)}" r="${f(s * 0.04)}" fill="${trim}"/>
  </g>`;
}

export function fixtures(p, g) {
  const { s } = g;
  let out = "";
  for (let i = 0; i < p.cells.length; i++) {
    const x = g.cx(i % p.cols), y = g.cy(Math.floor(i / p.cols)), ch = p.cells[i];
    if (ch === "#") out += house(x, y, s, p.seed * 131 + i);
    else if (/[A-Z]/.test(ch)) {
      const k = ch.charCodeAt(0) - 65, col = LINE_COLORS[k % LINE_COLORS.length];
      out += `<g class="turntable" transform="translate(${x} ${y})">
        <circle r="${f(s * 0.34)}" fill="#7B5836" stroke="${INK}" stroke-width="2"/>
        <circle r="${f(s * 0.27)}" fill="none" stroke="#C9A472" stroke-width="1.5" stroke-dasharray="3 3"/>
        <circle r="${f(s * 0.2)}" fill="${col}" stroke="#FBF8F1" stroke-width="2"/>
        <text class="clue light" y="1" font-size="${f(s * 0.24)}">${ch}</text>
      </g>`;
    }
  }
  for (const [k, dir] of Object.entries(p.cars || {})) {
    const i = +k;
    out += carSvg(g.cx(i % p.cols), g.cy(Math.floor(i / p.cols)), s, dir === "H" ? 0 : 90, "given-car");
  }
  return `<g class="fixtures">${out}</g>`;
}

export function carSvg(x, y, s, angle, cls = "") {
  const l = s * 0.36, w = s * 0.2;
  return `<g class="car ${cls}" transform="translate(${f(x)} ${f(y)}) rotate(${angle})">
    <rect x="${f(-l - 1)}" y="${f(-w - 1)}" width="${f(2 * l + 2)}" height="${f(2 * w + 2)}" rx="${f(s * 0.07)}" fill="#1E1A17" opacity="0.25" transform="translate(2 3)"/>
    <rect x="${f(-l)}" y="${f(-w)}" width="${f(2 * l)}" height="${f(2 * w)}" rx="${f(s * 0.07)}" fill="#8E2B24" stroke="#3A1512" stroke-width="1.5"/>
    <rect x="${f(-l * 0.72)}" y="${f(-w * 0.62)}" width="${f(l * 1.44)}" height="${f(w * 1.24)}" rx="${f(s * 0.03)}" fill="#F3E6C8"/>
    <path d="M${f(-l * 0.4)} ${f(-w * 0.62)}V${f(w * 0.62)}M0 ${f(-w * 0.62)}V${f(w * 0.62)}M${f(l * 0.4)} ${f(-w * 0.62)}V${f(w * 0.62)}" stroke="#8E2B24" stroke-width="1.5"/>
    <circle cx="${f(l * 0.86)}" cy="0" r="${f(s * 0.035)}" fill="#E9C46A"/>
  </g>`;
}

// Rails for a set of edges, coloured by the line they belong to (grey if not yet known).
export function railsSvg(g, edgesByColor) {
  const s = g.s;
  let out = "";
  for (const [color, edges] of edgesByColor) {
    if (!edges.length) continue;
    let d = "";
    for (const ed of edges) {
      const [a, b] = g.L.ends[ed];
      d += `M${g.cx(a % g.L.C)} ${g.cy(Math.floor(a / g.L.C))}L${g.cx(b % g.L.C)} ${g.cy(Math.floor(b / g.L.C))}`;
    }
    out += `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="${d}" stroke="#1E1A17" stroke-opacity="0.22" stroke-width="${f(s * 0.36)}" transform="translate(1.5 2.5)"/>
      <path d="${d}" stroke="${color}" stroke-width="${f(s * 0.34)}"/>
      <path d="${d}" stroke="#E8DCC2" stroke-width="${f(s * 0.22)}"/>
      <path d="${d}" stroke="#4A423A" stroke-width="${f(s * 0.035)}" stroke-dasharray="${f(s * 0.1)} ${f(s * 0.06)}"/>
    </g>`;
  }
  return out;
}

/** Ordered squares of each line in a solved drawing (turntable to turntable). */
export function lineRoutes(p, g, onSet) {
  const { L } = g, routes = [];
  const labels = [...new Set(p.cells.split("").filter((ch) => /[A-Z]/.test(ch)))].sort();
  for (const lab of labels) {
    const start = p.cells.indexOf(lab);
    const route = [start];
    let prevDir = -1, cur = start;
    for (let guard = 0; guard < L.n * 2; guard++) {
      let next = -1, nd = -1;
      const on = [0, 1, 2, 3].filter((d) => L.cellEdges[cur][d] >= 0 && onSet.has(L.cellEdges[cur][d]));
      if (prevDir >= 0 && on.length === 4) nd = prevDir; // straight across a crossing
      else nd = on.find((d) => d !== (prevDir ^ 1));
      if (nd == null || nd < 0) break;
      next = L.nb(cur, nd);
      route.push(next); cur = next; prevDir = nd;
      if (p.cells[cur] === lab) break;
    }
    routes.push({ lab, route });
  }
  return routes;
}

// Completion: a cable car rides each line, back and forth.
export function ridingCars(p, g, onSet) {
  return lineRoutes(p, g, onSet).map(({ route }) => {
    const d = route.map((c, i) => `${i ? "L" : "M"}${g.cx(c % p.cols)} ${g.cy(Math.floor(c / p.cols))}`).join("");
    const dur = Math.max(4, route.length * 0.55);
    return `<g class="riding"><animateMotion dur="${dur}s" repeatCount="indefinite" rotate="auto" keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" path="${d}"/>${carSvg(0, 0, g.s, 0, "moving")}</g>`;
  }).join("");
}

export function staticSvg(p, { s = 60, solved = false, id = "cc" + p.seed, cls = "" } = {}) {
  const g = geometry(p, s); g.id = id;
  const onSet = new Set(solved ? p.solution : []);
  const groups = [];
  if (solved) for (const { route } of lineRoutes(p, g, onSet)) {
    const k = p.cells[route[0]].charCodeAt(0) - 65, edges = [];
    for (let t = 1; t < route.length; t++) edges.push(g.L.edgeBetween(route[t - 1], route[t]));
    groups.push([LINE_COLORS[k], edges]);
  }
  return `<svg class="board ${cls}" viewBox="0 0 ${g.W} ${g.H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cable Cars puzzle">
${defs(id, g)}${bay(p, g)}${terrain(p, g)}${railsSvg(g, groups)}${fixtures(p, g)}
<rect x="0" y="${g.Yb}" width="${g.W}" height="${g.H - g.Yb}" fill="#4A423A"/>
<text x="${g.s * 0.25}" y="${f(g.Yb + (g.H - g.Yb) / 2)}" class="shore-label light">MARKET STREET</text>
</svg>`;
}
