// SVG drawing for every Golden Gate variant. Pure strings, so the same art serves the interactive
// board, thumbnails, and any static export. Marin's golden headlands sit across the top of the bay,
// San Francisco across the bottom; the road is International Orange.
import { layout, landRegion } from "../road/engine.js";

export const PALETTE = {
  orange: "#C0362C", orangeLight: "#E4603E", orangeDark: "#7E2219",
  bay: "#24566F", bayDeep: "#173E53", foam: "#E9F2F2",
  gold: "#D4AA62", goldDeep: "#B88A48", ridge: "#9C7340",
  sand: "#D8BE83", grass: "#7E9258", grassDeep: "#63774A",
  rock: "#48525B", rockDeep: "#2F373E",
  paper: "#F4F0E6", ink: "#1E2A33", presidio: "#6D8555", presidioDeep: "#566C43",
};
const P = PALETTE;

const hash = (n) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 13; x = Math.imul(x, 1274126177) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const f = (x) => Math.round(x * 10) / 10;

export function geometry(p, s = 60) {
  const topH = Math.round(s * 1.25), botH = Math.round(s * 1.35), pad = 0;
  const X0 = pad, Y0 = topH, W = p.cols * s + 2 * pad, Yb = Y0 + p.rows * s, H = Yb + botH;
  const L = layout(p.rows, p.cols, p.start, p.end);
  return {
    s, X0, Y0, W, H, Yb, topH, botH, L,
    cx: (c) => X0 + c * s + s / 2, cy: (r) => Y0 + r * s + s / 2,
    vista: [X0 + p.end * s + s / 2, Math.round(topH * 0.4)],
    plaza: [X0 + p.start * s + s / 2, Yb + Math.round(botH * 0.36)],
  };
}

export function defs(id, g) {
  return `<defs>
  <linearGradient id="${id}-water" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${P.bayDeep}"/><stop offset="1" stop-color="${P.bay}"/></linearGradient>
  <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EEE6D6"/><stop offset="1" stop-color="#F6EFE2"/></linearGradient>
  <pattern id="${id}-waves" width="${g.s}" height="${g.s / 2}" patternUnits="userSpaceOnUse">
    <path d="M${g.s * 0.12} ${g.s * 0.3} q${g.s * 0.08} -${g.s * 0.07} ${g.s * 0.16} 0 M${g.s * 0.62} ${g.s * 0.08} q${g.s * 0.08} -${g.s * 0.07} ${g.s * 0.16} 0" fill="none" stroke="#FFFFFF" stroke-opacity="0.07" stroke-width="1.4" stroke-linecap="round"/>
  </pattern>
  <filter id="${id}-fog" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${g.s * 0.32}"/></filter>
  <filter id="${id}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${g.s * 0.05}"/></filter>
  <clipPath id="${id}-bay"><rect x="${g.X0}" y="${g.Y0}" width="${g.W - 2 * g.X0}" height="${g.Yb - g.Y0}"/></clipPath>
</defs>`;
}

// ------------------------------------------------------------------ shores
function hills(W, base, amp, seed, n = 4) {
  const pts = [];
  for (let x = 0; x <= W; x += W / 40) {
    let y = 0;
    for (let k = 1; k <= n; k++) y += Math.sin((x / W) * Math.PI * (k + 0.6) + seed * k * 1.7) * amp / k;
    pts.push([x, base - Math.abs(y)]);
  }
  return pts;
}
const smoothPath = (pts) => pts.map((p, i) => (i ? "L" : "M") + f(p[0]) + " " + f(p[1])).join("");

export function shoreTop(p, g) {
  const { W, Y0, s } = g;
  const back = hills(W, Y0 * 0.62, Y0 * 0.34, p.seed % 7 + 1);
  const front = hills(W, Y0 * 0.9, Y0 * 0.22, p.seed % 5 + 3, 3);
  const [vx, vy] = g.vista;
  return `<g class="shore shore-top">
  <rect x="0" y="0" width="${W}" height="${Y0}" fill="url(#${g.id}-sky)"/>
  <path d="${smoothPath(back)}L${W} ${Y0}L0 ${Y0}Z" fill="${P.goldDeep}" opacity="0.75"/>
  <path d="${smoothPath(front)}L${W} ${Y0}L0 ${Y0}Z" fill="${P.gold}"/>
  <path d="M0 ${Y0 - 2}H${W}" stroke="${P.ridge}" stroke-width="3"/>
  <g class="marker vista" transform="translate(${vx} ${vy})">
    <circle r="${s * 0.17}" fill="${P.paper}" stroke="${P.orange}" stroke-width="3"/>
    <circle r="${s * 0.06}" fill="${P.orange}"/>
  </g>
  ${sideLabel(vx, vy, W, s, "VISTA POINT", "MARIN HEADLANDS", "")}
</g>`;
}

export function shoreBottom(p, g) {
  const { W, Yb, H, s } = g;
  const [px, py] = g.plaza;
  const coast = hills(W, Yb + s * 0.2, s * 0.12, p.seed % 3 + 2, 2).map(([x, y]) => [x, Math.max(Yb + 3, y)]);
  // A little skyline, kept clear of the toll plaza. One Transamerica Pyramid.
  let city = "";
  const colors = ["#E7D9C4", "#DCCDB7", "#EFE3D0", "#D2C3AC", "#E4D3BA"];
  let x = s * 0.2, k = 0, pyramid = false;
  while (x < W - s * 0.3) {
    const w = s * (0.18 + hash(p.seed * 31 + k) * 0.22);
    if (Math.abs(x + w / 2 - px) < s * 0.45) { x += s * 0.2; k++; continue; }
    const h = s * (0.16 + hash(p.seed * 17 + k) * 0.3);
    const baseY = H - s * 0.14;
    if (!pyramid && x > W * 0.55 && hash(p.seed + k) > 0.35) {
      const ph = s * 0.62;
      city += `<path d="M${f(x)} ${f(baseY)}L${f(x + s * 0.11)} ${f(baseY - ph)}L${f(x + s * 0.22)} ${f(baseY)}Z" fill="#EDE3D3" stroke="${P.ink}" stroke-opacity="0.25"/>`;
      pyramid = true; x += s * 0.3; k++; continue;
    }
    city += `<rect x="${f(x)}" y="${f(baseY - h)}" width="${f(w)}" height="${f(h)}" fill="${colors[k % colors.length]}" stroke="${P.ink}" stroke-opacity="0.18"/>`;
    for (let wy = baseY - h + s * 0.07; wy < baseY - s * 0.05; wy += s * 0.1) city += `<rect x="${f(x + w * 0.25)}" y="${f(wy)}" width="${f(w * 0.5)}" height="1.5" fill="${P.ink}" opacity="0.12"/>`;
    x += w + s * 0.04; k++;
  }
  return `<g class="shore shore-bottom">
  <rect x="0" y="${Yb}" width="${W}" height="${H - Yb}" fill="${P.presidio}"/>
  <path d="${smoothPath(coast)}L${W} ${Yb}L0 ${Yb}Z" fill="${P.sand}"/>
  <path d="M0 ${f(Yb + s * 0.42)}${hills(W, Yb + s * 0.55, s * 0.15, p.seed % 4 + 5, 2).map(([hx, hy]) => `L${f(hx)} ${f(hy)}`).join("")}L${W} ${H}L0 ${H}Z" fill="${P.presidioDeep}" opacity="0.55"/>
  ${city}
  <g class="marker plaza" transform="translate(${px} ${py})">
    <rect x="${-s * 0.3}" y="${-s * 0.13}" width="${s * 0.6}" height="${s * 0.26}" rx="3" fill="${P.paper}" stroke="${P.orange}" stroke-width="3"/>
    <path d="M${-s * 0.18} ${s * 0.13}v${-s * 0.1}a${s * 0.05} ${s * 0.05} 0 0 1 ${s * 0.1} 0v${s * 0.1}M${s * 0.08} ${s * 0.13}v${-s * 0.1}a${s * 0.05} ${s * 0.05} 0 0 1 ${s * 0.1} 0v${s * 0.1}" fill="none" stroke="${P.orange}" stroke-width="2"/>
  </g>
  ${sideLabel(px, py - s * 0.08, W, s, "TOLL PLAZA", "SAN FRANCISCO", "light")}
</g>`;
}

// Two-line label set beside a marker, on whichever side has more room.
function sideLabel(x, y, W, s, title, sub, cls) {
  const right = x < W / 2, tx = right ? x + s * 0.34 : x - s * 0.34, anchor = right ? "start" : "end";
  return `<g class="shore-label-group ${cls}" text-anchor="${anchor}">
    <text x="${f(tx)}" y="${f(y - s * 0.02)}" class="shore-label ${cls}">${title}</text>
    <text x="${f(tx)}" y="${f(y + s * 0.2)}" class="shore-sub ${cls}">${sub}</text>
  </g>`;
}

// ------------------------------------------------------------------ bay contents
export function water(p, g) {
  const { X0, Y0, W, Yb, s } = g;
  let grid = "";
  for (let c = 1; c < p.cols; c++) grid += `M${X0 + c * s} ${Y0}V${Yb}`;
  for (let r = 1; r < p.rows; r++) grid += `M${X0} ${Y0 + r * s}H${W - X0}`;
  let dots = "";
  for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) if (p.cells[r * p.cols + c] === ".") dots += `<circle cx="${g.cx(c)}" cy="${g.cy(r)}" r="1.7"/>`;
  return `<g class="water">
  <rect x="${X0}" y="${Y0}" width="${W - 2 * X0}" height="${Yb - Y0}" fill="url(#${g.id}-water)"/>
  <rect x="${X0}" y="${Y0}" width="${W - 2 * X0}" height="${Yb - Y0}" fill="url(#${g.id}-waves)"/>
  <path d="${grid}" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="1"/>
  <g fill="#FFFFFF" fill-opacity="0.22">${dots}</g>
</g>`;
}

// Islands: stacked rounded cells with connectors, so neighbouring land squares melt into one shape.
function blobLayer(p, g, size, rx, fill, extra = "") {
  const { s } = g, C = p.cols, land = (r, c) => r >= 0 && c >= 0 && r < p.rows && c < C && p.cells[r * C + c] === "o";
  let out = "";
  for (let r = 0; r < p.rows; r++) for (let c = 0; c < C; c++) {
    if (!land(r, c)) continue;
    const x = g.cx(c), y = g.cy(r), h = (s * size) / 2;
    out += `<rect x="${f(x - h)}" y="${f(y - h)}" width="${f(2 * h)}" height="${f(2 * h)}" rx="${f(s * rx)}"/>`;
    if (land(r, c + 1)) out += `<rect x="${f(x)}" y="${f(y - h)}" width="${s}" height="${f(2 * h)}"/>`;
    if (land(r + 1, c)) out += `<rect x="${f(x - h)}" y="${f(y)}" width="${f(2 * h)}" height="${s}"/>`;
    if (land(r, c + 1) && land(r + 1, c) && land(r + 1, c + 1)) out += `<rect x="${f(x)}" y="${f(y)}" width="${s}" height="${s}"/>`;
  }
  return `<g fill="${fill}" ${extra}>${out}</g>`;
}

export function terrain(p, g) {
  const { s } = g;
  let rocks = "";
  for (let i = 0; i < p.cells.length; i++) {
    if (p.cells[i] !== "#") continue;
    const x = g.cx(i % p.cols), y = g.cy(Math.floor(i / p.cols));
    const pts = [], hi = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + hash(i * 13 + k) * 0.4, rr = s * (0.25 + hash(i * 7 + k) * 0.12);
      pts.push(`${f(x + Math.cos(a) * rr)},${f(y + Math.sin(a) * rr * 0.85)}`);
      if (k >= 4 && k <= 7) hi.push(`${f(x + Math.cos(a) * rr * 0.55 - s * 0.03)},${f(y + Math.sin(a) * rr * 0.45 - s * 0.04)}`);
    }
    rocks += `<g class="rock"><ellipse cx="${x}" cy="${f(y + s * 0.08)}" rx="${f(s * 0.36)}" ry="${f(s * 0.14)}" fill="${P.foam}" opacity="0.18"/><polygon points="${pts.join(" ")}" fill="${P.rock}" stroke="${P.rockDeep}" stroke-width="2"/><polygon points="${hi.join(" ")} ${f(x)},${f(y - s * 0.02)}" fill="#6A757E"/></g>`;
  }
  const hasLand = p.cells.includes("o");
  return `<g class="terrain">
  ${hasLand ? blobLayer(p, g, 1.04, 0.36, P.foam, 'opacity="0.28"') : ""}
  ${hasLand ? blobLayer(p, g, 0.9, 0.3, P.sand) : ""}
  ${hasLand ? blobLayer(p, g, 0.64, 0.24, P.grass) : ""}
  ${rocks}
</g>`;
}

const DIR_ANGLE = { R: 0, D: 90, L: 180, U: -90 };
const DIR_VEC = { R: [0, 1], L: [0, -1], U: [-1, 0], D: [1, 0] };

export function ships(p, g) {
  if (!p.ships) return "";
  const { s } = g;
  let lanesSvg = "", hulls = "";
  for (const [k, sh] of Object.entries(p.ships)) {
    const i = +k, r0 = Math.floor(i / p.cols), c0 = i % p.cols, [dr, dc] = DIR_VEC[sh.dir];
    let r = r0 + dr, c = c0 + dc, chev = "";
    while (r >= 0 && c >= 0 && r < p.rows && c < p.cols && !"#sf".includes(p.cells[r * p.cols + c])) {
      const x = g.cx(c), y = g.cy(r);
      chev += `<path d="M${-s * 0.09} ${-s * 0.12}L${s * 0.05} 0L${-s * 0.09} ${s * 0.12}" transform="translate(${x} ${y}) rotate(${DIR_ANGLE[sh.dir]})"/>`;
      r += dr; c += dc;
    }
    const x1 = g.cx(c0), y1 = g.cy(r0), x2 = g.cx(c - dc) + (dc * s) / 2, y2 = g.cy(r - dr) + (dr * s) / 2;
    lanesSvg += `<g class="lane"><path d="M${x1} ${y1}L${f(x2)} ${f(y2)}" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="${f(s * 0.34)}" stroke-linecap="butt"/><g fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${chev}</g></g>`;
    hulls += `<g class="ship" transform="translate(${x1} ${y1})">
      <g transform="rotate(${DIR_ANGLE[sh.dir]})">
        <path d="M${-s * 0.4} ${-s * 0.2}H${s * 0.2}L${s * 0.42} 0L${s * 0.2} ${s * 0.2}H${-s * 0.4}Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>
        <rect x="${-s * 0.36}" y="${-s * 0.12}" width="${s * 0.15}" height="${s * 0.24}" rx="2" fill="${P.ink}"/>
      </g>
      ${sh.n == null ? "" : `<text class="clue" x="${s * (sh.dir === "L" ? -0.06 : sh.dir === "R" ? 0.06 : 0)}" y="${s * (sh.dir === "U" ? -0.03 : sh.dir === "D" ? 0.05 : 0.02)}" font-size="${f(s * 0.34)}">${sh.n}</text>`}
    </g>`;
  }
  return `<g class="lanes">${lanesSvg}</g><g class="ships">${hulls}</g>`;
}

export function foghorns(p, g) {
  if (!p.fogs) return "";
  const { s } = g;
  let out = "";
  for (const [k, n] of Object.entries(p.fogs)) {
    const i = +k, x = g.cx(i % p.cols), y = g.cy(Math.floor(i / p.cols));
    out += `<g class="foghorn" transform="translate(${x} ${y})">
      <circle r="${f(s * 0.44)}" fill="none" stroke="${P.paper}" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="3 5"/>
      <circle r="${f(s * 0.31)}" fill="${P.paper}" stroke="${P.ink}" stroke-width="2"/>
      <text class="clue" y="${f(s * 0.02)}" font-size="${f(s * 0.36)}">${n}</text>
    </g>`;
  }
  return `<g class="foghorns">${out}</g>`;
}

// Soft fog banks drifting over the bay (Fog Signals); a thin haze elsewhere.
export function fogBanks(p, g) {
  const { s } = g;
  const n = p.variant === "fog" ? Math.round(p.rows * p.cols / 5) : 3;
  const op = p.variant === "fog" ? 0.34 : 0.1;
  let out = "";
  for (let k = 0; k < n; k++) {
    const x = g.X0 + hash(p.seed * 101 + k) * (g.W - 2 * g.X0), y = g.Y0 + hash(p.seed * 211 + k) * (g.Yb - g.Y0);
    out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * (0.9 + hash(k * 5 + p.seed) * 1.2))}" ry="${f(s * (0.35 + hash(k * 3 + p.seed) * 0.35))}"/>`;
  }
  return `<g class="fogbanks" clip-path="url(#${g.id}-bay)"><g class="drift" fill="#FFFFFF" opacity="${op}" filter="url(#${g.id}-fog)">${out}</g></g>`;
}

export function landNumbers(p, g) {
  if (!p.lands) return "";
  const { s } = g;
  let out = "";
  for (const [k, n] of Object.entries(p.lands)) {
    const i = +k, x = g.cx(i % p.cols), y = g.cy(Math.floor(i / p.cols));
    out += `<g class="landnum" transform="translate(${x} ${y})"><circle r="${f(s * 0.24)}" fill="${P.paper}" stroke="${P.grassDeep}" stroke-width="2"/><text class="clue" y="${f(s * 0.02)}" font-size="${f(s * 0.3)}">${n}</text></g>`;
  }
  return `<g class="landnums">${out}</g>`;
}

// ------------------------------------------------------------------ road
export function edgeLine(g, ed) {
  const { L } = g;
  const [a, b] = L.ends[ed];
  const ax = g.cx(a % L.C), ay = g.cy(Math.floor(a / L.C));
  if (ed === L.PS) return [ax, ay, g.plaza[0], g.plaza[1] - g.s * 0.13];
  if (ed === L.PN) return [ax, ay, g.vista[0], g.vista[1] + g.s * 0.17];
  return [ax, ay, g.cx(b % L.C), g.cy(Math.floor(b / L.C))];
}

export function roadPath(g, onEdges) {
  let d = "";
  for (const ed of onEdges) { const [x1, y1, x2, y2] = edgeLine(g, ed); d += `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`; }
  return d;
}

export function roadSvg(g, onEdges, cls = "road") {
  const d = roadPath(g, onEdges), s = g.s;
  return `<g class="${cls}" stroke-linecap="round" stroke-linejoin="round" fill="none">
  <path d="${d}" stroke="#0B1A24" stroke-opacity="0.35" stroke-width="${f(s * 0.3)}" transform="translate(2 3)"/>
  <path d="${d}" stroke="${P.orangeDark}" stroke-width="${f(s * 0.28)}"/>
  <path d="${d}" stroke="${P.orange}" stroke-width="${f(s * 0.22)}"/>
  <path d="${d}" stroke="${P.orangeLight}" stroke-width="${f(s * 0.05)}" stroke-opacity="0.8"/>
</g>`;
}

/** The ordered list of cells on a solved road, from the toll plaza to Vista Point. */
export function routeCells(g, onSet) {
  const { L } = g, out = [L.S];
  let prev = -1, cur = L.S;
  for (let guard = 0; guard < L.n && cur !== L.T; guard++) {
    let next = -1;
    for (let d = 0; d < 4; d++) {
      const ed = L.cellEdges[cur][d];
      if (ed < 0 || ed >= L.PS || !onSet.has(ed)) continue;
      const j = L.nb(cur, d);
      if (j !== prev) { next = j; break; }
    }
    if (next < 0) break;
    prev = cur; cur = next; out.push(cur);
  }
  return out;
}

// Completion flourish: the longest straight run over water becomes the main span, with two towers,
// the main cables along the deck and suspender ticks between them.
export function bridgeDecor(p, g, onEdges) {
  const route = routeCells(g, new Set(onEdges)), s = g.s;
  if (route.length < 3) return "";
  let best = null;
  for (let i = 0; i < route.length - 1;) {
    const dr = Math.floor(route[i + 1] / p.cols) - Math.floor(route[i] / p.cols), dc = (route[i + 1] % p.cols) - (route[i] % p.cols);
    let j = i + 1;
    while (j + 1 < route.length && Math.floor(route[j + 1] / p.cols) - Math.floor(route[j] / p.cols) === dr && (route[j + 1] % p.cols) - (route[j] % p.cols) === dc) j++;
    const waterCells = route.slice(i, j + 1).filter((c) => p.cells[c] === ".").length;
    if (!best || waterCells > best.w || (waterCells === best.w && j - i > best.j - best.i)) best = { i, j, dr, dc, w: waterCells };
    i = j;
  }
  if (!best || best.j - best.i < 2) return "";
  const a = route[best.i], b = route[best.j];
  const ax = g.cx(a % p.cols), ay = g.cy(Math.floor(a / p.cols)), bx = g.cx(b % p.cols), by = g.cy(Math.floor(b / p.cols));
  const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len, nx = -uy, ny = ux;
  const t1 = 0.22, t2 = 0.78;
  const P1 = [ax + (bx - ax) * t1, ay + (by - ay) * t1], P2 = [ax + (bx - ax) * t2, ay + (by - ay) * t2];
  const off = s * 0.15, tw = s * 0.2, th = s * 0.07;
  const cable = (side) => {
    const ox = nx * off * side, oy = ny * off * side;
    const sag = s * 0.12 * side;
    const mx = (P1[0] + P2[0]) / 2 + ox + nx * sag * 0.5, my = (P1[1] + P2[1]) / 2 + oy + ny * sag * 0.5;
    return `M${f(ax + ox)} ${f(ay + oy)}L${f(P1[0] + ox)} ${f(P1[1] + oy)}Q${f(mx)} ${f(my)} ${f(P2[0] + ox)} ${f(P2[1] + oy)}L${f(bx + ox)} ${f(by + oy)}`;
  };
  let ticks = "";
  const steps = Math.max(4, Math.round(len * (t2 - t1) / (s * 0.18)));
  for (let k = 1; k < steps; k++) {
    const t = t1 + ((t2 - t1) * k) / steps, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    ticks += `M${f(x + nx * off)} ${f(y + ny * off)}L${f(x - nx * off)} ${f(y - ny * off)}`;
  }
  const tower = ([x, y]) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f((Math.atan2(uy, ux) * 180) / Math.PI)})">
    <rect x="${f(-th)}" y="${f(-tw)}" width="${f(2 * th)}" height="${f(2 * tw)}" rx="2" fill="${P.orangeDark}"/>
    <rect x="${f(-th * 0.55)}" y="${f(-tw * 0.85)}" width="${f(th * 1.1)}" height="${f(tw * 1.7)}" fill="${P.orange}"/>
    <path d="M${f(-th)} ${f(-tw * 0.3)}H${f(th)}M${f(-th)} ${f(tw * 0.3)}H${f(th)}" stroke="${P.orangeLight}" stroke-width="1.5"/>
  </g>`;
  return `<g class="decor">
  <path d="${ticks}" stroke="${P.orangeLight}" stroke-width="1.2" stroke-opacity="0.9"/>
  <path d="${cable(1)}${cable(-1)}" fill="none" stroke="${P.paper}" stroke-width="1.6" stroke-opacity="0.9"/>
  ${tower(P1)}${tower(P2)}
</g>`;
}

// ------------------------------------------------------------------ whole board
export function staticSvg(p, { s = 60, solved = false, id = "b" + p.seed, cls = "" } = {}) {
  const g = geometry(p, s); g.id = id;
  const onEdges = solved ? [...p.solution, g.L.PS, g.L.PN] : [g.L.PS, g.L.PN];
  return `<svg class="board ${cls}" viewBox="0 0 ${g.W} ${g.H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${p.variant} puzzle">
${defs(id, g)}
${water(p, g)}${terrain(p, g)}${ships(p, g)}${fogBanks(p, g)}
${shoreTop(p, g)}${shoreBottom(p, g)}
${roadSvg(g, onEdges)}${solved ? bridgeDecor(p, g, onEdges) : ""}
${foghorns(p, g)}${landNumbers(p, g)}
</svg>`;
}
