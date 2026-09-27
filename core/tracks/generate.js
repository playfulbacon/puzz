// Cable Cars generator: lay the lines (straight runs, crossings only straight over another line),
// raise terraced hills that are level around every turn, then break rival routes by nudging the
// terrain (a turn the rival needs is no longer level) or placing a house on the rival's street.
// Houses that aren't needed are removed; the human solver rates the result.
import { Rng } from "../lib/rng.js";
import { makeHuman, analyse, gates, weightedPick } from "../lib/human.js";
import { buildModel, solve, checkSolution, tracksEngine, layout, OPP } from "./engine.js";

const DR = [0, 0, -1, 1], DC = [-1, 1, 0, 0];
const PERP = [[2, 3], [2, 3], [0, 1], [0, 1]];
const H = makeHuman(tracksEngine);
export const failures = {};
const fail = (why) => { failures[why] = (failures[why] || 0) + 1; return null; };
const LABELS = "ABCD";

export function generate({ rows = 8, cols = 8, seed = 1, lines = null, addBack = 0, minSeg = 2, maxSeg = 4, carWeight = 0.8 } = {}) {
  const rng = new Rng(seed * 7727 + rows * 71 + cols);
  const n = rows * cols;
  const L = layout(rows, cols);
  const nb = L.nb;
  const k = lines ?? (n >= 81 ? 3 : 2);
  const owner = new Int8Array(n).fill(-1);      // line using the square (-1 none)
  const axis = new Int8Array(n).fill(-1);       // 0 horizontal straight, 1 vertical straight, 2 turn/end
  const crossing = new Uint8Array(n);
  const routes = [];

  for (let li = 0; li < k; li++) {
    const route = walk(li);
    if (!route) return fail("route");
    routes.push(route);
  }

  function walk(li) {
    const minTurns = 2, maxTurns = 5, minLen = Math.round(Math.max(rows, cols) * 1.1);
    for (let attempt = 0; attempt < 80; attempt++) {
      const start = rng.int(n);
      if (owner[start] >= 0 || !freeEnd(start)) continue;
      const path = [start], mine = new Set([start]);
      let nodes = 0;
      const canStep = (prev, j, d, straightThrough) => {
        if (j < 0 || mine.has(j)) return false;
        for (let dd = 0; dd < 4; dd++) { const x = nb(j, dd); if (x >= 0 && x !== prev && mine.has(x)) return false; }
        const crossable = (x) => !crossing[x] && axis[x] === (d < 2 ? 1 : 0);
        // Different lines never run side by side (so dots on the board always join the right way):
        // another line may only touch this square where we are crossing it.
        for (let dd = 0; dd < 4; dd++) {
          const x = nb(j, dd);
          if (x < 0 || owner[x] < 0 || mine.has(x)) continue;
          if (x === prev) continue;                                            // the crossing we just made
          if (owner[j] >= 0 && owner[x] === owner[j]) continue;                // we're on the crossing square itself
          if (straightThrough && x === nb(j, d) && crossable(x)) continue;     // the crossing straight ahead
          return false;
        }
        if (owner[j] < 0) return true;
        // Crossing another line: it must run straight across our direction, and we must go straight too.
        return straightThrough && crossable(j);
      };
      const rec = (dir, turns) => {
        if (++nodes > 3000) return false;
        const cur = path[path.length - 1];
        if (turns >= minTurns && path.length >= minLen && owner[cur] < 0 && freeEnd(cur)) return true;
        if (turns >= maxTurns) return false;
        const dirs = dir < 0 ? rng.shuffle([0, 1, 2, 3]) : rng.shuffle([...PERP[dir]]);
        for (const nd of dirs) {
          const lens = rng.shuffle(Array.from({ length: maxSeg - minSeg + 1 }, (_, i) => minSeg + i));
          for (const len of lens) {
            let pushed = 0, ok = true;
            for (let s = 0; s < len; s++) {
              const p = path[path.length - 1], j = nb(p, nd);
              const through = s < len - 1; // the segment's last square is a turn or an end
              if (!canStep(p, j, nd, through)) { ok = false; break; }
              path.push(j); mine.add(j); pushed++;
            }
            if (ok && rec(nd, dir < 0 ? turns : turns + 1)) return true;
            for (let t = 0; t < pushed; t++) mine.delete(path.pop());
          }
        }
        return false;
      };
      if (!rec(-1, 0)) continue;
      // Commit: mark squares, crossings, and each square's straight axis.
      for (let t = 0; t < path.length; t++) {
        const i = path[t];
        if (owner[i] >= 0) { crossing[i] = 1; continue; }
        owner[i] = li;
        if (t === 0 || t === path.length - 1) { axis[i] = 2; continue; }
        const a = path[t - 1], b = path[t + 1];
        const hor = Math.floor(a / cols) === Math.floor(b / cols), ver = a % cols === b % cols;
        axis[i] = hor ? 0 : ver ? 1 : 2;
      }
      return path;
    }
    return null;
  }
  function freeEnd(i) { // turntables keep a little room around them
    for (let d = 0; d < 4; d++) { const j = nb(i, d); if (j >= 0 && owner[j] >= 0) return false; }
    return true;
  }

  // Truth edges and the level-ground groups every turn needs.
  const truth = new Uint8Array(L.E);
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const constrained = new Uint8Array(n);
  routes.forEach((path) => {
    for (let t = 0; t + 1 < path.length; t++) truth[L.edgeBetween(path[t], path[t + 1])] = 1;
    for (let t = 1; t + 1 < path.length; t++) {
      const a = path[t - 1], x = path[t], b = path[t + 1];
      const straight = Math.floor(a / cols) === Math.floor(b / cols) || a % cols === b % cols;
      if (straight) continue;
      parent[find(a)] = find(x); parent[find(b)] = find(x);
      constrained[a] = constrained[x] = constrained[b] = 1;
    }
  });

  // Terraced hills: a few smooth bumps, quantised to 0–3, then each level group set to one height.
  const hills = Array.from({ length: rng.range(2, 3) }, () => ({ r: rng.next() * rows, c: rng.next() * cols, h: 2.2 + rng.next() * 2, s: 2.2 + rng.next() * 2.2 }));
  const field = Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    return hills.reduce((a, hl) => a + hl.h * Math.exp(-((r - hl.r) ** 2 + (c - hl.c) ** 2) / (2 * hl.s * hl.s)), 0);
  });
  // Stretch the field so the city runs from the waterfront (0) to the hilltops (3).
  const lo = Math.min(...field), hi = Math.max(...field);
  const heights = field.map((f) => Math.max(0, Math.min(3, Math.floor(((f - lo) / (hi - lo || 1)) * 3.999))));
  const groups = new Map();
  for (let i = 0; i < n; i++) if (constrained[i]) { const g = find(i); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); }
  for (const cellsInGroup of groups.values()) {
    const avg = Math.round(cellsInGroup.reduce((a, i) => a + heights[i], 0) / cellsInGroup.length);
    for (const i of cellsInGroup) heights[i] = avg;
  }

  const cells = Array(n).fill(".");
  routes.forEach((path, li) => { cells[path[0]] = LABELS[li]; cells[path[path.length - 1]] = LABELS[li]; });
  const cars = {};
  const spec = { rows, cols, cells, heights, cars };
  const specOut = () => ({ rows, cols, cells: cells.join(""), heights: heights.join(""), cars: { ...cars } });
  // Squares where the true line runs straight (not crossings, not ends): where a cable car may sit.
  const carSpots = [];
  routes.forEach((path) => { for (let t = 1; t + 1 < path.length; t++) { const i = path[t]; if (!crossing[i] && axis[i] < 2) carSpots.push(i); } });
  if (!checkSolution(buildModel(specOut()), truth)) return fail("seed-invalid");
  const used = new Uint8Array(n);
  for (let ed = 0; ed < L.E; ed++) if (truth[ed]) for (const c of L.ends[ed]) used[c] = 1;

  // Break rival routes.
  for (let iter = 0; ; iter++) {
    if (iter > 60) return fail("fix-iterations");
    const res = solve(buildModel(specOut()), { limit: 2 });
    if (res.aborted) return fail("oracle-budget");
    if (res.count === 0) return fail("no-solution");
    if (res.count === 1) break;
    const alt = res.solutions.find((s) => s.some((x, i) => x !== truth[i]));
    const altUsed = new Uint8Array(n);
    for (let ed = 0; ed < L.E; ed++) if (alt[ed]) for (const c of L.ends[ed]) altUsed[c] = 1;
    const cands = [];
    for (let x = 0; x < n; x++) {
      if (!altUsed[x]) continue;
      const on = [0, 1, 2, 3].filter((d) => L.cellEdges[x][d] >= 0 && alt[L.cellEdges[x][d]]);
      if (on.length === 2 && OPP[on[0]] !== on[1]) {
        const tOn = [0, 1, 2, 3].filter((d) => L.cellEdges[x][d] >= 0 && truth[L.cellEdges[x][d]]);
        if (!(tOn.length === 2 && tOn[0] === on[0] && tOn[1] === on[1])) {
          // A turn only the rival makes: tilt one of its three squares that the true lines don't need level.
          for (const y of [nb(x, on[0]), x, nb(x, on[1])]) {
            if (constrained[y]) continue;
            for (const dh of [-1, 1]) if (heights[y] + dh >= 0 && heights[y] + dh <= 3) cands.push({ kind: "tilt", i: y, dh, w: 2 });
          }
        }
      }
      if (!used[x] && cells[x] === ".") cands.push({ kind: "#", i: x, w: 1 });
    }
    // A cable car on the true line where the rival doesn't run straight the same way.
    for (const i of carSpots) {
      if (cars[i]) continue;
      const dir = axis[i] === 0 ? "H" : "V";
      const e1 = L.cellEdges[i][dir === "H" ? 0 : 2], e2 = L.cellEdges[i][dir === "H" ? 1 : 3];
      const altOn = [0, 1, 2, 3].filter((d) => L.cellEdges[i][d] >= 0 && alt[L.cellEdges[i][d]]).length;
      if (!(alt[e1] && alt[e2] && altOn === 2)) cands.push({ kind: "car", i, dir, w: carWeight });
    }
    if (!cands.length) return fail("no-candidates");
    const c = weightedPick(rng, cands);
    if (c.kind === "tilt") heights[c.i] += c.dh;
    else if (c.kind === "car") cars[c.i] = c.dir;
    else cells[c.i] = "#";
    if (!checkSolution(buildModel(specOut()), truth)) return fail("fix-broke-truth");
  }

  // Remove houses and cars that aren't needed; gentler puzzles get extra cars on the true line.
  const removable = [
    ...cells.map((ch, j) => (ch === "#" ? { kind: "#", i: j } : null)).filter(Boolean),
    ...Object.keys(cars).map((j) => ({ kind: "car", i: +j, dir: cars[j] })),
  ];
  for (const x of rng.shuffle(removable)) {
    if (x.kind === "#") cells[x.i] = "."; else delete cars[x.i];
    if (solve(buildModel(specOut()), { limit: 2 }).count !== 1) { if (x.kind === "#") cells[x.i] = "#"; else cars[x.i] = x.dir; }
  }
  for (const i of rng.shuffle(carSpots.filter((j) => !cars[j])).slice(0, addBack)) cars[i] = axis[i] === 0 ? "H" : "V";
  const m = buildModel(specOut());
  const trace = H.humanSolve(m);
  if (!trace.solved) return fail("human-stuck");
  if (trace.solution.some((x, i) => x !== truth[i])) return fail("human-mismatch");
  const rating = analyse(m, trace, null);
  const onEdges = []; truth.forEach((x, i) => { if (x) onEdges.push(i); });
  return {
    id: `cablecar-${rows}x${cols}-s${seed}${addBack ? "-a" + addBack : ""}`,
    variant: "cablecar", rows, cols, seed, addBack, ...specOut(),
    solution: onEdges, rating, gates: gates(rating),
  };
}
