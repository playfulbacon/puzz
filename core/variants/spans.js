// Variant 1 — Spans.
// Over open water the road runs dead straight: a bridge span can't bend, so the road only turns on
// land. A number on an island counts the island squares the road uses. Rocks block spans.
import { makeGenerator } from "./common.js";
import { landRegion } from "../road/engine.js";

const DR_ = [0, 0, -1, 1], DC_ = [-1, 1, 0, 0];

export const spans = {
  id: "spans",
  name: "Spans",
  tagline: "Straight across the water, turning only on land.",
  rules: { waterStraight: true },
  ruleText: [
    "Build one road from the toll plaza to Vista Point that never branches or crosses itself.",
    "Over open water it runs dead straight, so it can only turn on land. A number on an island counts the island squares the road uses.",
  ],
  routeDefaults: (R, C) => ({ minSeg: 1, maxSeg: Math.max(3, Math.floor(Math.min(R, C) / 2)), minTurns: Math.round(R * 0.6), maxTurns: R + 4, downProb: 0.35, minCover: 0.22, maxCover: 0.5 }),
  // Land grows out from every turn (the road must turn on land), plus a few islands off the route.
  seed(spec, route, rng) {
    const { rows: R, cols: C } = spec, n = R * C;
    const S = (R - 1) * C + route.start, T = route.end % C;
    spec.lands = {};
    const grow = (seedCell, size) => {
      const blob = [seedCell]; spec.cells[seedCell] = "o";
      for (let tries = 0; blob.length < size && tries < 40; tries++) {
        const b = rng.pick(blob), d = rng.int(4);
        const r = Math.floor(b / C) + DR_[d], c = (b % C) + DC_[d];
        if (r < 0 || c < 0 || r >= R || c >= C) continue;
        const j = r * C + c;
        if (j === S || j === T || spec.cells[j] !== ".") continue;
        spec.cells[j] = "o"; blob.push(j);
      }
    };
    for (const t of route.turns) grow(t, rng.range(1, 4));
    const onRoute = new Set(route.path);
    for (let k = 0, extra = rng.range(1, 3); k < 60 && extra > 0; k++) {
      const i = rng.int(n);
      if (onRoute.has(i) || spec.cells[i] !== "." || i === S || i === T) continue;
      grow(i, rng.range(1, 3)); extra--;
    }
  },
  recompute(spec, L, truth) {
    for (const k of Object.keys(spec.lands)) {
      spec.lands[k] = landRegion(L, spec.cells, +k).filter((c) => L.cellEdges[c].some((ed) => ed >= 0 && truth[ed])).length;
    }
  },
  candidates(spec, L, { truth, alt, used, altUsed }) {
    const out = [], labelled = new Set();
    for (const k of Object.keys(spec.lands)) for (const c of landRegion(L, spec.cells, +k)) labelled.add(c);
    const seenRegion = new Set();
    for (let i = 0; i < L.n; i++) {
      if (spec.cells[i] === "o" && !labelled.has(i) && !seenRegion.has(i)) {
        const reg = landRegion(L, spec.cells, i);
        reg.forEach((c) => seenRegion.add(c));
        const nT = reg.filter((c) => used[c]).length, nA = reg.filter((c) => altUsed[c]).length;
        if (nT !== nA) out.push({ kind: "num", i: labelCell(L, reg, used), w: 2 });
      }
      if (spec.cells[i] === "." && i !== L.S && i !== L.T && altUsed[i] && !used[i]) out.push({ kind: "#", i, w: 1 });
      // Erode a land square only the rival route uses: it becomes open water, where the rival can't turn.
      if (spec.cells[i] === "o" && !(i in spec.lands) && altUsed[i] && !used[i]) out.push({ kind: "erode", i, w: 1.5 });
      // ...or one the true road crosses straight while the rival turns on it.
      if (spec.cells[i] === "o" && !(i in spec.lands) && used[i] && altUsed[i] && straightAt(L, truth, i) && !straightAt(L, alt, i)) out.push({ kind: "erode", i, w: 1.5 });
    }
    return out;
  },
  add(spec, x) {
    if (x.kind === "num") spec.lands[x.i] = 0;
    else if (x.kind === "erode") { spec.cells[x.i] = "."; relabel(spec); }
    else spec.cells[x.i] = "#";
  },
  remove(spec, x) { if (x.kind === "num") delete spec.lands[x.i]; else spec.cells[x.i] = "."; },
  removable(spec) {
    const out = Object.keys(spec.lands).map((k) => ({ kind: "num", i: +k }));
    spec.cells.forEach((ch, i) => { if (ch === "#") out.push({ kind: "#", i }); });
    return out;
  },
};
spans.generate = makeGenerator(spans);

function straightAt(L, e, i) {
  const on = (d) => L.cellEdges[i][d] >= 0 && e[L.cellEdges[i][d]] === 1;
  return (on(0) && on(1)) || (on(2) && on(3));
}

// Eroding can split an island in two; drop numbers that now share a region with another number.
function relabel(spec) {
  const C = spec.cols, R = spec.rows, keys = Object.keys(spec.lands).map(Number), owner = new Map();
  const L = { C, nb: (i, d) => { const r = Math.floor(i / C) + DR_[d], c = (i % C) + DC_[d]; return r < 0 || c < 0 || r >= R || c >= C ? -1 : r * C + c; } };
  for (const k of keys) {
    const reg = landRegion(L, spec.cells, k);
    const key = Math.min(...reg);
    if (owner.has(key)) delete spec.lands[k]; else owner.set(key, k);
  }
}

// Put the number on an island square the road doesn't use when possible, nearest the island's middle.
function labelCell(L, reg, used) {
  const r = reg.reduce((a, c) => a + Math.floor(c / L.C), 0) / reg.length, c0 = reg.reduce((a, c) => a + (c % L.C), 0) / reg.length;
  const score = (c) => (used[c] ? 10 : 0) + Math.abs(Math.floor(c / L.C) - r) + Math.abs((c % L.C) - c0);
  return reg.slice().sort((a, b) => score(a) - score(b))[0];
}
