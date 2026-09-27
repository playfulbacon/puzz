// Variant 2 — Shipping Lanes.
// Each ship sails straight out to sea along its lane. The road may only cross a lane at right angles
// (a bridge never runs along a channel), and the ship's number says how many times it passes under.
import { makeGenerator } from "./common.js";
import { laneCells, buildModel, checkSolution } from "../road/engine.js";

const DIRS = ["U", "D", "L", "R"];

export const lanes = {
  id: "lanes",
  name: "Shipping Lanes",
  tagline: "Every ship must get out to sea, under the bridge.",
  rules: {},
  ruleText: [
    "Build one road from the toll plaza to Vista Point that never branches or crosses itself, and keep it off the ships.",
    "Each ship sails straight out to sea along its lane. The road may only cross a lane at right angles, and the number says how many times the ship passes under it.",
  ],
  routeDefaults: (R, C) => ({ minSeg: 2, maxSeg: Math.max(3, Math.floor(Math.min(R, C) / 2)), minTurns: Math.round(R * 0.55), maxTurns: R + 4, downProb: 0.3, minCover: 0.22, maxCover: 0.5 }),
  seed(spec) { spec.ships = {}; },
  recompute(spec, L, truth) {
    for (const [k, s] of Object.entries(spec.ships)) {
      if (s.n === null) continue;
      const lane = laneCells(L, spec.cells, +k, s.dir);
      s.n = lane.filter((c) => usedIn(L, truth, c)).length;
    }
  },
  candidates(spec, L, { truth, used, alt, altUsed }) {
    const out = [];
    for (let i = 0; i < L.n; i++) {
      if (spec.cells[i] !== "." || used[i] || i === L.S || i === L.T) continue;
      for (const dir of DIRS) {
        const lane = laneCells(L, spec.cells, i, dir);
        if (lane.length < 2) continue;
        spec.cells[i] = "s"; spec.ships[i] = { dir, n: 0 };
        lanes.recompute(spec, L, truth);
        const m = buildModel(spec);
        const valid = checkSolution(m, truth);
        const kills = valid && (altUsed[i] || !checkSolution(m, alt));
        spec.cells[i] = "."; delete spec.ships[i];
        lanes.recompute(spec, L, truth);
        if (kills) out.push({ kind: "ship", i, dir, w: 1 + lane.length / 3 });
      }
    }
    return out;
  },
  // Removing a clue either sinks the whole ship or just hides its number (the lane stays).
  add(spec, x) {
    if (x.kind === "num") { if (!spec.ships[x.i]) return false; spec.ships[x.i].n = 0; }
    else { spec.cells[x.i] = "s"; spec.ships[x.i] = { dir: x.dir, n: 0 }; }
  },
  remove(spec, x) {
    if (x.kind === "num") { if (!spec.ships[x.i] || spec.ships[x.i].n === null) return false; spec.ships[x.i].n = null; }
    else { spec.cells[x.i] = "."; delete spec.ships[x.i]; }
  },
  removable(spec) {
    const out = [];
    for (const [k, s] of Object.entries(spec.ships)) { out.push({ kind: "ship", i: +k, dir: s.dir }); out.push({ kind: "num", i: +k }); }
    return out;
  },
};
lanes.generate = makeGenerator(lanes);

function usedIn(L, e, c) {
  for (const ed of L.cellEdges[c]) if (ed >= 0 && e[ed]) return true;
  return false;
}
