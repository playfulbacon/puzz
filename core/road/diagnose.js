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
      : `This foghorn hears ${used} road square${used === 1 ? "" : "s"}; its number says ${k.n}.`;
    reasons.push({ text, cells: [k.at, ...k.cells.filter((c) => route.has(c))] });
  }
  return reasons;
}
