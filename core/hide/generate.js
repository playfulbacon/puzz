// Sasquatch generator: pick the hiding place, plant a forest, then place hikers (each facing a way
// that never looks at the hiding place) until every other square is watched. Number every hiker,
// check the facings are unique, then take numbers away while they stay unique.
import { Rng } from "../lib/rng.js";
import { makeHuman, analyse, gates } from "../lib/human.js";
import { buildModel, solve, hidingSpot, hideEngine } from "./engine.js";

const DR = [0, 0, -1, 1], DC = [-1, 1, 0, 0];
const H = makeHuman(hideEngine);
export const failures = {};
const fail = (why) => { failures[why] = (failures[why] || 0) + 1; return null; };

export function generate({ rows = 7, cols = 7, seed = 1, addBack = 0, trees = null, clump = 0.35 } = {}) {
  const rng = new Rng(seed * 104729 + rows * 97 + cols);
  const n = rows * cols;
  const nb = (i, d) => { const r = Math.floor(i / cols) + DR[d], c = (i % cols) + DC[d]; return r < 0 || c < 0 || r >= rows || c >= cols ? -1 : r * cols + c; };
  const cells = Array(n).fill(".");

  // Trees in small stands.
  const target = Math.round(n * (trees ?? (0.1 + rng.next() * 0.06)));
  for (let placed = 0, guard = 0; placed < target && guard < n * 20; guard++) {
    let i = rng.int(n);
    if (rng.chance(clump)) {
      const stand = cells.map((ch, k) => (ch === "#" ? k : -1)).filter((k) => k >= 0);
      if (stand.length) { const j = nb(rng.pick(stand), rng.int(4)); if (j >= 0) i = j; }
    }
    if (cells[i] === "#") continue;
    cells[i] = "#"; placed++;
  }
  const grounds = cells.map((ch, i) => (ch === "." ? i : -1)).filter((i) => i >= 0);
  if (grounds.length < n * 0.5) return fail("too-many-trees");
  const spot = rng.pick(grounds);

  // Hikers: greedily watch every unwatched square, never looking at the hiding place.
  const facing = new Map();
  const spec = { rows, cols, cells, numbers: {} };
  const ray = (i, d) => { const out = []; let j = nb(i, d); while (j >= 0 && cells[j] !== "#") { out.push(j); j = nb(j, d); } return out; };
  const watched = () => {
    const seen = new Uint8Array(n);
    for (const [i, d] of facing) for (const c of ray(i, d)) seen[c] = 1;
    return seen;
  };
  for (let guard = 0; guard < n; guard++) {
    const seen = watched();
    const open = cells.map((ch, i) => (ch === "." && i !== spot && !seen[i] ? i : -1)).filter((i) => i >= 0);
    if (!open.length) break;
    // Best placement over all unwatched squares (most new squares watched), a little randomised.
    const cands = [];
    const openSet = new Set(open);
    for (let p = 0; p < n; p++) {
      if (cells[p] !== "." || p === spot) continue;
      for (let d = 0; d < 4; d++) {
        const view = ray(p, d);
        if (view.includes(spot)) continue;
        // Standing here also takes this square out of the "needs watching" list.
        const gain = view.filter((c) => openSet.has(c)).length + (openSet.has(p) ? 1 : 0);
        if (gain) cands.push({ p, dir: d, w: gain + rng.next() * 1.5 });
      }
    }
    if (!cands.length) return fail("cannot-cover");
    cands.sort((a, b) => b.w - a.w);
    const pick = cands[Math.min(cands.length - 1, rng.int(2))];
    cells[pick.p] = "h"; facing.set(pick.p, pick.dir);
  }
  // Number every hiker with the length of its true view, then repair ambiguity: while a rival set
  // of facings exists, drop a hiker nobody needs, or plant a tree that changes what a rival-facing
  // hiker would see. Every change keeps the true facings valid.
  const renumber = () => {
    spec.numbers = {};
    const mm = buildModel(spec);
    for (const h of mm.hikers) spec.numbers[h.at] = h.len[facing.get(h.at)];
    return buildModel(spec);
  };
  const truthOf = (mm) => mm.hikers.map((h) => facing.get(h.at));
  const valid = () => { const mm = renumber(); return hidingSpot(mm, truthOf(mm)) === spot; };
  if (!valid()) return fail("seed-invalid");
  let m;
  for (let iter = 0; ; iter++) {
    m = renumber();
    const res = solve(m, { limit: 2 });
    if (res.aborted) return fail("oracle-budget");
    if (res.count === 1) break;
    if (iter > 25) return fail("not-unique");
    const truth = truthOf(m);
    const alt = res.solutions.find((sol) => sol.some((d, k) => d !== truth[k]));
    const repairs = [];
    m.hikers.forEach((h, k) => {
      if (alt[k] === truth[k]) return;
      repairs.push({ kind: "drop", i: h.at, w: 2 });
      for (const c of m.ray(h.at, alt[k])) if (cells[c] === "." && c !== spot) repairs.push({ kind: "tree", i: c, w: 1 });
    });
    let fixed = false;
    for (const r of rng.shuffle(repairs)) {
      const before = cells[r.i], dir = facing.get(r.i);
      if (r.kind === "drop") { cells[r.i] = "."; facing.delete(r.i); } else cells[r.i] = "#";
      if (valid()) { fixed = true; break; }
      cells[r.i] = before; if (r.kind === "drop") facing.set(r.i, dir);
    }
    if (!fixed) return fail("no-repair");
  }
  const truth = truthOf(m);

  // Take numbers away while the facings stay unique; put some back for gentler puzzles.
  const removed = [];
  for (const i of rng.shuffle(Object.keys(spec.numbers).map(Number))) {
    const keep = spec.numbers[i];
    delete spec.numbers[i];
    const r2 = solve(buildModel(spec), { limit: 2 });
    if (!r2.aborted && r2.count === 1) removed.push([i, keep]); else spec.numbers[i] = keep;
  }
  for (const [i, v] of rng.shuffle(removed).slice(0, addBack)) spec.numbers[i] = v;

  m = buildModel(spec);
  const trace = H.humanSolve(m);
  if (!trace.solved) return fail("human-stuck");
  if (trace.solution.some((d, k) => d !== truth[k])) return fail("human-mismatch");
  const used = new Set(trace.steps.filter((s) => s.clue != null).map((s) => s.clue));
  const numbered = m.hikers.filter((h) => h.number != null).length;
  const rating = analyse(m, trace, numbered ? +(used.size / numbered).toFixed(2) : null);
  return {
    id: `sasquatch-${rows}x${cols}-s${seed}${addBack ? "-a" + addBack : ""}`,
    variant: "sasquatch", rows, cols, seed, addBack,
    cells: cells.join(""), numbers: { ...spec.numbers },
    solution: { facing: truth.map((d) => "LRUD"[d]), spot }, rating, gates: gates(rating),
  };
}
