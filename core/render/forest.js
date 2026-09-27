// Sasquatch art: a Pacific Northwest forest under a snow-capped peak. Hikers wear bright jackets
// and cast warm sight beams straight ahead; every square no beam reaches sits in shadow; the
// Sasquatch waits in the last shadow.

const INK = "#1D2A22";
const JACKETS = ["#E8702A", "#F2C14E", "#D9483B", "#3E8FC4", "#9B5DE5"];
const hash = (n) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 13; x = Math.imul(x, 1274126177) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const f = (x) => Math.round(x * 10) / 10;
const DR = { L: 0, R: 0, U: -1, D: 1 }, DC = { L: -1, R: 1, U: 0, D: 0 };
const ANGLE = { R: 0, D: 90, L: 180, U: -90 };

export function geometry(p, s = 60) {
  const topH = Math.round(s * 1.2), botH = Math.round(s * 0.45);
  const W = p.cols * s, Y0 = topH, Yb = Y0 + p.rows * s, H = Yb + botH;
  return { s, W, H, Y0, Yb, cx: (c) => c * s + s / 2, cy: (r) => Y0 + r * s + s / 2 };
}

export function defs(id) {
  return `<defs>
  <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C7D6D2"/><stop offset="1" stop-color="#EAEFE6"/></linearGradient>
  <radialGradient id="${id}-floor" cx="0.5" cy="0.4" r="0.8"><stop offset="0" stop-color="#4A6B45"/><stop offset="1" stop-color="#34503A"/></radialGradient>
  <filter id="${id}-mist" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>`;
}

export function sky(p, g) {
  const { W, Y0, s } = g;
  const mx = W * (0.25 + hash(p.seed * 3) * 0.5);
  let firs = "";
  for (let x = -s * 0.1; x < W + s * 0.2; x += s * 0.22) {
    const h = s * (0.25 + hash(p.seed * 7 + Math.round(x)) * 0.25);
    firs += `M${f(x)} ${Y0}L${f(x + s * 0.11)} ${f(Y0 - h)}L${f(x + s * 0.22)} ${Y0}Z`;
  }
  return `<g class="sky">
  <rect x="0" y="0" width="${W}" height="${Y0}" fill="url(#${g.id}-sky)"/>
  <path d="M${f(mx - W * 0.45)} ${Y0}L${f(mx - s * 0.35)} ${f(Y0 * 0.32)}Q${f(mx)} ${f(Y0 * 0.12)} ${f(mx + s * 0.4)} ${f(Y0 * 0.3)}L${f(mx + W * 0.5)} ${Y0}Z" fill="#8FA5A0"/>
  <path d="M${f(mx - s * 0.35)} ${f(Y0 * 0.32)}Q${f(mx)} ${f(Y0 * 0.12)} ${f(mx + s * 0.4)} ${f(Y0 * 0.3)}L${f(mx + s * 0.22)} ${f(Y0 * 0.42)}L${f(mx + s * 0.05)} ${f(Y0 * 0.36)}L${f(mx - s * 0.12)} ${f(Y0 * 0.44)}Z" fill="#F7F7F2"/>
  <path d="M0 ${f(Y0 * 0.78)}Q${f(W * 0.3)} ${f(Y0 * 0.55)} ${f(W * 0.6)} ${f(Y0 * 0.75)}T${W} ${f(Y0 * 0.65)}V${Y0}H0Z" fill="#6D8A7A"/>
  <path d="${firs}" fill="#2E4B3A"/>
</g>`;
}

export function floor(p, g) {
  const { s } = g;
  let tufts = "", grid = "";
  for (let i = 0; i < p.cells.length; i++) {
    if (p.cells[i] === "#") continue;
    const x = (i % p.cols) * s, y = g.Y0 + Math.floor(i / p.cols) * s;
    for (let k = 0; k < 3; k++) {
      const tx = x + s * (0.15 + hash(i * 31 + k) * 0.7), ty = y + s * (0.2 + hash(i * 17 + k) * 0.65);
      tufts += `M${f(tx)} ${f(ty)}l${f(-s * 0.05)} ${f(-s * 0.07)}M${f(tx)} ${f(ty)}l0 ${f(-s * 0.09)}M${f(tx)} ${f(ty)}l${f(s * 0.05)} ${f(-s * 0.07)}`;
    }
  }
  for (let c = 1; c < p.cols; c++) grid += `M${c * s} ${g.Y0}V${g.Yb}`;
  for (let r = 1; r < p.rows; r++) grid += `M0 ${g.Y0 + r * s}H${g.W}`;
  return `<g class="floor">
  <rect x="0" y="${g.Y0}" width="${g.W}" height="${g.Yb - g.Y0}" fill="url(#${g.id}-floor)"/>
  <path d="${tufts}" stroke="#7FA66A" stroke-opacity="0.35" stroke-width="1.3" stroke-linecap="round"/>
  <path d="${grid}" stroke="#DDEBD5" stroke-opacity="0.08"/>
</g>`;
}

function tree(x, y, s, k) {
  const kind = hash(k), dark = kind < 0.45 ? "#1E3A2A" : kind < 0.85 ? "#27493A" : "#2F5539", light = kind < 0.45 ? "#2E5540" : "#3A6B4E";
  const trunk = kind > 0.85 ? "#7A3E2A" : "#5A4030";
  const w = s * (0.34 + hash(k * 3) * 0.08);
  return `<g class="tree">
    <ellipse cx="${f(x + s * 0.06)}" cy="${f(y + s * 0.36)}" rx="${f(s * 0.32)}" ry="${f(s * 0.1)}" fill="#0F1E15" opacity="0.35"/>
    <rect x="${f(x - s * 0.04)}" y="${f(y + s * 0.18)}" width="${f(s * 0.08)}" height="${f(s * 0.2)}" fill="${trunk}"/>
    <path d="M${f(x - w)} ${f(y + s * 0.22)}L${f(x)} ${f(y - s * 0.08)}L${f(x + w)} ${f(y + s * 0.22)}Z" fill="${dark}"/>
    <path d="M${f(x - w * 0.8)} ${f(y + s * 0.06)}L${f(x)} ${f(y - s * 0.26)}L${f(x + w * 0.8)} ${f(y + s * 0.06)}Z" fill="${light}"/>
    <path d="M${f(x - w * 0.55)} ${f(y - s * 0.12)}L${f(x)} ${f(y - s * 0.42)}L${f(x + w * 0.55)} ${f(y - s * 0.12)}Z" fill="${dark}"/>
  </g>`;
}
export function trees(p, g) {
  let out = "";
  for (let i = 0; i < p.cells.length; i++) if (p.cells[i] === "#") out += tree(g.cx(i % p.cols), g.cy(Math.floor(i / p.cols)), g.s, p.seed * 977 + i);
  return `<g class="trees">${out}</g>`;
}

/** Squares each hiker sees for a facing map {cell: "L"|"R"|"U"|"D"}; returns {beams svg, seen Set}. */
export function beams(p, g, facing) {
  const { s } = g, seen = new Set();
  let out = "";
  for (const [k, dir] of Object.entries(facing)) {
    if (!dir) continue;
    const i = +k;
    let r = Math.floor(i / p.cols), c = i % p.cols, len = 0;
    for (;;) {
      const rr = r + DR[dir], cc = c + DC[dir];
      if (rr < 0 || cc < 0 || rr >= p.rows || cc >= p.cols || p.cells[rr * p.cols + cc] === "#") break;
      r = rr; c = cc; len++; seen.add(r * p.cols + c);
    }
    if (!len) continue;
    const x0 = g.cx(i % p.cols), y0 = g.cy(Math.floor(i / p.cols));
    const w = s * 0.62, reach = len * s + s * 0.5 - s * 0.18;
    out += `<g transform="translate(${x0} ${y0}) rotate(${ANGLE[dir]})"><path d="M${f(s * 0.18)} ${f(-w * 0.28)}L${f(reach)} ${f(-w / 2)}L${f(reach)} ${f(w / 2)}L${f(s * 0.18)} ${f(w * 0.28)}Z" fill="#FFE7A3" fill-opacity="0.26"/></g>`;
  }
  return { svg: `<g class="beams">${out}</g>`, seen };
}

export function shadows(p, g, seen, cls = "shade") {
  let out = "";
  for (let i = 0; i < p.cells.length; i++) if (p.cells[i] !== "h" && !seen.has(i)) out += `<rect x="${(i % p.cols) * g.s}" y="${g.Y0 + Math.floor(i / p.cols) * g.s}" width="${g.s}" height="${g.s}"/>`;
  return `<g class="${cls}" fill="#07120C" fill-opacity="0.28">${out}</g>`;
}

export function hikerSvg(x, y, s, dir, number, k) {
  const jacket = JACKETS[Math.floor(hash(k) * JACKETS.length)];
  const face = dir ? `<g transform="rotate(${ANGLE[dir]})"><path d="M${f(s * 0.2)} ${f(-s * 0.1)}L${f(s * 0.36)} 0L${f(s * 0.2)} ${f(s * 0.1)}Z" fill="#FFF3CC" stroke="${INK}" stroke-width="1"/></g>`
    : `<g stroke="#FFF3CC" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round">${["R", "D", "L", "U"].map((d) => `<path d="M${f(s * 0.24)} 0H${f(s * 0.32)}" transform="rotate(${ANGLE[d]})"/>`).join("")}</g>`;
  return `<g class="hiker" transform="translate(${f(x)} ${f(y)})">
    <ellipse cx="2" cy="${f(s * 0.26)}" rx="${f(s * 0.2)}" ry="${f(s * 0.07)}" fill="#0F1E15" opacity="0.4"/>
    ${face}
    <circle r="${f(s * 0.19)}" fill="${jacket}" stroke="${INK}" stroke-width="1.8"/>
    <rect x="${f(-s * 0.1)}" y="${f(-s * 0.02)}" width="${f(s * 0.2)}" height="${f(s * 0.14)}" rx="3" fill="#6B4E33" stroke="${INK}" stroke-width="1"/>
    <circle cy="${f(-s * 0.07)}" r="${f(s * 0.085)}" fill="#F1C99B" stroke="${INK}" stroke-width="1.2"/>
    ${number == null ? "" : `<g transform="translate(${f(-s * 0.27)} ${f(-s * 0.27)})"><circle r="${f(s * 0.15)}" fill="#FBF6E9" stroke="${INK}" stroke-width="1.5"/><text class="clue" y="1" font-size="${f(s * 0.2)}">${number}</text></g>`}
  </g>`;
}

export function sasquatchSvg(x, y, s, cls = "") {
  return `<g class="sasquatch ${cls}" transform="translate(${f(x)} ${f(y)})">
    <ellipse cx="2" cy="${f(s * 0.33)}" rx="${f(s * 0.24)}" ry="${f(s * 0.07)}" fill="#0B150E" opacity="0.45"/>
    <path d="M${f(-s * 0.24)} ${f(s * 0.32)}Q${f(-s * 0.3)} ${f(-s * 0.05)} ${f(-s * 0.12)} ${f(-s * 0.16)}Q0 ${f(-s * 0.24)} ${f(s * 0.12)} ${f(-s * 0.16)}Q${f(s * 0.3)} ${f(-s * 0.05)} ${f(s * 0.24)} ${f(s * 0.32)}Z" fill="#6B4A2F" stroke="#2B1B10" stroke-width="1.5"/>
    <g class="arm"><path d="M${f(s * 0.16)} ${f(-s * 0.02)}Q${f(s * 0.32)} ${f(-s * 0.12)} ${f(s * 0.3)} ${f(-s * 0.3)}" fill="none" stroke="#6B4A2F" stroke-width="${f(s * 0.09)}" stroke-linecap="round"/></g>
    <circle cy="${f(-s * 0.2)}" r="${f(s * 0.14)}" fill="#6B4A2F" stroke="#2B1B10" stroke-width="1.5"/>
    <ellipse cy="${f(-s * 0.17)}" rx="${f(s * 0.085)}" ry="${f(s * 0.07)}" fill="#B08560"/>
    <circle cx="${f(-s * 0.035)}" cy="${f(-s * 0.19)}" r="1.8" fill="#1A0F08"/><circle cx="${f(s * 0.035)}" cy="${f(-s * 0.19)}" r="1.8" fill="#1A0F08"/>
  </g>`;
}

export function trailhead(g) {
  return `<g><rect x="0" y="${g.Yb}" width="${g.W}" height="${g.H - g.Yb}" fill="#4E3C2B"/>
  <text x="${g.s * 0.25}" y="${f(g.Yb + (g.H - g.Yb) / 2)}" class="shore-label light">TRAILHEAD · NO SASQUATCH SIGHTINGS REPORTED</text></g>`;
}

export function staticSvg(p, { s = 60, solved = false, id = "fs" + p.seed, cls = "" } = {}) {
  const g = geometry(p, s); g.id = id;
  const hikers = [...p.cells].map((ch, i) => (ch === "h" ? i : -1)).filter((i) => i >= 0);
  const facing = {};
  if (solved) hikers.forEach((i, k) => { facing[i] = p.solution.facing[k]; });
  const b = beams(p, g, facing);
  const people = hikers.map((i, k) => hikerSvg(g.cx(i % p.cols), g.cy(Math.floor(i / p.cols)), s, facing[i] || null, p.numbers[i], p.seed * 13 + k)).join("");
  const sq = solved ? sasquatchSvg(g.cx(p.solution.spot % p.cols), g.cy(Math.floor(p.solution.spot / p.cols)), s) : "";
  return `<svg class="board ${cls}" viewBox="0 0 ${g.W} ${g.H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sasquatch puzzle">
${defs(id)}${sky(p, g)}${floor(p, g)}${solved ? shadows(p, g, b.seen) : ""}${b.svg}${trees(p, g)}${people}${sq}${trailhead(g)}
</svg>`;
}
