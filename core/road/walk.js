// Random bridge routes: a chain of straight spans from the south shore to the north shore.
// Spans are what make the solved line read as a bridge rather than a scribble, so every generator
// builds its hidden solution this way. The route never runs alongside itself (no two
// non-consecutive road cells share a side), which keeps the finished drawing clean.
import { DL, DR, DU, DD } from "./engine.js";

const DR_ = [0, 0, -1, 1], DC_ = [-1, 1, 0, 0];
const PERP = { [DL]: [DU, DD], [DR]: [DU, DD], [DU]: [DL, DR], [DD]: [DL, DR] };

export function walkRoute(R, C, rng, opts = {}) {
  const {
    minSeg = 2, maxSeg = 4, minTurns = 3, maxTurns = 12, downProb = 0.25,
    minCover = 0.25, maxCover = 0.6, minSpread = 0.55, budget = 4000, attempts = 60, noTouch = true,
  } = opts;
  for (let a = 0; a < attempts; a++) {
    const start = rng.range(0, C - 1);
    const res = tryWalk(start);
    if (res) return res;
  }
  return null;

  function tryWalk(start) {
    const inPath = new Uint8Array(R * C);
    const path = [], turns = [];
    let nodes = 0;
    const S = (R - 1) * C + start;
    const free = (r, c, prev) => {
      if (r < 0 || c < 0 || r >= R || c >= C || inPath[r * C + c]) return false;
      if (!noTouch) return true;
      for (let d = 0; d < 4; d++) {
        const rr = r + DR_[d], cc = c + DC_[d];
        if (rr < 0 || cc < 0 || rr >= R || cc >= C) continue;
        const j = rr * C + cc;
        if (inPath[j] && j !== prev) return false;
      }
      return true;
    };
    const push = (i) => { inPath[i] = 1; path.push(i); };
    const pop = () => { inPath[path.pop()] = 0; };
    // Move k cells from the current end in direction d; returns number actually pushed (all or 0).
    const extend = (d, k) => {
      let pushed = 0;
      for (let s = 0; s < k; s++) {
        const cur = path[path.length - 1], r = Math.floor(cur / C) + DR_[d], c = (cur % C) + DC_[d];
        if (!free(r, c, cur)) { for (let t = 0; t < pushed; t++) pop(); return 0; }
        push(r * C + c); pushed++;
      }
      return pushed;
    };
    const acceptable = () => {
      const cover = path.length / (R * C);
      if (cover < minCover || cover > maxCover) return false;
      const cols = new Set(path.map((i) => i % C));
      return cols.size >= Math.ceil(minSpread * C);
    };
    const rec = (dir, nTurns) => {
      if (++nodes > budget) return false;
      const cur = path[path.length - 1], r = Math.floor(cur / C);
      const dirs = rng.shuffle([...PERP[dir]]).filter((d) => d !== DD || rng.chance(downProb));
      for (const nd of dirs) {
        // Finish: turn north and run straight to the top row.
        if (nd === DU && nTurns + 1 >= minTurns && r > 0) {
          const pushed = extend(DU, r);
          if (pushed) {
            if (acceptable()) { turns.push(cur); return true; }
            for (let t = 0; t < pushed; t++) pop();
          }
        }
        if (nTurns + 1 >= maxTurns) continue;
        const lens = rng.shuffle(Array.from({ length: maxSeg - minSeg + 1 }, (_, i) => minSeg + i));
        for (const k of lens) {
          const pushed = extend(nd, k);
          if (!pushed) continue;
          const endRow = Math.floor(path[path.length - 1] / C);
          if (!(nd === DU && endRow === 0)) {
            turns.push(cur);
            if (rec(nd, nTurns + 1)) return true;
            turns.pop();
          }
          for (let t = 0; t < pushed; t++) pop();
        }
      }
      return false;
    };
    push(S);
    const firstLens = rng.shuffle(Array.from({ length: maxSeg - minSeg + 1 }, (_, i) => minSeg + i)).filter((k) => k < R - 1);
    for (const k of firstLens) {
      if (!extend(DU, k)) continue;
      if (rec(DU, 0)) return { start, end: path[path.length - 1], path: path.slice(), turns: turns.slice() };
      for (let t = 0; t < k; t++) pop();
    }
    return null;
  }
}
