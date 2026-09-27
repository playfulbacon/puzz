// Variant 3 — Fog Signals.
// Foghorns stand in the fog; each one hears the road passing close by. Its number counts the road
// squares among the eight squares around it.
import { makeGenerator } from "./common.js";
import { fogCells } from "../road/engine.js";

export const fog = {
  id: "fog",
  name: "Fog Signals",
  tagline: "Listen for the road through the fog.",
  rules: {},
  ruleText: [
    "Build one road from the toll plaza to Vista Point that never branches or crosses itself, and keep it off the foghorns.",
    "Each foghorn hears the road nearby: its number counts the road squares among the eight squares around it.",
  ],
  routeDefaults: (R, C) => ({ minSeg: 2, maxSeg: Math.max(3, Math.floor(Math.min(R, C) / 2)), minTurns: Math.round(R * 0.5), maxTurns: R + 3, downProb: 0.3, minCover: 0.22, maxCover: 0.5 }),
  seed(spec) { spec.fogs = {}; },
  recompute(spec, L, truth) {
    for (const k of Object.keys(spec.fogs)) {
      spec.fogs[k] = fogCells(L, spec.cells, +k).filter((c) => L.cellEdges[c].some((ed) => ed >= 0 && truth[ed])).length;
    }
  },
  candidates(spec, L, { truth, used, altUsed }) {
    const out = [];
    const count = (at, u) => fogCells(L, spec.cells, at).filter((c) => u[c]).length;
    for (let i = 0; i < L.n; i++) {
      if (spec.cells[i] !== "." || used[i] || i === L.S || i === L.T) continue;
      const nT = count(i, used), nA = count(i, altUsed);
      if (altUsed[i] || nT !== nA) out.push({ i, w: nT > 0 ? 1.5 : 1 });
    }
    return out;
  },
  add(spec, x) { spec.cells[x.i] = "f"; spec.fogs[x.i] = 0; },
  remove(spec, x) { spec.cells[x.i] = "."; delete spec.fogs[x.i]; },
  removable(spec) { return Object.keys(spec.fogs).map((k) => ({ i: +k })); },
};
fog.generate = makeGenerator(fog);
