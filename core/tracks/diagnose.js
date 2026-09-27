// Why aren't these cable car lines right? Same claim encoding as core/road/diagnose.js.
import { buildModel, levelTurn } from "./engine.js";

const BIT = [1, 2, 4, 8], OPP = [1, 0, 3, 2];
const has = (x, d) => x < 16 && (x & BIT[d]) !== 0;

export function mutualPieces(m, claims) {
  const { L } = m, piece = new Uint8Array(L.n);
  for (let i = 0; i < L.n; i++) for (let d = 0; d < 4; d++) {
    const j = L.nb(i, d);
    if (j >= 0 && has(claims[i], d) && has(claims[j], OPP[d])) piece[i] |= BIT[d];
  }
  return piece;
}

// Union-find over agreed track: a square joins its two ends, or straight pairs at a crossing.
export function lines(m, claims) {
  const { L } = m, piece = mutualPieces(m, claims);
  const parent = Int32Array.from({ length: L.E + L.n }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { parent[find(a)] = find(b); };
  const selfCross = [];
  for (let i = 0; i < L.n; i++) {
    const x = piece[i], dirs = [0, 1, 2, 3].filter((d) => x & BIT[d]);
    if (m.endpoint[i] >= 0) { if (dirs.length) union(L.E + i, L.cellEdges[i][dirs[0]]); continue; }
    if (dirs.length === 2) union(L.cellEdges[i][dirs[0]], L.cellEdges[i][dirs[1]]);
    if (dirs.length === 4) { union(L.cellEdges[i][0], L.cellEdges[i][1]); union(L.cellEdges[i][2], L.cellEdges[i][3]); }
  }
  for (let i = 0; i < L.n; i++) if (piece[i] === 15 && find(L.cellEdges[i][0]) === find(L.cellEdges[i][2])) selfCross.push(i);
  return { piece, find, selfCross };
}

export function allConnected(p, claims) {
  const m = buildModel(p), { find } = lines(m, claims);
  return m.pairs.every(([a, b]) => find(m.L.E + a) === find(m.L.E + b));
}

export function diagnose(p, claims) {
  const m = buildModel(p), { L } = m, reasons = [];
  const { piece, find, selfCross } = lines(m, claims);

  const loose = [];
  for (let i = 0; i < L.n; i++) if (claims[i] && claims[i] < 16 && claims[i] !== piece[i]) loose.push(i);
  if (loose.length) reasons.push({ text: `The track has ${loose.length === 1 ? "a loose end" : `${loose.length} loose ends`}: a piece points at a square that doesn't connect back.`, cells: loose });

  const steep = [];
  for (let i = 0; i < L.n; i++) {
    const x = piece[i];
    const turn = [[0, 2], [0, 3], [1, 2], [1, 3]].find(([a, b]) => x === (BIT[a] | BIT[b]));
    if (turn && !levelTurn(L, m.h, i, turn[0], turn[1])) steep.push(i);
  }
  if (steep.length) reasons.push({ text: "A line turns on a slope here. The streets run straight up the hills, so lines only turn where the square before, the turn and the square after are all the same height.", cells: steep });

  if (selfCross.length) reasons.push({ text: "A line crosses itself here. Crossings are only for two different lines.", cells: selfCross });

  // Which turntables each piece of track reaches.
  const ends = new Map();
  for (let i = 0; i < L.n; i++) if (m.endpoint[i] >= 0) {
    const r = find(L.E + i);
    if (!ends.has(r)) ends.set(r, []);
    ends.get(r).push(i);
  }
  for (const list of ends.values()) {
    const labels = new Set(list.map((i) => m.labels[m.endpoint[i]]));
    if (labels.size > 1) reasons.push({ text: `Line ${[...labels].join(" and line ")} are joined together. Each line runs between its own two turntables.`, cells: list });
  }
  const stray = [];
  for (let i = 0; i < L.n; i++) {
    if (!piece[i] || m.endpoint[i] >= 0) continue;
    const eds = [0, 1, 2, 3].filter((d) => piece[i] & BIT[d]).map((d) => L.cellEdges[i][d]);
    if (eds.some((ed) => !ends.has(find(ed)))) stray.push(i);
  }
  if (stray.length) reasons.push({ text: "Some track doesn't lead to any turntable.", cells: stray });

  for (const [k, dir] of Object.entries(m.spec.cars || {})) {
    const want = dir === "H" ? 3 : 12;
    if (piece[+k] !== want) reasons.push({ text: `The cable car here sits on a straight piece of line running ${dir === "H" ? "across" : "up and down"}.`, cells: [+k] });
  }
  return reasons;
}

// ------------------------------------------------------------------ live rule checks
export function liveCheck(p, claims) {
  const m = buildModel(p), { L } = m, out = [];
  const add = (text, cells) => { if (cells.length) out.push({ text, cells: [...new Set(cells)] }); };
  const isPiece = (x) => x > 0 && x < 16;

  const clash = [];
  for (let i = 0; i < L.n; i++) {
    const x = claims[i]; if (!isPiece(x)) continue;
    for (let d = 0; d < 4; d++) {
      if (!has(x, d)) continue;
      const j = L.nb(i, d);
      if (j < 0) continue;
      const y = claims[j];
      if (y === 16 || (isPiece(y) && !has(y, OPP[d]))) clash.push(i, j);
    }
  }
  add("Two neighbouring squares disagree: one has track leading into the other, which doesn't connect back.", clash);

  const steep = [];
  for (let i = 0; i < L.n; i++) {
    const x = claims[i];
    const turn = [[0, 2], [0, 3], [1, 2], [1, 3]].find(([a, b]) => x === (BIT[a] | BIT[b]));
    if (turn && !levelTurn(L, m.h, i, turn[0], turn[1])) steep.push(i);
  }
  add("A line turns on a slope. Lines only turn where the square before, the turn and the square after are all the same height.", steep);

  const { find, selfCross, piece } = lines(m, claims);
  add("A line crosses itself. Crossings are only for two different lines.", selfCross);
  const ends = new Map();
  for (let i = 0; i < L.n; i++) if (m.endpoint[i] >= 0) {
    const r = find(L.E + i);
    if (!ends.has(r)) ends.set(r, []);
    ends.get(r).push(i);
  }
  for (const list of ends.values()) {
    const labels = new Set(list.map((i) => m.labels[m.endpoint[i]]));
    if (labels.size > 1) add(`Line ${[...labels].join(" and line ")} are joined together.`, list);
  }
  // Closed loops of track with no turntable.
  const loopCells = [];
  const byRoot = new Map();
  for (let i = 0; i < L.n; i++) for (let d = 0; d < 4; d++) if (piece[i] & BIT[d]) {
    const r = find(L.cellEdges[i][d]);
    if (!byRoot.has(r)) byRoot.set(r, { cells: new Set(), open: false });
    byRoot.get(r).cells.add(i);
  }
  for (let i = 0; i < L.n; i++) {
    const x = claims[i]; if (!isPiece(x)) continue;
    for (let d = 0; d < 4; d++) if ((x & BIT[d]) && !(piece[i] & BIT[d])) for (const [, v] of byRoot) if (v.cells.has(i)) v.open = true;
  }
  for (const [r, v] of byRoot) if (!ends.has(r) && !v.open && [...v.cells].every((c) => claims[c] === piece[c])) loopCells.push(...v.cells);
  add("This track closes into a loop. Every line runs from turntable to turntable.", loopCells);
  return out;
}
