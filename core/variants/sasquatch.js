// Sasquatch (Pacific Northwest woods). You are the Sasquatch: sneak from the den to the river
// along one trail that never steps into a hiker's view. Hikers face a fixed way and look straight
// ahead until a tree; a number on a hiker is how many twigs they heard snap (trail squares among
// the eight around them). Engine: core/road (same line engine as Golden Gate).
import { makeGenerator } from "./common.js";
import { hikerView, fogCells } from "../road/engine.js";

const DIRS = ["U", "D", "L", "R"];

export const sasquatch = {
  id: "sasquatch",
  family: "trail",
  name: "Sasquatch",
  tagline: "Sneak past the hikers to the river.",
  ruleText: [
    "Lead the Sasquatch from its den to the river along one trail that never branches or crosses itself, and never steps where a hiker can see: hikers look straight ahead until a tree blocks the view.",
    "A number on a hiker is how many twigs they heard snap: the trail squares among the eight squares around them.",
  ],
  routeDefaults: (R, C) => ({ minSeg: 2, maxSeg: Math.max(3, Math.floor(Math.min(R, C) / 2)), minTurns: Math.round(R * 0.5), maxTurns: R + 3, downProb: 0.3, minCover: 0.22, maxCover: 0.5 }),
  // A sprinkling of trees off the trail: they block both the trail and the hikers' view.
  seed(spec, route, rng) {
    spec.hikers = {};
    const onRoute = new Set(route.path), n = spec.cells.length;
    const S = (spec.rows - 1) * spec.cols + route.start, T = route.end % spec.cols;
    for (let k = 0, want = Math.round(n * (0.08 + rng.next() * 0.06)); k < n * 4 && want > 0; k++) {
      const i = rng.int(n);
      if (onRoute.has(i) || spec.cells[i] !== "." || i === S || i === T) continue;
      spec.cells[i] = "#"; want--;
    }
  },
  recompute(spec, L, truth) {
    for (const [k, h] of Object.entries(spec.hikers)) {
      if (h.n === null) continue;
      h.n = fogCells(L, spec.cells, +k).filter((c) => L.cellEdges[c].some((ed) => ed >= 0 && truth[ed])).length;
    }
  },
  candidates(spec, L, { used, altUsed }) {
    const out = [];
    for (let i = 0; i < L.n; i++) {
      if (spec.cells[i] !== "." || used[i] || i === L.S || i === L.T) continue;
      const around = fogCells(L, spec.cells, i);
      const nT = around.filter((c) => used[c]).length, nA = around.filter((c) => altUsed[c]).length;
      for (const dir of DIRS) {
        const view = hikerView(L, spec.cells, i, dir);
        if (view.some((c) => used[c] || c === L.S || c === L.T)) continue; // must never see the true trail
        const sightKills = altUsed[i] || view.some((c) => altUsed[c]);
        // Numbered hikers (the counting clue) are preferred; a silent hiker must earn its place by sight.
        if (sightKills || nT !== nA) out.push({ kind: "hiker", i, dir, n: nT, w: 2 + (nT > 0 ? 1 : 0) });
        if (sightKills && view.length >= 2) out.push({ kind: "hiker", i, dir, n: null, w: 1 });
      }
    }
    return out;
  },
  add(spec, x) {
    if (x.kind === "num") { if (!spec.hikers[x.i]) return false; spec.hikers[x.i].n = 0; return; }
    spec.cells[x.i] = "h"; spec.hikers[x.i] = { dir: x.dir, n: x.n === null ? null : 0 };
  },
  remove(spec, x) {
    if (x.kind === "num") { if (!spec.hikers[x.i] || spec.hikers[x.i].n === null) return false; spec.hikers[x.i].n = null; return; }
    spec.cells[x.i] = "."; delete spec.hikers[x.i];
  },
  removable(spec) {
    const out = [];
    for (const [k, h] of Object.entries(spec.hikers)) { out.push({ kind: "hiker", i: +k, dir: h.dir, n: h.n }); if (h.n !== null) out.push({ kind: "num", i: +k }); }
    return out;
  },
  tierNames: { 1: "Direct", 2: "No loops", 3: "Connection", 4: "Twig overlap / short look-ahead", 5: "Long look-ahead" },
  ruleHints: {
    "count-done": "This hiker has already heard all the twigs their number says; the trail doesn't pass their other squares.",
    "count-all": "This hiker needs every square around them that the trail can still use.",
    overlap: "Compare two hikers who share squares: the difference in their numbers settles the squares only one of them hears.",
    reach: "The trail can't get to these squares from the den without being seen.",
    pocket: "A trail that went in here could never come back out.",
    bottleneck: "Every hidden route from the den to the river has to pass through here.",
    loop: "Joining these would close a loop, but the Sasquatch walks one trail.",
    early: "Joining these would finish the trail too soon and leave a hiker's count unmet.",
  },
};
sasquatch.generate = makeGenerator(sasquatch);
