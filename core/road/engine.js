// The road engine shared by every Golden Gate variant.
//
// A puzzle is a rows×cols bay. The road enters from the south shore into the bottom-row cell at
// column `start` (the toll plaza) and leaves through the top-row cell at column `end` (Vista Point).
// It runs through cell centres, one unbranching line. Variants differ only in which cells are
// blocked, which cells the road must visit, which cells must be crossed straight, and which
// counting clues apply, so one model, one set of deduction rules and one oracle serve them all.
//
// Edges: h(r,c) joins (r,c)-(r,c+1); v(r,c) joins (r,c)-(r+1,c); two "port" edges connect the start
// cell to the south shore and the end cell to the north shore and are always ON.

export const UNK = 0, ON = 1, OFF = 2;
export const DL = 0, DR = 1, DU = 2, DD = 3;
export const OPP = [1, 0, 3, 2];
export const DIR_NAMES = ["L", "R", "U", "D"];
const DR_ = [0, 0, -1, 1], DC_ = [-1, 1, 0, 0];

export function layout(R, C, start, end) {
  const H = R * (C - 1), V = (R - 1) * C;
  const PS = H + V, PN = H + V + 1, E = H + V + 2, n = R * C;
  const hIdx = (r, c) => r * (C - 1) + c, vIdx = (r, c) => H + r * C + c;
  const cellEdges = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    cellEdges.push([c > 0 ? hIdx(r, c - 1) : -1, c < C - 1 ? hIdx(r, c) : -1, r > 0 ? vIdx(r - 1, c) : -1, r < R - 1 ? vIdx(r, c) : -1]);
  }
  const S = (R - 1) * C + start, T = end;
  cellEdges[S][DD] = PS; cellEdges[T][DU] = PN;
  const ends = new Array(E);
  for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) ends[hIdx(r, c)] = [r * C + c, r * C + c + 1];
  for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) ends[vIdx(r, c)] = [r * C + c, (r + 1) * C + c];
  ends[PS] = [S, -1]; ends[PN] = [T, -1];
  const nb = (i, d) => {
    const r = Math.floor(i / C) + DR_[d], c = (i % C) + DC_[d];
    return r < 0 || c < 0 || r >= R || c >= C ? -1 : r * C + c;
  };
  const edgeBetween = (a, b) => { for (let d = 0; d < 4; d++) if (nb(a, d) === b) return cellEdges[a][d]; return -1; };
  return { R, C, n, H, V, E, PS, PN, S, T, start, end, hIdx, vIdx, cellEdges, ends, nb, edgeBetween };
}

// ------------------------------------------------------------------ puzzle spec → model
// spec.cells is a string, one char per cell: '.' water, 'o' land, '#' rock, 's' ship, 'f' foghorn.
const BLOCKING = new Set(["#", "s", "f"]);
export const isBlockingChar = (ch) => BLOCKING.has(ch);
const DIR_INDEX = { L: DL, R: DR, U: DU, D: DD };

export function laneCells(L, cells, at, dir) {
  const d = typeof dir === "string" ? DIR_INDEX[dir] : dir;
  const out = [];
  for (let j = L.nb(at, d); j >= 0 && !isBlockingChar(cells[j]); j = L.nb(j, d)) out.push(j);
  return out;
}

export function fogCells(L, cells, at) {
  const out = [], r0 = Math.floor(at / L.C), c0 = at % L.C;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const r = r0 + dr, c = c0 + dc;
    if (r < 0 || c < 0 || r >= L.R || c >= L.C) continue;
    if (!isBlockingChar(cells[r * L.C + c])) out.push(r * L.C + c);
  }
  return out;
}

export function landRegion(L, cells, at) {
  const seen = new Set([at]), out = [at];
  for (let q = 0; q < out.length; q++) for (let d = 0; d < 4; d++) {
    const j = L.nb(out[q], d);
    if (j >= 0 && cells[j] === "o" && !seen.has(j)) { seen.add(j); out.push(j); }
  }
  return out;
}

export function buildModel(spec) {
  const { rows: R, cols: C, start, end } = spec;
  const L = layout(R, C, start, end);
  const cells = spec.cells;
  const blocked = new Uint8Array(L.n), must = new Uint8Array(L.n), straight = new Uint8Array(L.n), orient = new Uint8Array(L.n);
  for (let i = 0; i < L.n; i++) {
    if (isBlockingChar(cells[i])) blocked[i] = 1;
    if (spec.rules?.waterStraight && cells[i] === ".") straight[i] = 1;
  }
  must[L.S] = 1; must[L.T] = 1;
  const counts = [], lanes = [];
  for (const [k, s] of Object.entries(spec.ships || {})) {
    const at = +k, lane = laneCells(L, cells, at, s.dir);
    const horizontalLane = s.dir === "L" || s.dir === "R";
    for (const c of lane) { orient[c] |= horizontalLane ? 1 : 2; straight[c] = 1; }
    lanes.push({ at, dir: s.dir, cells: lane });
    // A ship without a number still has a lane (crossings only), just no count.
    if (s.n != null) counts.push({ kind: "ship", at, dir: s.dir, cells: lane, n: s.n });
  }
  for (const [k, n] of Object.entries(spec.lands || {})) {
    const at = +k;
    counts.push({ kind: "land", at, cells: landRegion(L, cells, at), n });
  }
  for (const [k, n] of Object.entries(spec.fogs || {})) {
    const at = +k;
    counts.push({ kind: "fog", at, cells: fogCells(L, cells, at), n });
  }
  const cellCounts = Array.from({ length: L.n }, () => []);
  counts.forEach((k, idx) => k.cells.forEach((c) => cellCounts[c].push(idx)));
  const cellLanes = Array.from({ length: L.n }, () => []);
  lanes.forEach((ln, idx) => ln.cells.forEach((c) => cellLanes[c].push(idx)));
  return { spec, rows: R, cols: C, L, blocked, must, straight, orient, counts, cellCounts, lanes, cellLanes };
}

// ------------------------------------------------------------------ state
export function initState(m) {
  const { L, blocked, orient } = m;
  const e = new Int8Array(L.E), need = new Uint8Array(L.n);
  e[L.PS] = ON; e[L.PN] = ON;
  for (let i = 0; i < L.n; i++) {
    const ce = L.cellEdges[i];
    if (blocked[i]) { for (let d = 0; d < 4; d++) if (ce[d] >= 0) e[ce[d]] = OFF; continue; }
    // A road in a shipping lane may only cross it: orient bit 1 = horizontal lane (road must run
    // vertically), bit 2 = vertical lane (road must run horizontally). Both = unusable.
    if (orient[i] & 1) { if (ce[DL] >= 0) e[ce[DL]] = OFF; if (ce[DR] >= 0) e[ce[DR]] = OFF; }
    if (orient[i] & 2) { if (ce[DU] >= 0 && ce[DU] !== L.PN) e[ce[DU]] = OFF; if (ce[DD] >= 0 && ce[DD] !== L.PS) e[ce[DD]] = OFF; }
  }
  return { e, need };
}
export const cloneState = (st) => ({ e: st.e.slice(), need: st.need.slice() });

export function scan(m, st, i) {
  let on = 0, unk = 0; const ue = [];
  const ce = m.L.cellEdges[i];
  for (let d = 0; d < 4; d++) {
    const ed = ce[d]; if (ed < 0) continue;
    const s = st.e[ed];
    if (s === ON) on++; else if (s === UNK) { unk++; ue.push(ed); }
  }
  return { on, unk, ue };
}
const isUsed = (m, st, i) => st.need[i] || m.must[i] || scan(m, st, i).on > 0;

// Fragments: connected pieces of drawn road (ports excluded). Detects cycles.
export function fragments(m, st) {
  const { L } = m, parent = Int32Array.from({ length: L.n }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  let cycle = false;
  for (let ed = 0; ed < L.PS; ed++) {
    if (st.e[ed] !== ON) continue;
    const [a, b] = L.ends[ed], ra = find(a), rb = find(b);
    if (ra === rb) cycle = true; else parent[ra] = rb;
  }
  const comp = new Int32Array(L.n);
  for (let i = 0; i < L.n; i++) comp[i] = find(i);
  return { comp, cycle, sComp: comp[L.S], tComp: comp[L.T] };
}

// ------------------------------------------------------------------ deduction rules
// Each rule returns deductions {rule, tier, set:[[edge,val]], need:[cells], focus:[cells], clue?}
// or {contra:true, rule, focus}. The human solver applies them one at a time, cheapest tier first;
// the oracle applies them in bulk and branches when they run out.

function ruleDegree(m, st, out) {
  const { L, blocked } = m;
  for (let i = 0; i < L.n; i++) {
    if (blocked[i]) continue;
    const { on, unk, ue } = scan(m, st, i);
    const must = m.must[i] || st.need[i];
    if (on > 2) { out.push({ contra: true, rule: "degree", focus: [i] }); return; }
    if (on === 2) { if (unk) out.push({ rule: "full", tier: 1, set: ue.map((e) => [e, OFF]), focus: [i] }); continue; }
    if (on === 1) {
      if (unk === 0) { out.push({ contra: true, rule: "degree", focus: [i] }); return; }
      if (unk === 1) out.push({ rule: "continue", tier: 1, set: [[ue[0], ON]], focus: [i] });
      continue;
    }
    if (must) {
      if (unk < 2) { out.push({ contra: true, rule: "degree", focus: [i] }); return; }
      if (unk === 2) out.push({ rule: "visit", tier: 1, set: ue.map((e) => [e, ON]), focus: [i] });
    } else if (unk === 1) out.push({ rule: "deadend", tier: 1, set: [[ue[0], OFF]], focus: [i] });
  }
}

// Straight cells (open water in Spans, lane cells in Shipping Lanes): the road can't turn there, so
// the two edges of each axis agree. One deduction follows the whole straight line.
function ruleStraight(m, st, out) {
  const { L, straight, blocked } = m, seen = new Set();
  const val = (ed) => (ed < 0 ? OFF : st.e[ed]);
  for (let i = 0; i < L.n; i++) {
    if (!straight[i] || blocked[i]) continue;
    for (const [a, b] of [[DL, DR], [DU, DD]]) {
      const ea = L.cellEdges[i][a], eb = L.cellEdges[i][b], sa = val(ea), sb = val(eb);
      if (sa !== UNK && sb !== UNK) { if (sa !== sb) { out.push({ contra: true, rule: "straight", focus: [i] }); return; } continue; }
      if (sa === UNK && sb === UNK) continue;
      const [d, v] = sa !== UNK ? [b, sa] : [a, sb];
      const set = [], focus = [i];
      let cur = i, bad = false;
      for (;;) {
        const ed = L.cellEdges[cur][d];
        if (ed < 0) { if (v === ON) bad = true; break; }
        if (st.e[ed] === UNK) set.push([ed, v]); else { if (st.e[ed] !== v) bad = true; break; }
        const nx = L.nb(cur, d);
        if (nx < 0 || !straight[nx] || blocked[nx]) break;
        cur = nx; focus.push(cur);
      }
      if (bad) { out.push({ contra: true, rule: "straight", focus: [i] }); return; }
      const key = set.map((s) => s[0]).sort((x, y) => x - y).join(",");
      if (set.length && !seen.has(key)) { seen.add(key); out.push({ rule: v === ON ? "span" : "nospan", tier: 1, set, focus }); }
    }
  }
}

function countStatus(m, st, k) {
  let used = 0; const open = [];
  for (const c of k.cells) {
    const { on, unk } = scan(m, st, c);
    if (on > 0 || st.need[c] || m.must[c]) used++;
    else if (unk >= 2) open.push(c);
  }
  return { used, open };
}

function ruleCount(m, st, out) {
  m.counts.forEach((k, idx) => {
    const { used, open } = countStatus(m, st, k);
    if (used > k.n || used + open.length < k.n) { out.push({ contra: true, rule: "count", focus: [k.at] }); return; }
    if (!open.length) return;
    if (used === k.n) {
      const set = [];
      for (const c of open) for (const ed of scan(m, st, c).ue) set.push([ed, OFF]);
      out.push({ rule: "count-done", tier: 1, set, focus: [k.at, ...open], clue: idx });
    } else if (used + open.length === k.n) {
      out.push({ rule: "count-all", tier: 1, set: [], need: open, focus: [k.at, ...open], clue: idx });
    }
  });
}

function ruleComplete(m, st, out) {
  const f = fragments(m, st);
  if (f.cycle) { out.push({ contra: true, rule: "loop", focus: [] }); return; }
  if (f.sComp !== f.tComp) return;
  const set = [];
  for (let ed = 0; ed < m.L.PS; ed++) if (st.e[ed] === UNK) set.push([ed, OFF]);
  if (set.length) out.push({ rule: "finished", tier: 1, set, focus: [] });
}

function ruleNoLoop(m, st, out) {
  const { L } = m, f = fragments(m, st);
  if (f.cycle) { out.push({ contra: true, rule: "loop", focus: [] }); return; }
  for (let ed = 0; ed < L.PS; ed++) {
    if (st.e[ed] !== UNK) continue;
    const [a, b] = L.ends[ed];
    if (f.comp[a] !== f.comp[b]) continue;
    if (scan(m, st, a).on !== 1 || scan(m, st, b).on !== 1) continue;
    // Joining S's piece to T's piece is a completion, not a loop (handled by "early").
    out.push({ rule: "loop", tier: 2, set: [[ed, OFF]], focus: [a, b] });
  }
}

// Joining the start piece to the end piece finishes the road; forbid it if anything is left undone.
function ruleEarly(m, st, out) {
  const { L } = m, f = fragments(m, st);
  if (f.cycle || f.sComp === f.tComp) return;
  for (let ed = 0; ed < L.PS; ed++) {
    if (st.e[ed] !== UNK) continue;
    const [a, b] = L.ends[ed];
    const ca = f.comp[a], cb = f.comp[b];
    if (!((ca === f.sComp && cb === f.tComp) || (ca === f.tComp && cb === f.sComp))) continue;
    if (scan(m, st, a).on !== 1 || scan(m, st, b).on !== 1) continue;
    const inPath = (c) => f.comp[c] === f.sComp || f.comp[c] === f.tComp;
    let bad = false;
    for (let i = 0; i < L.n && !bad; i++) {
      if (inPath(i)) continue;
      if (m.must[i] || st.need[i] || scan(m, st, i).on > 0) bad = true;
    }
    for (const k of m.counts) {
      if (bad) break;
      let used = 0; for (const c of k.cells) if (inPath(c) && (scan(m, st, c).on > 0 || c === a || c === b)) used++;
      if (used !== k.n) bad = true;
    }
    if (bad) out.push({ rule: "early", tier: 3, set: [[ed, OFF]], focus: [a, b] });
  }
}

// Reachability, dead-end pockets and bottlenecks, from articulation points of the graph of cells
// joined by not-yet-excluded edges. A pocket hanging off one cell (or one edge) can't be entered and
// left again, so the road never goes in; a cell or edge every shore-to-shore route needs is road.
function ruleConnect(m, st, out) {
  const { L, blocked } = m;
  const alive = new Uint8Array(L.n);
  for (let i = 0; i < L.n; i++) {
    if (blocked[i]) continue;
    const { on, unk } = scan(m, st, i);
    if (on > 0 || unk > 0) alive[i] = 1;
  }
  const adj = (i) => {
    const res = [];
    for (let d = 0; d < 4; d++) {
      const ed = L.cellEdges[i][d]; if (ed < 0 || ed >= L.PS || st.e[ed] === OFF) continue;
      const j = L.nb(i, d); if (j >= 0 && alive[j]) res.push([j, ed]);
    }
    return res;
  };
  // Iterative DFS from S computing discovery times, low-links and subtree ranges.
  const disc = new Int32Array(L.n).fill(-1), low = new Int32Array(L.n), last = new Int32Array(L.n), par = new Int32Array(L.n).fill(-1), parEdge = new Int32Array(L.n).fill(-1);
  const order = [];
  let time = 0;
  const stack = [[L.S, adj(L.S), 0]];
  disc[L.S] = low[L.S] = time++; order.push(L.S);
  while (stack.length) {
    const top = stack[stack.length - 1], [u, nbrs] = top;
    if (top[2] < nbrs.length) {
      const [v, ed] = nbrs[top[2]++];
      if (disc[v] < 0) {
        disc[v] = low[v] = time++; par[v] = u; parEdge[v] = ed; order.push(v);
        stack.push([v, adj(v), 0]);
      } else if (ed !== parEdge[u]) low[u] = Math.min(low[u], disc[v]);
    } else {
      stack.pop();
      last[u] = time - 1;
      if (par[u] >= 0) low[par[u]] = Math.min(low[par[u]], low[u]);
    }
  }
  const usedOrMust = (i) => m.must[i] || st.need[i] || scan(m, st, i).on > 0;
  // Unreachable cells.
  if (disc[L.T] < 0) { out.push({ contra: true, rule: "reach", focus: [L.T] }); return; }
  const unreached = [];
  for (let i = 0; i < L.n; i++) if (alive[i] && disc[i] < 0) {
    if (usedOrMust(i)) { out.push({ contra: true, rule: "reach", focus: [i] }); return; }
    unreached.push(i);
  }
  if (unreached.length) {
    const set = [];
    for (const i of unreached) for (const ed of scan(m, st, i).ue) set.push([ed, OFF]);
    const uniq = [...new Map(set.map((s) => [s[0], s])).values()];
    if (uniq.length) out.push({ rule: "reach", tier: 3, set: uniq, focus: unreached });
  }
  // Pockets and bottlenecks.
  const tIn = (v) => disc[v] <= disc[L.T] && disc[L.T] <= last[v];
  for (const v of order) {
    const u = par[v]; if (u < 0) continue;
    if (low[v] < disc[u]) continue; // subtree(v) has another way out
    if (tIn(v)) {
      if (u !== L.S && !usedOrMust(u)) out.push({ rule: "bottleneck", tier: 3, set: [], need: [u], focus: [u] });
      if (low[v] > disc[u] && st.e[parEdge[v]] === UNK) out.push({ rule: "bottleneck", tier: 3, set: [[parEdge[v], ON]], focus: [u, v] });
    } else {
      const pocket = [];
      for (const w of order) if (disc[w] >= disc[v] && disc[w] <= last[v]) pocket.push(w);
      if (pocket.some(usedOrMust)) { out.push({ contra: true, rule: "pocket", focus: pocket }); return; }
      const set = new Map();
      for (const w of pocket) for (const ed of scan(m, st, w).ue) set.set(ed, [ed, OFF]);
      if (set.size) out.push({ rule: "pocket", tier: 3, set: [...set.values()], focus: pocket });
    }
  }
}

// Two overlapping counting clues (minesweeper-style subset reasoning).
function ruleOverlap(m, st, out) {
  const stats = m.counts.map((k) => countStatus(m, st, k));
  for (let a = 0; a < m.counts.length; a++) {
    const A = stats[a]; if (!A.open.length) continue;
    const remA = m.counts[a].n - A.used;
    for (let b = 0; b < m.counts.length; b++) {
      if (a === b) continue;
      const B = stats[b]; if (B.open.length <= A.open.length) continue;
      const setB = new Set(B.open);
      if (!A.open.every((c) => setB.has(c))) continue;
      const setA = new Set(A.open), diff = B.open.filter((c) => !setA.has(c));
      const remB = m.counts[b].n - B.used, extra = remB - remA;
      if (extra < 0 || extra > diff.length) { out.push({ contra: true, rule: "overlap", focus: [m.counts[a].at, m.counts[b].at] }); return; }
      const focus = [m.counts[a].at, m.counts[b].at, ...diff];
      if (extra === 0) {
        const set = [];
        for (const c of diff) for (const ed of scan(m, st, c).ue) set.push([ed, OFF]);
        out.push({ rule: "overlap", tier: 4, set, focus, clue: b });
      } else if (extra === diff.length) out.push({ rule: "overlap", tier: 4, set: [], need: diff, focus, clue: b });
    }
  }
}

export const RULES = [
  { id: "degree", tier: 1, find: ruleDegree },
  { id: "straight", tier: 1, find: ruleStraight },
  { id: "count", tier: 1, find: ruleCount },
  { id: "complete", tier: 1, find: ruleComplete },
  { id: "loop", tier: 2, find: ruleNoLoop },
  { id: "early", tier: 3, find: ruleEarly },
  { id: "connect", tier: 3, find: ruleConnect },
  { id: "overlap", tier: 4, find: ruleOverlap },
];

export function applyDeduction(st, d) {
  for (const [ed, v] of d.set) {
    if (st.e[ed] === UNK) st.e[ed] = v;
    else if (st.e[ed] !== v) return false;
  }
  for (const c of d.need || []) st.need[c] = 1;
  return true;
}

export const changes = (st, d) => d.set.some(([ed]) => st.e[ed] === UNK) || (d.need || []).some((c) => !st.need[c]);

/** Apply rules up to maxTier until nothing changes. Returns "ok", "contra", or "capped". */
export function propagate(m, st, maxTier = 3, maxSteps = Infinity, stats = null) {
  let steps = 0;
  if (stats) stats.steps = 0;
  for (;;) {
    let progressed = false;
    for (const rule of RULES) {
      if (rule.tier > maxTier) continue;
      const ds = [];
      rule.find(m, st, ds);
      if (ds.some((d) => d.contra)) return "contra";
      const useful = ds.filter((d) => changes(st, d));
      if (!useful.length) continue;
      if (stats) stats.steps = steps + 1;
      for (const d of useful) if (!applyDeduction(st, d)) return "contra";
      progressed = true;
      if (++steps >= maxSteps) return "capped";
      break;
    }
    if (!progressed) return "ok";
  }
}

// ------------------------------------------------------------------ verification and search
/** Does this set of ON edges (UNK treated as OFF) solve the puzzle? */
export function checkSolution(m, e) {
  const { L } = m;
  const deg = new Uint8Array(L.n);
  for (let ed = 0; ed < L.E; ed++) if (e[ed] === ON) for (const c of L.ends[ed]) if (c >= 0) deg[c]++;
  for (let i = 0; i < L.n; i++) {
    if (m.blocked[i] && deg[i]) return false;
    if (deg[i] !== 0 && deg[i] !== 2) return false;
    if (m.must[i] && deg[i] !== 2) return false;
    const ce = L.cellEdges[i], on = (d) => ce[d] >= 0 && e[ce[d]] === ON;
    if (m.straight[i] && (on(DL) !== on(DR) || on(DU) !== on(DD))) return false;
    if ((m.orient[i] & 1) && (on(DL) || on(DR))) return false;
    if ((m.orient[i] & 2) && (on(DU) || on(DD))) return false;
  }
  const f = fragments(m, { e, need: new Uint8Array(L.n) });
  if (f.cycle || f.sComp !== f.tComp) return false;
  for (let i = 0; i < L.n; i++) if (deg[i] && f.comp[i] !== f.sComp) return false;
  for (const k of m.counts) {
    let used = 0; for (const c of k.cells) if (deg[c]) used++;
    if (used !== k.n) return false;
  }
  return true;
}

function pickEdge(m, st) {
  const { L } = m;
  let best = -1, bestScore = Infinity;
  for (let i = 0; i < L.n; i++) {
    if (m.blocked[i]) continue;
    const { on, unk, ue } = scan(m, st, i);
    if (!unk) continue;
    const score = on === 1 ? unk : (m.must[i] || st.need[i]) ? 10 + unk : Infinity;
    if (score < bestScore) { bestScore = score; best = ue[0]; }
  }
  if (best >= 0) return best;
  for (let ed = 0; ed < L.PS; ed++) if (st.e[ed] === UNK) return ed;
  return -1;
}

/** Count solutions up to `limit` by propagation + branching. */
export function solve(m, { limit = 2, budget = 40000, from = null } = {}) {
  const sols = [];
  let nodes = 0, aborted = false;
  const rec = (st) => {
    if (sols.length >= limit || aborted) return;
    if (++nodes > budget) { aborted = true; return; }
    if (propagate(m, st, 3) === "contra") return;
    const ed = pickEdge(m, st);
    if (ed < 0) { if (checkSolution(m, st.e)) sols.push(Array.from(st.e, (s) => (s === ON ? 1 : 0))); return; }
    for (const v of [ON, OFF]) { const s2 = cloneState(st); s2.e[ed] = v; rec(s2); }
  };
  rec(from ? cloneState(from) : initState(m));
  return { count: sols.length, solutions: sols, aborted, nodes };
}

/** Edge array (1 = road) from an ordered list of path cells, including both ports. */
export function edgesFromPath(L, path) {
  const e = new Uint8Array(L.E);
  e[L.PS] = 1; e[L.PN] = 1;
  for (let k = 1; k < path.length; k++) e[L.edgeBetween(path[k - 1], path[k])] = 1;
  return e;
}
export const cellsUsed = (L, e) => {
  const used = new Uint8Array(L.n);
  for (let ed = 0; ed < L.E; ed++) if (e[ed]) for (const c of L.ends[ed]) if (c >= 0) used[c] = 1;
  return used;
};
