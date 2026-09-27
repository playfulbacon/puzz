// Cable Cars: connect each pair of matching turntables with a cable car line. Lines run through
// square centres and never branch; two different lines may cross straight over each other. San
// Francisco's streets run straight up the hills, so a line only turns on level ground: the squares
// before, at and after a turn are all the same height.
//
// spec: { rows, cols, cells: string ('.' street, '#' house, 'A'..'D' turntables), heights: string of digits,
//         cars: { [cell]: "H" | "V" } }  A cable car shows a straight piece of line running that way.
// State: one value per edge between neighbouring squares, UNK / ON / OFF.

export const UNK = 0, ON = 1, OFF = 2;
export const DL = 0, DR = 1, DU = 2, DD = 3;
export const OPP = [1, 0, 3, 2];
const DR_ = [0, 0, -1, 1], DC_ = [-1, 1, 0, 0];

export function layout(R, C) {
  const H = R * (C - 1), V = (R - 1) * C, E = H + V, n = R * C;
  const hIdx = (r, c) => r * (C - 1) + c, vIdx = (r, c) => H + r * C + c;
  const cellEdges = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    cellEdges.push([c > 0 ? hIdx(r, c - 1) : -1, c < C - 1 ? hIdx(r, c) : -1, r > 0 ? vIdx(r - 1, c) : -1, r < R - 1 ? vIdx(r, c) : -1]);
  }
  const ends = new Array(E);
  for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) ends[hIdx(r, c)] = [r * C + c, r * C + c + 1];
  for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) ends[vIdx(r, c)] = [r * C + c, (r + 1) * C + c];
  const nb = (i, d) => { const r = Math.floor(i / C) + DR_[d], c = (i % C) + DC_[d]; return r < 0 || c < 0 || r >= R || c >= C ? -1 : r * C + c; };
  const edgeBetween = (a, b) => { for (let d = 0; d < 4; d++) if (nb(a, d) === b) return cellEdges[a][d]; return -1; };
  return { R, C, n, H, V, E, hIdx, vIdx, cellEdges, ends, nb, edgeBetween };
}

const TURNS = [[DL, DU], [DL, DD], [DR, DU], [DR, DD]];
const bits = (dirs) => dirs.reduce((a, d) => a | (1 << d), 0);
export const levelTurn = (L, h, i, d1, d2) => {
  const a = L.nb(i, d1), b = L.nb(i, d2);
  return a >= 0 && b >= 0 && h[a] === h[i] && h[b] === h[i];
};

export function buildModel(spec) {
  const { rows: R, cols: C, cells } = spec;
  const L = layout(R, C);
  const h = Array.from(spec.heights, Number);
  const blocked = new Uint8Array(L.n), endpoint = new Int8Array(L.n).fill(-1);
  const labels = [];
  for (let i = 0; i < L.n; i++) {
    if (cells[i] === "#") blocked[i] = 1;
    else if (/[A-Z]/.test(cells[i])) {
      let k = labels.indexOf(cells[i]);
      if (k < 0) { k = labels.length; labels.push(cells[i]); }
      endpoint[i] = k;
    }
  }
  const pairs = labels.map((_, k) => []);
  for (let i = 0; i < L.n; i++) if (endpoint[i] >= 0) pairs[endpoint[i]].push(i);
  // Legal configurations of each square, as bitmasks over [L, R, U, D]. `relaxed` ignores the hills.
  const has = (i, d) => L.cellEdges[i][d] >= 0 && !blocked[L.nb(i, d)];
  const configs = [], relaxed = [];
  for (let i = 0; i < L.n; i++) {
    const cf = [], rx = [];
    if (blocked[i]) { cf.push(0); rx.push(0); }
    else if (endpoint[i] >= 0) { for (let d = 0; d < 4; d++) if (has(i, d)) { cf.push(1 << d); rx.push(1 << d); } }
    else {
      cf.push(0); rx.push(0);
      if (has(i, DL) && has(i, DR)) { cf.push(bits([DL, DR])); rx.push(bits([DL, DR])); }
      if (has(i, DU) && has(i, DD)) { cf.push(bits([DU, DD])); rx.push(bits([DU, DD])); }
      for (const [a, b] of TURNS) if (has(i, a) && has(i, b)) {
        rx.push(bits([a, b]));
        if (levelTurn(L, h, i, a, b)) cf.push(bits([a, b]));
      }
      if ([0, 1, 2, 3].every((d) => has(i, d))) { cf.push(15); rx.push(15); }
    }
    const car = spec.cars?.[i];
    if (car) { const only = car === "H" ? bits([DL, DR]) : bits([DU, DD]); configs.push([only]); relaxed.push([only]); continue; }
    configs.push(cf); relaxed.push(rx);
  }
  return { spec, rows: R, cols: C, L, h, blocked, endpoint, labels, pairs, configs, relaxed };
}

export function initState(m) {
  const e = new Int8Array(m.L.E);
  for (let i = 0; i < m.L.n; i++) for (let d = 0; d < 4; d++) {
    const ed = m.L.cellEdges[i][d];
    if (ed >= 0 && (m.blocked[i] || !m.configs[i].some((c) => c & (1 << d)))) e[ed] = OFF;
  }
  return { e };
}
export const cloneState = (st) => ({ e: st.e.slice() });
export function applyDeduction(st, d) {
  for (const [ed, v] of d.set) {
    if (st.e[ed] === UNK) st.e[ed] = v;
    else if (st.e[ed] !== v) return false;
  }
  return true;
}
export const changes = (st, d) => d.set.some(([ed]) => st.e[ed] === UNK);

const consistent = (m, st, i, cfg) => {
  for (let d = 0; d < 4; d++) {
    const ed = m.L.cellEdges[i][d];
    const want = (cfg >> d) & 1;
    if (ed < 0) { if (want) return false; continue; }
    const s = st.e[ed];
    if (want && s === OFF) return false;
    if (!want && s === ON) return false;
  }
  return true;
};

// ------------------------------------------------------------------ rules
// Each square's possible configurations, filtered by what's known, fix edges they all agree on.
function ruleCell(m, st, out) {
  const { L } = m;
  for (let i = 0; i < L.n; i++) {
    if (m.blocked[i]) continue;
    const ok = m.configs[i].filter((c) => consistent(m, st, i, c));
    if (!ok.length) { out.push({ contra: true, rule: "cell", focus: [i] }); return; }
    const okRelaxed = m.relaxed[i].filter((c) => consistent(m, st, i, c));
    const set = [];
    let steep = false, anyOn = false;
    for (let d = 0; d < 4; d++) {
      const ed = L.cellEdges[i][d];
      if (ed < 0 || st.e[ed] !== UNK) continue;
      const all = ok.every((c) => c & (1 << d)), none = ok.every((c) => !(c & (1 << d)));
      if (!all && !none) continue;
      set.push([ed, all ? ON : OFF]);
      if (all) anyOn = true;
      const rAll = okRelaxed.every((c) => c & (1 << d)), rNone = okRelaxed.every((c) => !(c & (1 << d)));
      if (!(all ? rAll : rNone)) steep = true;
    }
    if (!set.length) continue;
    const rule = m.spec.cars?.[i] ? "car" : steep ? "steep" : ok.length === 1 && ok[0] === 15 ? "crossing" : m.endpoint[i] >= 0 ? "turntable" : anyOn ? "continue" : "deadend";
    out.push({ rule, tier: 1, set, focus: [i] });
  }
}

// Line pieces: union-find over ON edges, joined through squares whose pairing is certain.
export function pieces(m, st) {
  const { L } = m, N = L.E + L.n;
  const parent = Int32Array.from({ length: N }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; return a !== b; };
  let cycle = false;
  const on = (i, d) => { const ed = L.cellEdges[i][d]; return ed >= 0 && st.e[ed] === ON; };
  const canCross = (i) => m.configs[i].includes(15) && consistent(m, st, i, 15);
  for (let i = 0; i < L.n; i++) {
    if (m.blocked[i]) continue;
    if (m.endpoint[i] >= 0) { for (let d = 0; d < 4; d++) if (on(i, d)) union(L.E + i, L.cellEdges[i][d]); continue; }
    const dirs = [0, 1, 2, 3].filter((d) => on(i, d));
    if (dirs.length >= 3) { for (const [a, b] of [[DL, DR], [DU, DD]]) if (on(i, a) && on(i, b)) if (!union(L.cellEdges[i][a], L.cellEdges[i][b])) cycle = true; continue; }
    if (dirs.length === 2) {
      const [a, b] = dirs;
      if (OPP[a] === b || !canCross(i)) if (!union(L.cellEdges[i][a], L.cellEdges[i][b])) cycle = true;
    }
  }
  const labelOf = new Map();
  for (let i = 0; i < L.n; i++) if (m.endpoint[i] >= 0) {
    const r = find(L.E + i);
    if (labelOf.has(r) && labelOf.get(r) !== m.endpoint[i]) labelOf.set(r, -2); else labelOf.set(r, m.endpoint[i]);
  }
  // Which piece an unknown edge would join at square i, if that's certain.
  const joinAt = (i, ed, dirOfEdge) => {
    if (m.endpoint[i] >= 0) return find(L.E + i);
    const dirs = [0, 1, 2, 3].filter((d) => on(i, d));
    if (dirs.length === 1) {
      const f = dirs[0];
      if (f === OPP[dirOfEdge]) return find(L.cellEdges[i][f]);
      const turnOk = m.configs[i].includes(bits([f, dirOfEdge]));
      if (turnOk && !canCross(i)) return find(L.cellEdges[i][f]);
      return null;
    }
    if (dirs.length === 2 || dirs.length === 3) {
      const o = L.cellEdges[i][OPP[dirOfEdge]];
      return o >= 0 && st.e[o] === ON ? find(o) : null;
    }
    return null;
  };
  return { find, cycle, labelOf, joinAt };
}

function ruleLines(m, st, out) {
  const { L } = m, P = pieces(m, st);
  if (P.cycle || [...P.labelOf.values()].includes(-2)) { out.push({ contra: true, rule: "lines", focus: [] }); return; }
  for (let ed = 0; ed < L.E; ed++) {
    if (st.e[ed] !== UNK) continue;
    const [a, b] = L.ends[ed];
    const da = L.cellEdges[a].indexOf(ed), db = L.cellEdges[b].indexOf(ed);
    const ca = P.joinAt(a, ed, da), cb = P.joinAt(b, ed, db);
    if (ca == null || cb == null) continue;
    if (ca === cb) { out.push({ rule: "loop", tier: 2, set: [[ed, OFF]], focus: [a, b] }); continue; }
    const la = P.labelOf.get(ca), lb = P.labelOf.get(cb);
    if (la != null && lb != null && la !== lb) out.push({ rule: "wrong-line", tier: 2, set: [[ed, OFF]], focus: [a, b] });
  }
}

// Streets no line can use: parts of the city with no turntable pair, and pockets reached through a
// single square (a line that went in could only come out by crossing itself).
function ruleReach(m, st, out) {
  const { L } = m;
  const alive = (i) => !m.blocked[i] && L.cellEdges[i].some((ed) => ed >= 0 && st.e[ed] !== OFF);
  const adj = (i) => {
    const res = [];
    for (let d = 0; d < 4; d++) { const ed = L.cellEdges[i][d]; if (ed >= 0 && st.e[ed] !== OFF) res.push([L.nb(i, d), ed]); }
    return res;
  };
  const comp = new Int32Array(L.n).fill(-1);
  let nc = 0;
  for (let s = 0; s < L.n; s++) {
    if (comp[s] >= 0 || !alive(s)) continue;
    const q = [s]; comp[s] = nc;
    for (let k = 0; k < q.length; k++) for (const [j] of adj(q[k])) if (comp[j] < 0) { comp[j] = nc; q.push(j); }
    nc++;
  }
  for (const [a, b] of m.pairs) if (comp[a] < 0 || comp[a] !== comp[b]) { out.push({ contra: true, rule: "reach", focus: [a, b] }); return; }
  const hasEnd = new Uint8Array(nc);
  for (let i = 0; i < L.n; i++) if (m.endpoint[i] >= 0 && comp[i] >= 0) hasEnd[comp[i]] = 1;
  const dead = [];
  for (let i = 0; i < L.n; i++) if (comp[i] >= 0 && !hasEnd[comp[i]]) dead.push(i);
  const offOf = (cellsList) => {
    const set = new Map();
    for (const i of cellsList) for (const ed of L.cellEdges[i]) if (ed >= 0 && st.e[ed] === UNK) set.set(ed, [ed, OFF]);
    return [...set.values()];
  };
  if (dead.length) {
    if (dead.some((i) => L.cellEdges[i].some((ed) => ed >= 0 && st.e[ed] === ON))) { out.push({ contra: true, rule: "reach", focus: dead }); return; }
    const set = offOf(dead);
    if (set.length) out.push({ rule: "reach", tier: 3, set, focus: dead });
  }
  // Pockets: articulation points in each component that has turntables.
  const disc = new Int32Array(L.n).fill(-1), low = new Int32Array(L.n), last = new Int32Array(L.n), par = new Int32Array(L.n).fill(-1), parEdge = new Int32Array(L.n).fill(-1);
  const order = [];
  let time = 0;
  for (let root = 0; root < L.n; root++) {
    if (m.endpoint[root] < 0 || disc[root] >= 0) continue;
    const stack = [[root, adj(root), 0]];
    disc[root] = low[root] = time++; order.push(root);
    while (stack.length) {
      const top = stack[stack.length - 1], [u, nbrs] = top;
      if (top[2] < nbrs.length) {
        const [v, ed] = nbrs[top[2]++];
        if (disc[v] < 0) { disc[v] = low[v] = time++; par[v] = u; parEdge[v] = ed; order.push(v); stack.push([v, adj(v), 0]); }
        else if (ed !== parEdge[u]) low[u] = Math.min(low[u], disc[v]);
      } else {
        stack.pop(); last[u] = time - 1;
        if (par[u] >= 0) low[par[u]] = Math.min(low[par[u]], low[u]);
      }
    }
  }
  const endsIn = (v) => order.some((w) => disc[w] >= disc[v] && disc[w] <= last[v] && m.endpoint[w] >= 0);
  for (const v of order) {
    const u = par[v];
    if (u < 0 || low[v] < disc[u] || endsIn(v)) continue;
    const pocket = order.filter((w) => disc[w] >= disc[v] && disc[w] <= last[v]);
    if (pocket.some((i) => L.cellEdges[i].some((ed) => ed >= 0 && st.e[ed] === ON))) { out.push({ contra: true, rule: "pocket", focus: pocket }); return; }
    const set = offOf(pocket);
    if (set.length) out.push({ rule: "pocket", tier: 3, set, focus: pocket });
  }
}

export const RULES = [
  { id: "cell", tier: 1, find: ruleCell },
  { id: "lines", tier: 2, find: ruleLines },
  { id: "reach", tier: 3, find: ruleReach },
];

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
export function checkSolution(m, e) {
  const { L } = m;
  const st = { e: Int8Array.from(e, (x) => (x ? ON : OFF)) };
  for (let i = 0; i < L.n; i++) {
    let cfg = 0;
    for (let d = 0; d < 4; d++) { const ed = L.cellEdges[i][d]; if (ed >= 0 && e[ed]) cfg |= 1 << d; }
    if (!m.configs[i].includes(cfg)) return false;
  }
  const P = pieces(m, st);
  if (P.cycle || [...P.labelOf.values()].includes(-2)) return false;
  // Every piece must be a full line between one matching pair; crossings join different lines.
  for (const [a, b] of m.pairs) if (P.find(L.E + a) !== P.find(L.E + b)) return false;
  const rootsWithEnds = new Set(m.pairs.flat().map((i) => P.find(L.E + i)));
  for (let ed = 0; ed < L.E; ed++) if (e[ed] && !rootsWithEnds.has(P.find(ed))) return false;
  for (let i = 0; i < L.n; i++) {
    const cfg = [0, 1, 2, 3].reduce((acc, d) => acc | (L.cellEdges[i][d] >= 0 && e[L.cellEdges[i][d]] ? 1 << d : 0), 0);
    if (cfg === 15 && P.find(L.cellEdges[i][DL]) === P.find(L.cellEdges[i][DU])) return false;
  }
  return true;
}

export function isComplete(m, st) {
  const P = pieces(m, st);
  return m.pairs.every(([a, b]) => P.find(m.L.E + a) === P.find(m.L.E + b));
}
export const extract = (m, st) => Array.from(st.e, (s) => (s === ON ? 1 : 0));

function pickEdge(m, st) {
  const { L } = m;
  let best = -1, bestScore = Infinity;
  for (let i = 0; i < L.n; i++) {
    if (m.blocked[i]) continue;
    let on = 0, unk = 0, first = -1;
    for (const ed of L.cellEdges[i]) { if (ed < 0) continue; if (st.e[ed] === ON) on++; else if (st.e[ed] === UNK) { unk++; if (first < 0) first = ed; } }
    if (!unk) continue;
    const score = (on % 2 === 1 || (m.endpoint[i] >= 0 && on === 0)) ? unk : 10 + unk;
    if (score < bestScore) { bestScore = score; best = first; }
  }
  return best;
}

export function solve(m, { limit = 2, budget = 30000 } = {}) {
  const sols = [];
  let nodes = 0, aborted = false;
  const rec = (st) => {
    if (sols.length >= limit || aborted) return;
    if (++nodes > budget) { aborted = true; return; }
    if (propagate(m, st, 3) === "contra") return;
    if (isComplete(m, st)) {
      // Anything still open must stay empty for the drawing to be a solution.
      const e = extract(m, st);
      if (checkSolution(m, e)) sols.push(e);
      else {
        const ed = pickEdge(m, st);
        if (ed >= 0) for (const v of [OFF, ON]) { const s2 = cloneState(st); s2.e[ed] = v; rec(s2); }
      }
      return;
    }
    const ed = pickEdge(m, st);
    if (ed < 0) return;
    for (const v of [ON, OFF]) { const s2 = cloneState(st); s2.e[ed] = v; rec(s2); }
  };
  rec(initState(m));
  // Distinct drawings only (a solution reached along two branches counts once).
  const uniq = [...new Map(sols.map((s) => [s.join(""), s])).values()];
  return { count: uniq.length, solutions: uniq, aborted, nodes };
}

export const tracksEngine = {
  RULES, initState, cloneState, applyDeduction, changes, propagate, checkSolution, isComplete, extract,
  unknownCount: (m, st) => st.e.reduce((a, s) => a + (s === UNK ? 1 : 0), 0),
  trialCandidates: (m, st) => {
    const out = [];
    for (let ed = 0; ed < m.L.E; ed++) {
      if (st.e[ed] !== UNK) continue;
      const w = m.L.ends[ed].reduce((a, c) => a + m.L.cellEdges[c].filter((x) => x >= 0 && st.e[x] === ON).length, 0);
      out.push([ed, w]);
    }
    return out;
  },
  trialValues: [ON, OFF],
  opposite: (v) => (v === ON ? OFF : ON),
  focusOf: (m, ed) => m.L.ends[ed],
};
