// Sasquatch generator: trees, then a family of Sasquatches that can't see each other, then patches
// of woods grown around them, then hikers — each one placed only where no Sasquatch is in view and
// some Sasquatch watches them — added to rule out rival hiding places and to unstick a solver that
// never looks ahead, then removed again wherever the puzzle stays unique and solvable without them.
import { Rng } from "../lib/rng.js";
import { makeHuman, analyse, gates, weightedPick } from "../lib/human.js";
import { buildModel, solve, checkSolution, initState, propagate, watchEngine, DIRS, UNK, NO } from "./engine.js";

export const failures = {};
const fail = (why) => { failures[why] = (failures[why] || 0) + 1; return null; };
const H = makeHuman(watchEngine);

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generate({ rows = 7, cols = 7, seed = 1, addBack = 0, trees: treeRate = 0.07 } = {}) {
  const rng = new Rng(seed * 104729 + rows * 97 + cols * 13 + 5);
  const n = rows * cols, K = Math.round((rows + cols) / 2);
  let cells, truth;
  for (let attempt = 0; ; attempt++) {
    if (attempt > 60) return fail("placement");
    cells = Array(n).fill(".");
    for (let i = 0; i < n; i++) if (rng.next() < treeRate) cells[i] = "#";
    const m0 = buildModel({ rows, cols, cells: cells.join(""), regions: "A".repeat(n), hikers: {} });
    const sq = [], banned = new Uint8Array(n);
    for (const i of rng.shuffle([...Array(n).keys()])) {
      if (cells[i] !== "." || banned[i]) continue;
      // Keep them spread out: no two touching, even diagonally.
      const r = Math.floor(i / cols), c = i % cols;
      if (sq.some((j) => Math.abs(Math.floor(j / cols) - r) <= 1 && Math.abs((j % cols) - c) <= 1)) continue;
      sq.push(i); banned[i] = 1; m0.sees[i].forEach((j) => (banned[j] = 1));
      if (sq.length === K) break;
    }
    if (sq.length === K) { truth = sq; break; }
  }
  // Patches: grow from each Sasquatch at random until the woods are shared out.
  const region = new Int16Array(n).fill(-1), frontier = [];
  truth.forEach((i, k) => { region[i] = k; frontier.push(i); });
  const nb = (i) => { const r = Math.floor(i / cols), c = i % cols, out = []; if (c > 0) out.push(i - 1); if (c < cols - 1) out.push(i + 1); if (r > 0) out.push(i - cols); if (r < rows - 1) out.push(i + cols); return out; };
  while (frontier.length) {
    const k = rng.int(frontier.length), i = frontier[k];
    const free = nb(i).filter((j) => region[j] < 0);
    if (!free.length) { frontier.splice(k, 1); continue; }
    const j = rng.pick(free); region[j] = region[i]; frontier.push(j);
  }
  const spec = { variant: "sasquatch", rows, cols, cells, regions: Array.from(region, (r) => LETTERS[r]).join(""), hikers: {} };
  const model = () => buildModel({ ...spec, cells: spec.cells.join("") });

  // Every hiker the hidden answer allows: on open ground, seeing no Sasquatch, watched by one.
  const truthSet = new Set(truth);
  const allHikers = () => {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (spec.cells[i] !== "." || truthSet.has(i)) continue;
      for (const dir of DIRS) {
        const s2 = { ...spec, cells: spec.cells.slice(), hikers: { ...spec.hikers, [i]: { dir } } };
        s2.cells[i] = "h";
        const m = buildModel({ ...s2, cells: s2.cells.join("") });
        if (!checkSolution(m, truth)) continue;
        const view = m.hikers.find((h) => h.at === i).view.length;
        out.push({ kind: "hiker", i, dir, m, w: view >= 2 ? 0.6 : view === 1 ? 0.4 : 0.2 });
      }
    }
    return out;
  };
  const add = (x) => {
    if (x.kind === "move") { const r = spec.regions.split(""); r[x.i] = x.to; spec.regions = r.join(""); return; }
    spec.cells[x.i] = "h"; spec.hikers[x.i] = { dir: x.dir };
  };
  const remove = (x) => { spec.cells[x.i] = "."; delete spec.hikers[x.i]; };

  // Reshaping the patches: hand a border square to a neighbouring patch, keeping both in one piece.
  const connectedWithout = (letter, drop) => {
    const cellsOf = []; for (let i = 0; i < n; i++) if (spec.regions[i] === letter && i !== drop) cellsOf.push(i);
    if (!cellsOf.length) return false;
    const seen = new Set([cellsOf[0]]), q = [cellsOf[0]];
    while (q.length) for (const j of nb(q.pop())) if (!seen.has(j) && j !== drop && spec.regions[j] === letter) { seen.add(j); q.push(j); }
    return seen.size === cellsOf.length;
  };
  const allMoves = () => {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (truthSet.has(i)) continue;
      const from = spec.regions[i];
      const tos = new Set(nb(i).map((j) => spec.regions[j]).filter((x) => x !== from));
      if (!tos.size || !connectedWithout(from, i)) continue;
      for (const to of tos) {
        const r = spec.regions.split(""); r[i] = to;
        const m = buildModel({ ...spec, cells: spec.cells.join(""), regions: r.join("") });
        out.push({ kind: "move", i, to, m, w: 2 });
      }
    }
    return out;
  };

  for (let iter = 0; ; iter++) {
    if (iter > 60) return fail("fix-iterations");
    const res = solve(model(), { limit: 2 });
    if (res.aborted) return fail("oracle-budget");
    if (res.count === 0) return fail("no-solution");
    if (res.count === 1) break;
    const alt = res.solutions.find((s) => s.some((x) => !truthSet.has(x)));
    // Prefer reshaping the patches; hikers are the seasoning.
    const moves = allMoves().filter((x) => !checkSolution(x.m, alt));
    const cands = moves.length && rng.next() < 0.85 ? moves : allHikers().filter((x) => !checkSolution(x.m, alt));
    if (!cands.length) return fail("no-candidates");
    add(weightedPick(rng, cands));
  }
  // No look-aheads: wherever the solver gets stuck, add a hiker that lets it carry on from there.
  for (let iter = 0; ; iter++) {
    if (iter > 40) return fail("stuck-iterations");
    const t = H.humanSolve(model(), { trials: false });
    if (t.solved) break;
    const unknown = (st) => st.v.reduce((a, x) => a + (x === UNK ? 1 : 0), 0);
    const useMoves = rng.next() < 0.7;
    const helps = (useMoves ? allMoves() : allHikers()).filter((x) => {
      const st = initState(x.m);
      for (let i = 0; i < n; i++) if (t.state.v[i] !== UNK && x.m.open[i]) st.v[i] = t.state.v[i];
      // A reshaped patch may undo what the old shape settled; judge it on a fresh solve instead.
      if (x.kind === "move") return H.humanSolve(x.m, { trials: false }).steps.length > t.steps.length;
      return propagate(x.m, st, 3, 3) !== "contra" && unknown(st) < unknown(t.state);
    });
    if (!helps.length) continue;
    add(weightedPick(rng, helps));
  }
  const removed = [];
  for (const [k, h] of rng.shuffle(Object.entries(spec.hikers))) {
    const x = { kind: "hiker", i: +k, dir: h.dir };
    remove(x);
    const m = model();
    const ok = checkSolution(m, truth) && solve(m, { limit: 2 }).count === 1 && H.humanSolve(m, { trials: false }).solved;
    if (ok) removed.push(x); else add(x);
  }
  for (const x of rng.shuffle(removed).slice(0, addBack)) add(x);

  const m = model();
  if (!checkSolution(m, truth)) return fail("final-invalid");
  const trace = H.humanSolve(m, { trials: false });
  if (!trace.solved) return fail("human-stuck");
  const rating = analyse(m, trace, null);
  return {
    id: `sasquatch-${rows}x${cols}-s${seed}${addBack ? "-a" + addBack : ""}`,
    variant: "sasquatch", rows, cols, seed, addBack,
    cells: spec.cells.join(""), regions: spec.regions, hikers: spec.hikers,
    solution: truth.slice().sort((a, b) => a - b), rating, gates: gates(rating),
  };
}
