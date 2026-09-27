// Shared generation pipeline (research/generation-heuristics.md §7):
//   route → clues the route supports → add clues until unique (each one kills a rival solution)
//   → remove every clue that isn't needed → optionally add some back for gentler levels
//   → human-solve, measure path shape, accept or reject.
import { Rng } from "../lib/rng.js";
import { layout, buildModel, solve, checkSolution, edgesFromPath, cellsUsed } from "../road/engine.js";
import { walkRoute } from "../road/walk.js";
import { humanSolve, analyse, gates } from "../road/human.js";
import { weightedPick } from "../lib/human.js";
export { weightedPick };

export const failures = {};
const fail = (why) => { failures[why] = (failures[why] || 0) + 1; return null; };

export function makeGenerator(v) {
  return function generate({ rows = 8, cols = 8, seed = 1, addBack = 0, route: routeOpts = {} } = {}) {
    const rng = new Rng(seed * 7919 + rows * 131 + cols);
    const route = walkRoute(rows, cols, rng, { ...v.routeDefaults(rows, cols), ...routeOpts });
    if (!route) return fail("route");
    const L = layout(rows, cols, route.start, route.end % cols);
    const truth = edgesFromPath(L, route.path);
    const used = cellsUsed(L, truth);
    const spec = { variant: v.id, rows, cols, start: route.start, end: route.end % cols, cells: Array(rows * cols).fill("."), rules: v.rules || {} };
    v.seed(spec, route, rng);
    v.recompute?.(spec, L, truth);
    if (!checkSolution(buildModel(spec), truth)) return fail("seed-invalid");

    // Add clues until the route is the only solution.
    const added = [];
    for (let iter = 0; ; iter++) {
      if (iter > 80) return fail("fix-iterations");
      const res = solve(buildModel(spec), { limit: 2, budget: 30000 });
      if (res.aborted) return fail("oracle-budget");
      if (res.count === 0) return fail("no-solution");
      if (res.count === 1) break;
      const alt = res.solutions.find((s) => s.some((x, i) => x !== truth[i]));
      const altUsed = cellsUsed(L, alt);
      const cands = v.candidates(spec, L, { truth, used, alt, altUsed, rng });
      if (!cands.length) return fail("no-candidates");
      const c = weightedPick(rng, cands);
      v.add(spec, c); v.recompute?.(spec, L, truth);
      added.push(c);
    }

    // Remove every clue whose absence still leaves one solution (random order).
    const removed = [];
    for (const x of rng.shuffle(v.removable(spec, route))) {
      if (v.remove(spec, x) === false) continue;
      v.recompute?.(spec, L, truth);
      const m = buildModel(spec);
      const ok = checkSolution(m, truth) && solve(m, { limit: 2, budget: 30000 }).count === 1;
      if (ok) removed.push(x); else { v.add(spec, x); v.recompute?.(spec, L, truth); }
    }
    // Gentler puzzles: put some redundant clues back.
    for (const x of rng.shuffle(removed).slice(0, addBack)) { if (v.add(spec, x) !== false) v.recompute?.(spec, L, truth); }

    const m = buildModel(spec);
    if (!checkSolution(m, truth)) return fail("final-invalid");
    const trace = humanSolve(m);
    if (!trace.solved) return fail("human-stuck");
    if (trace.edges.some((x, i) => x !== truth[i])) return fail("human-mismatch");
    const rating = analyse(m, trace);
    const onEdges = []; truth.forEach((x, i) => { if (x && i < L.PS) onEdges.push(i); });
    return {
      id: `${v.id}-${rows}x${cols}-s${seed}${addBack ? "-a" + addBack : ""}`,
      variant: v.id, rows, cols, start: spec.start, end: spec.end, seed, addBack,
      cells: spec.cells.join(""), rules: spec.rules,
      ...(spec.lands ? { lands: spec.lands } : {}), ...(spec.ships ? { ships: spec.ships } : {}), ...(spec.fogs ? { fogs: spec.fogs } : {}), ...(spec.hikers ? { hikers: spec.hikers } : {}),
      solution: onEdges, rating, gates: gates(rating),
    };
  };
}
