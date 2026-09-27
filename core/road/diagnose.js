// Why isn't this road right? Checks a finished-looking road against the rules and explains, in the
// puzzle's own terms, each thing that's wrong. Input: per-square claims (bitmask L=1 R=2 U=4 D=8,
// 16 = marked empty); a road edge exists where both squares claim it.
import { buildModel, ON, DL, DR, DU, DD } from "./engine.js";

export const BIT = [1, 2, 4, 8];
const OPP = [1, 0, 3, 2];
const has = (x, d) => x < 16 && (x & BIT[d]) !== 0;

/** Road edges both squares agree on (ports always on). */
export function mutualEdges(m, claims) {
  const { L } = m, e = new Int8Array(L.E);
  e[L.PS] = ON; e[L.PN] = ON;
  for (let i = 0; i < L.n; i++) for (const d of [DR, DD]) {
    const j = L.nb(i, d);
    if (j >= 0 && has(claims[i], d) && has(claims[j], OPP[d])) e[L.cellEdges[i][d]] = ON;
  }
  return e;
}

/** Cells reachable from the toll plaza along agreed road. */
export function routeFromStart(m, e) {
  const { L } = m, seen = new Set([L.S]), q = [L.S];
  while (q.length) {
    const c = q.pop();
    for (let d = 0; d < 4; d++) {
      const ed = L.cellEdges[c][d];
      if (ed < 0 || ed >= L.PS || e[ed] !== ON) continue;
      const j = L.nb(c, d);
      if (!seen.has(j)) { seen.add(j); q.push(j); }
    }
  }
  return seen;
}

export const connected = (m, claims) => routeFromStart(m, mutualEdges(m, claims)).has(m.L.T);

export function diagnose(p, claims) {
  const m = buildModel(p), { L } = m, reasons = [];
  const e = mutualEdges(m, claims), route = routeFromStart(m, e);
  const ports = (i) => (i === L.S ? BIT[DD] : 0) | (i === L.T ? BIT[DU] : 0);

  // Loose ends: a square claims a side its neighbour doesn't.
  const loose = [];
  for (let i = 0; i < L.n; i++) {
    const x = claims[i]; if (!x || x >= 16) continue;
    for (let d = 0; d < 4; d++) {
      if (!has(x, d) || (ports(i) & BIT[d])) continue;
      const j = L.nb(i, d);
      if (j < 0 || !has(claims[j], OPP[d])) { loose.push(i); break; }
    }
  }
  if (loose.length) reasons.push({ text: `The road has ${loose.length === 1 ? "a loose end" : `${loose.length} loose ends`}: a piece points at a square that doesn't connect back.`, cells: loose });

  const stray = [];
  for (let i = 0; i < L.n; i++) if (claims[i] && claims[i] < 16 && !route.has(i)) stray.push(i);
  if (stray.length) reasons.push({ text: "Some road isn't part of the route from the toll plaza to Vista Point. There's only one road.", cells: stray });

  // The rules along the route.
  const onRoute = [...route];
  const pieceAt = (i) => { let x = 0; for (let d = 0; d < 4; d++) { const ed = L.cellEdges[i][d]; if (ed >= 0 && e[ed] === ON) x |= BIT[d]; } return x; };
  const turns = [], along = [];
  for (const i of onRoute) {
    const x = pieceAt(i), straight = x === 3 || x === 12;
    if (m.straight[i] && !m.orient[i] && !straight) turns.push(i);
    if ((m.orient[i] & 1) && (x & 3)) along.push(i);
    if ((m.orient[i] & 2) && (x & 12)) along.push(i);
  }
  if (turns.length) reasons.push({ text: "Spans can't bend: the road turns on open water here. It can only turn on land.", cells: turns });
  if (along.length) reasons.push({ text: "The road runs along a shipping lane here. It may only cross a lane straight over.", cells: along });

  for (const k of m.counts) {
    const used = k.cells.filter((c) => route.has(c)).length;
    if (used === k.n) continue;
    const text = k.kind === "land" ? `This island has ${used} road square${used === 1 ? "" : "s"}; its number says ${k.n}.`
      : k.kind === "ship" ? `This ship would pass under the road ${used} time${used === 1 ? "" : "s"}; its number says ${k.n}.`
      : k.kind === "hiker" ? `This hiker would hear ${used} twig${used === 1 ? "" : "s"} snap; their number says ${k.n}.`
      : `This foghorn hears ${used} road square${used === 1 ? "" : "s"}; its number says ${k.n}.`;
    reasons.push({ text, cells: [k.at, ...k.cells.filter((c) => route.has(c))] });
  }
  return reasons;
}

// ------------------------------------------------------------------ live rule checks
// Things on the board that already break a rule, whatever the rest turns out to be. Unfinished
// work (a piece pointing at an empty square) is not an error; only real contradictions are.
export function liveCheck(p, claims) {
  const m = buildModel(p), { L } = m, out = [];
  const add = (text, cells) => { if (cells.length) out.push({ text, cells }); };
  const isPiece = (x) => x > 0 && x < 16;
  const portBit = (i) => (i === L.S ? 8 : 0) | (i === L.T ? 4 : 0);

  const clash = [];
  for (let i = 0; i < L.n; i++) {
    const x = claims[i]; if (!isPiece(x)) continue;
    for (let d = 0; d < 4; d++) {
      if (!has(x, d) || (portBit(i) & BIT[d])) continue;
      const j = L.nb(i, d);
      if (j < 0) continue;
      const y = claims[j];
      if (y === 16 || (isPiece(y) && !has(y, OPP[d]))) { clash.push(i, j); }
    }
  }
  add("Two neighbouring squares disagree: one has road leading into the other, which doesn't connect back.", [...new Set(clash)]);

  const turnsOnWater = [], alongLane = [];
  for (let i = 0; i < L.n; i++) {
    const x = claims[i]; if (!isPiece(x)) continue;
    if (m.straight[i] && !m.orient[i] && x !== 3 && x !== 12 && [5, 6, 9, 10].includes(x)) turnsOnWater.push(i);
    if (((m.orient[i] & 1) && (x & 3)) || ((m.orient[i] & 2) && (x & 12))) alongLane.push(i);
  }
  add("Spans can't bend: a piece of road turns on open water.", turnsOnWater);
  add("A piece of road runs along a shipping lane; the road may only cross a lane straight over.", alongLane);

  // A closed loop of road that doesn't reach the shore.
  const e = mutualEdges(m, claims), seen = new Uint8Array(L.n), loops = [];
  for (let s = 0; s < L.n; s++) {
    if (seen[s] || !isPiece(claims[s])) continue;
    const comp = [], q = [s]; seen[s] = 1;
    let edges = 0;
    while (q.length) {
      const c = q.pop(); comp.push(c);
      for (let d = 0; d < 4; d++) {
        const ed = L.cellEdges[c][d];
        if (ed < 0 || ed >= L.PS || e[ed] !== ON) continue;
        edges++;
        const j = L.nb(c, d);
        if (!seen[j]) { seen[j] = 1; q.push(j); }
      }
    }
    if (comp.length > 2 && edges / 2 >= comp.length && !comp.includes(L.S) && !comp.includes(L.T)) loops.push(...comp);
  }
  add("This road closes into a loop. The bridge is one road from shore to shore.", loops);

  // Counting clues already over, or unable to reach their number.
  for (const k of m.counts) {
    const used = k.cells.filter((c) => isPiece(claims[c])).length;
    const possible = k.cells.filter((c) => claims[c] !== 16).length;
    const what = k.kind === "land" ? "island" : k.kind === "ship" ? "ship" : k.kind === "hiker" ? "hiker" : "foghorn";
    if (k.kind === "hiker" && used > k.n) add(`This hiker would hear more twigs snap than their number (${k.n}).`, [k.at, ...k.cells.filter((c) => isPiece(claims[c]))]);
    else if (used > k.n) add(`This ${what} already has more road than its number (${k.n}) allows.`, [k.at, ...k.cells.filter((c) => isPiece(claims[c]))]);
    else if (possible < k.n) add(`This ${what} needs ${k.n}, but too many of its squares are marked ×.`, [k.at]);
  }
  return out;
}
