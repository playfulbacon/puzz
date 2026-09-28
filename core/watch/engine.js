// Sasquatch: you're a family of Sasquatches hiding in the woods. Each patch of woods (outlined by
// creeks) hides exactly one Sasquatch. Nobody may see a Sasquatch: hikers look straight ahead,
// Sasquatches look along their row and column, and sight stops at trees and people. And every hiker
// must be watched by a Sasquatch: you keep an eye on them from where they can't see you.
//
// spec: { rows, cols, cells: string ('.' ground, '#' tree, 'h' hiker), regions: string (one letter
// per cell), hikers: { [cell]: { dir } } }. One variable per square: UNK, SQ (a Sasquatch), NO.

export const UNK = 0, SQ = 1, NO = 2;
export const DIRS = ["L", "R", "U", "D"];
const DR = [0, 0, -1, 1], DC = [-1, 1, 0, 0];

export function buildModel(spec) {
  const { rows: R, cols: C, cells } = spec, n = R * C;
  const blocks = (i) => cells[i] === "#" || cells[i] === "h";
  const ray = (i, d) => {
    const out = [];
    let r = Math.floor(i / C) + DR[d], c = (i % C) + DC[d];
    while (r >= 0 && c >= 0 && r < R && c < C && !blocks(r * C + c)) { out.push(r * C + c); r += DR[d]; c += DC[d]; }
    return out;
  };
  // What a Sasquatch standing here would see, and which hikers it would watch.
  const sees = [], watches = [];
  for (let i = 0; i < n; i++) {
    const s = [], w = [];
    if (!blocks(i)) for (let d = 0; d < 4; d++) {
      s.push(...ray(i, d));
      let r = Math.floor(i / C) + DR[d], c = (i % C) + DC[d];
      while (r >= 0 && c >= 0 && r < R && c < C && !blocks(r * C + c)) { r += DR[d]; c += DC[d]; }
      if (r >= 0 && c >= 0 && r < R && c < C && cells[r * C + c] === "h") w.push(r * C + c);
    }
    sees.push(s); watches.push(w);
  }
  const hikers = [], viewed = new Uint8Array(n);
  for (const [k, h] of Object.entries(spec.hikers || {})) {
    const at = +k, view = ray(at, DIRS.indexOf(h.dir));
    view.forEach((c) => (viewed[c] = 1));
    hikers.push({ at, dir: h.dir, view, watchers: [] });
  }
  const open = new Uint8Array(n);
  for (let i = 0; i < n; i++) open[i] = cells[i] === "." && !viewed[i] ? 1 : 0;
  const hikerIdx = new Map(hikers.map((h, k) => [h.at, k]));
  for (let i = 0; i < n; i++) if (open[i]) for (const at of watches[i]) hikers[hikerIdx.get(at)].watchers.push(i);
  const ids = [...new Set(spec.regions)].sort();
  const region = Array.from(spec.regions, (ch) => ids.indexOf(ch));
  const regions = ids.map(() => []);
  for (let i = 0; i < n; i++) regions[region[i]].push(i);
  const regionOpen = regions.map((list) => list.filter((i) => open[i]));
  return { spec, rows: R, cols: C, n, cells, open, viewed, sees, watches, hikers, hikerIdx, region, regions, regionOpen };
}

export function initState(m) {
  const v = new Int8Array(m.n);
  for (let i = 0; i < m.n; i++) if (!m.open[i]) v[i] = NO;
  return { v };
}
export const cloneState = (st) => ({ v: st.v.slice() });
export function applyDeduction(st, d) {
  for (const [i, val] of d.set) {
    if (st.v[i] === UNK) st.v[i] = val;
    else if (st.v[i] !== val) return false;
  }
  return true;
}
export const changes = (st, d) => d.set.some(([i]) => st.v[i] === UNK);

const cands = (m, st, r) => m.regionOpen[r].filter((i) => st.v[i] !== NO);
const placed = (m, st, r) => m.regionOpen[r].find((i) => st.v[i] === SQ);
const watchCands = (m, st, h) => h.watchers.filter((i) => st.v[i] !== NO);
const watched = (m, st, h) => h.watchers.some((i) => st.v[i] === SQ);

// ------------------------------------------------------------------ rules
// Deductions {rule, tier, set:[[cell, SQ|NO]], focus:[cells]} or {contra, rule, focus}.

function ruleBasics(m, st, out) {
  for (let r = 0; r < m.regions.length; r++) {
    const c = cands(m, st, r), sq = c.filter((i) => st.v[i] === SQ);
    if (sq.length > 1) { out.push({ contra: true, rule: "patch", focus: sq }); return; }
    if (!c.length) { out.push({ contra: true, rule: "patch", focus: m.regions[r] }); return; }
    if (sq.length === 1) {
      const rest = c.filter((i) => st.v[i] === UNK);
      if (rest.length) out.push({ rule: "patch", tier: 1, set: rest.map((i) => [i, NO]), focus: m.regions[r] });
    } else if (c.length === 1) out.push({ rule: "last", tier: 1, set: [[c[0], SQ]], focus: m.regions[r] });
  }
  for (let i = 0; i < m.n; i++) {
    if (st.v[i] !== SQ) continue;
    const seen = m.sees[i].filter((j) => st.v[j] !== NO);
    if (seen.some((j) => st.v[j] === SQ)) { out.push({ contra: true, rule: "sight", focus: [i, ...seen.filter((j) => st.v[j] === SQ)] }); return; }
    if (seen.length) out.push({ rule: "sight", tier: 1, set: seen.map((j) => [j, NO]), focus: [i, ...seen] });
  }
  for (const h of m.hikers) {
    if (watched(m, st, h)) continue;
    const w = watchCands(m, st, h);
    if (!w.length) { out.push({ contra: true, rule: "watch", focus: [h.at] }); return; }
    if (w.length === 1) out.push({ rule: "watch", tier: 1, set: [[w[0], SQ]], focus: [h.at, w[0]] });
  }
}

// Whichever square a patch's Sasquatch takes, it would see this square: so nobody hides here.
// Likewise for the squares that could watch an unwatched hiker.
function ruleClaim(m, st, out) {
  const groups = [];
  for (let r = 0; r < m.regions.length; r++) if (placed(m, st, r) == null) groups.push({ kind: "patch", cells: cands(m, st, r), focus: m.regions[r], r });
  for (const h of m.hikers) if (!watched(m, st, h)) groups.push({ kind: "watch", cells: watchCands(m, st, h), focus: [h.at], h });
  for (const g of groups) {
    if (g.cells.length < 2) continue;
    let common = null;
    for (const i of g.cells) { const s = new Set(m.sees[i]); common = common ? common.filter((j) => s.has(j)) : [...s]; }
    const set = common.filter((j) => st.v[j] === UNK && !g.cells.includes(j)).map((j) => [j, NO]);
    if (set.length) out.push({ rule: g.kind === "patch" ? "claim" : "watch-claim", tier: 2, set, focus: [...g.focus, ...set.map((x) => x[0])] });
    // A hiker whose possible watchers all sit in one patch: that patch's Sasquatch is the watcher.
    if (g.kind === "watch") {
      const rs = new Set(g.cells.map((i) => m.region[i]));
      if (rs.size === 1) {
        const r = [...rs][0], rest = cands(m, st, r).filter((i) => st.v[i] === UNK && !g.cells.includes(i));
        if (rest.length) out.push({ rule: "watch-patch", tier: 2, set: rest.map((i) => [i, NO]), focus: [g.h.at, ...m.regions[r]] });
      }
    }
  }
}

// A Sasquatch here would leave some patch with nowhere to hide, or some hiker with no one able to
// watch them.
function ruleBlock(m, st, out) {
  for (let i = 0; i < m.n; i++) {
    if (st.v[i] !== UNK) continue;
    const gone = new Set(m.sees[i]);
    for (const j of m.regionOpen[m.region[i]]) if (j !== i) gone.add(j);
    let why = null;
    for (let r = 0; r < m.regions.length && !why; r++) {
      if (r === m.region[i] || placed(m, st, r) != null) continue;
      const c = cands(m, st, r);
      if (c.every((j) => gone.has(j))) why = m.regions[r];
    }
    for (const h of m.hikers) {
      if (why) break;
      if (watched(m, st, h) || h.watchers.includes(i)) continue;
      const w = watchCands(m, st, h);
      if (w.every((j) => gone.has(j))) why = [h.at, ...w];
    }
    if (why) out.push({ rule: "block", tier: 2, set: [[i, NO]], focus: [i, ...why] });
  }
}

// Two patches whose Sasquatches, between them, can only use squares seen from one line: pairs.
// (Tier 3: if patches A and B can each only hide in squares that see square X, X is empty — covered
// by claim; here, any placement in A leaves B with nowhere, over the pair.)
function rulePair(m, st, out) {
  const open = [];
  for (let r = 0; r < m.regions.length; r++) if (placed(m, st, r) == null) open.push(r);
  for (let i = 0; i < m.n; i++) {
    if (st.v[i] !== UNK) continue;
    // Placing here: for some other patch A, every remaining spot of A would leave some patch B empty.
    const gone = new Set(m.sees[i]);
    for (const j of m.regionOpen[m.region[i]]) if (j !== i) gone.add(j);
    for (const a of open) {
      if (a === m.region[i]) continue;
      const ca = cands(m, st, a).filter((j) => !gone.has(j));
      if (!ca.length) continue;
      let allFail = true;
      for (const j of ca) {
        const gone2 = new Set(gone); m.sees[j].forEach((x) => gone2.add(x));
        let fails = false;
        for (const b of open) {
          if (b === a || b === m.region[i]) continue;
          if (cands(m, st, b).every((x) => gone2.has(x) || m.region[x] === a)) { fails = true; break; }
        }
        if (!fails) { allFail = false; break; }
      }
      if (allFail) { out.push({ rule: "pair", tier: 3, set: [[i, NO]], focus: [i, ...m.regions[a]] }); break; }
    }
  }
}

export const RULES = [
  { id: "basics", tier: 1, find: ruleBasics },
  { id: "claim", tier: 2, find: ruleClaim },
  { id: "block", tier: 2, find: ruleBlock },
  { id: "pair", tier: 3, find: rulePair },
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

/** Is this set of Sasquatch squares a solution? */
export function checkSolution(m, sq) {
  const set = new Set(sq);
  const per = new Array(m.regions.length).fill(0);
  for (const i of sq) { if (!m.open[i]) return false; per[m.region[i]]++; }
  if (per.some((k) => k !== 1)) return false;
  for (const i of sq) if (m.sees[i].some((j) => set.has(j))) return false;
  for (const h of m.hikers) if (!h.watchers.some((i) => set.has(i))) return false;
  return true;
}

/** Count solutions up to `limit`. */
export function solve(m, { limit = 2, budget = 20000 } = {}) {
  const sols = [];
  let nodes = 0, aborted = false;
  const rec = (st) => {
    if (sols.length >= limit || aborted) return;
    if (++nodes > budget) { aborted = true; return; }
    if (propagate(m, st, 1) === "contra") return;
    let best = -1, bestC = null;
    for (let r = 0; r < m.regions.length; r++) {
      if (placed(m, st, r) != null) continue;
      const c = cands(m, st, r);
      if (!bestC || c.length < bestC.length) { best = r; bestC = c; }
    }
    if (best < 0) {
      const sq = []; for (let i = 0; i < m.n; i++) if (st.v[i] === SQ) sq.push(i);
      if (checkSolution(m, sq)) sols.push(sq);
      return;
    }
    for (const i of bestC) { const s2 = cloneState(st); s2.v[i] = SQ; rec(s2); }
  };
  rec(initState(m));
  return { count: sols.length, solutions: sols, aborted, nodes };
}

export const watchEngine = {
  RULES, initState, cloneState, applyDeduction, changes, propagate, checkSolution,
  isComplete: (m, st) => m.regions.every((_, r) => placed(m, st, r) != null) && st.v.every((x) => x !== UNK),
  unknownCount: (m, st) => st.v.reduce((a, x) => a + (x === UNK ? 1 : 0), 0),
  extract: (m, st) => { const sq = []; for (let i = 0; i < m.n; i++) if (st.v[i] === SQ) sq.push(i); return sq; },
  trialCandidates: (m, st) => { const out = []; for (let i = 0; i < m.n; i++) if (st.v[i] === UNK) out.push([i, 1]); return out; },
  trialValues: [SQ, NO],
  opposite: (v) => (v === SQ ? NO : SQ),
  focusOf: (m, i) => [i],
};
