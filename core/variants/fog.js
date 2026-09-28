// Variant 3 — Fog Signals.
// Foghorns stand in the fog; each one hears the road passing close by. Its number counts the road
// squares among the eight squares around it. The bridge's towers rise above the fog in pairs: the
// road runs straight over each tower and on to its twin, so the solver can lay road mid-bay.
import { makeGenerator } from "./common.js";
import { fogCells, buildModel, checkSolution } from "../road/engine.js";

/** Runs of straight squares along the route (candidate tower spots), shores excluded. */
function straightRuns(L, path) {
  const runs = [];
  let cur = null;
  for (let k = 0; k < path.length; k++) {
    const c = path[k], prev = k ? path[k - 1] : c + L.C, next = k + 1 < path.length ? path[k + 1] : c - L.C;
    const straight = prev - c === c - next;
    const axis = Math.abs(prev - c) === 1 ? 0 : 1;
    if (straight && c !== L.S && c !== L.T) {
      if (cur && cur.axis === axis && cur.cells[cur.cells.length - 1] === prev) cur.cells.push(c);
      else { cur = { axis, cells: [c] }; runs.push(cur); }
    } else cur = null;
  }
  return runs.filter((r) => r.cells.length >= 2);
}

export const fog = {
  id: "fog",
  name: "Fog Signals",
  tagline: "Listen for the road through the fog; find the towers' twins.",
  rules: {},
  ruleText: [
    "Build one road from the toll plaza to Vista Point that never branches or crosses itself, and keep it off the foghorns.",
    "Each foghorn hears the road nearby: its number counts the road squares among the eight squares around it.",
    "Towers stand in pairs. The road runs straight over every tower, and each straight stretch with a tower on it has exactly two.",
  ],
  routeDefaults: (R, C) => ({ minSeg: 2, maxSeg: Math.max(4, Math.round(Math.min(R, C) * 0.6)), minTurns: Math.round(R * 0.5), maxTurns: R + 3, downProb: 0.3, minCover: 0.22, maxCover: 0.5 }),
  // Every puzzle starts with a few tower pairs on the route's straight runs, so there is always
  // something to build mid-bay; the generator never removes these.
  seed(spec, route, rng) {
    spec.fogs = {}; spec.towers = [];
    const L = { C: spec.cols, S: (spec.rows - 1) * spec.cols + spec.start, T: spec.end };
    const runs = rng.shuffle(straightRuns(L, route.path).filter((r) => r.cells.length >= 3));
    const want = Math.min(runs.length, Math.max(2, Math.round(spec.rows * spec.cols / 30)));
    for (const run of runs.slice(0, want)) {
      // Twins stand at least one square apart.
      const a = rng.int(run.cells.length - 2), b = a + 2 + rng.int(run.cells.length - a - 2);
      spec.towers.push(run.cells[a], run.cells[b]);
    }
    spec.fixedTowers = spec.towers.length;
  },
  recompute(spec, L, truth) {
    for (const k of Object.keys(spec.fogs)) {
      spec.fogs[k] = fogCells(L, spec.cells, +k).filter((c) => L.cellEdges[c].some((ed) => ed >= 0 && truth[ed])).length;
    }
  },
  candidates(spec, L, { used, alt, altUsed, route }) {
    const out = [];
    const count = (at, u) => fogCells(L, spec.cells, at).filter((c) => u[c]).length;
    for (let i = 0; i < L.n; i++) {
      if (spec.cells[i] !== "." || used[i] || i === L.S || i === L.T) continue;
      const nT = count(i, used), nA = count(i, altUsed);
      if (altUsed[i] || nT !== nA) out.push({ kind: "fog", i, w: nT > 0 ? 1.5 : 1 });
    }
    // Tower pairs on a straight run the route takes that has none yet, if they rule out the rival.
    const has = new Set(spec.towers);
    for (const run of straightRuns(L, route.path)) {
      if (run.cells.some((c) => has.has(c))) continue;
      const pairs = [];
      for (let a = 0; a < run.cells.length; a++) for (let b = a + 2; b < run.cells.length; b++) {
        const x = { kind: "tower", a: run.cells[a], b: run.cells[b] };
        if (!checkSolution(buildModel({ ...spec, towers: [...spec.towers, x.a, x.b] }), alt)) pairs.push(x);
      }
      for (const x of pairs) { x.w = 3 / pairs.length; out.push(x); }
    }
    return out;
  },
  noTrials: true,
  // Every clue the route supports, rival or not (used to unstick a solver without look-aheads).
  allCandidates(spec, L, { used, route }) {
    const out = [];
    for (let i = 0; i < L.n; i++) if (spec.cells[i] === "." && !used[i] && i !== L.S && i !== L.T) out.push({ kind: "fog", i, w: 1 });
    const has = new Set(spec.towers);
    for (const run of straightRuns(L, route.path)) {
      if (run.cells.some((c) => has.has(c))) continue;
      const n = Math.max(1, (run.cells.length - 1) * (run.cells.length - 2) / 2);
      for (let a = 0; a < run.cells.length; a++) for (let b = a + 2; b < run.cells.length; b++) out.push({ kind: "tower", a: run.cells[a], b: run.cells[b], w: 1.5 / n });
    }
    return out;
  },
  add(spec, x) {
    if (x.kind === "tower") spec.towers.push(x.a, x.b);
    else { spec.cells[x.i] = "f"; spec.fogs[x.i] = 0; }
  },
  remove(spec, x) {
    if (x.kind === "tower") spec.towers = spec.towers.filter((c) => c !== x.a && c !== x.b);
    else { spec.cells[x.i] = "."; delete spec.fogs[x.i]; }
  },
  removable(spec) {
    const out = Object.keys(spec.fogs).map((k) => ({ kind: "fog", i: +k }));
    // Towers were added in pairs; recover the pairs by order of addition.
    for (let k = spec.fixedTowers || 0; k + 1 < spec.towers.length; k += 2) out.push({ kind: "tower", a: spec.towers[k], b: spec.towers[k + 1] });
    return out;
  },
};
fog.generate = makeGenerator(fog);
