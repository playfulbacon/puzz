// Sasquatch: turn every hiker to face the right way. A hiker sees each square straight ahead until a
// tree blocks the view; a number on a hiker says how many squares that is. Facing correctly, the
// hikers leave exactly one square of the woods out of sight, and that's where the Sasquatch hides.
//
// spec: { rows, cols, cells: string ('.' ground, '#' tree, 'h' hiker), numbers: { [cell]: n } }
// Variables: one per (hiker, direction) — "this hiker faces this way" — held as a 4-bit domain.

export const DIRS = ["L", "R", "U", "D"];
export const YES = 1, NO = 2;
const DR = [0, 0, -1, 1], DC = [-1, 1, 0, 0];
const popcount = (x) => (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
const only = (x) => (x === 1 ? 0 : x === 2 ? 1 : x === 4 ? 2 : x === 8 ? 3 : -1);

export function buildModel(spec) {
  const { rows: R, cols: C, cells } = spec, n = R * C;
  const ray = (i, d) => {
    const out = [];
    let r = Math.floor(i / C) + DR[d], c = (i % C) + DC[d];
    while (r >= 0 && c >= 0 && r < R && c < C && cells[r * C + c] !== "#") { out.push(r * C + c); r += DR[d]; c += DC[d]; }
    return out;
  };
  const hikers = [], hikerAt = new Map();
  for (let i = 0; i < n; i++) if (cells[i] === "h") {
    const rays = [0, 1, 2, 3].map((d) => ray(i, d));
    const num = spec.numbers?.[i];
    hikerAt.set(i, hikers.length);
    hikers.push({ at: i, number: num ?? null, len: rays.map((r) => r.length), sees: rays.map((r) => r.filter((c) => cells[c] === ".")) });
  }
  const ground = [];
  for (let i = 0; i < n; i++) if (cells[i] === ".") ground.push(i);
  const coverers = Array.from({ length: n }, () => []);
  hikers.forEach((h, k) => h.sees.forEach((list, d) => list.forEach((c) => coverers[c].push([k, d]))));
  return { spec, rows: R, cols: C, n, ray, hikers, hikerAt, ground, coverers };
}

export function initState(m) { return { dom: new Uint8Array(m.hikers.length).fill(15) }; }
export const cloneState = (st) => ({ dom: st.dom.slice() });
const varOf = (k, d) => k * 4 + d;

export function applyDeduction(st, d) {
  for (const [v, val] of d.set) {
    const k = v >> 2, bit = 1 << (v & 3);
    if (val === YES) { if (!(st.dom[k] & bit)) return false; st.dom[k] = bit; }
    else { st.dom[k] &= ~bit; if (!st.dom[k]) return false; }
  }
  return true;
}
export const changes = (st, d) => d.set.some(([v, val]) => {
  const k = v >> 2, bit = 1 << (v & 3);
  return val === YES ? st.dom[k] !== bit : (st.dom[k] & bit) !== 0;
});

// Squares nobody can see any more, and squares somebody certainly sees.
export function sightStatus(m, st) {
  const dark = [], sure = new Uint8Array(m.n);
  for (const s of m.ground) {
    let any = false;
    for (const [k, d] of m.coverers[s]) if (st.dom[k] & (1 << d)) { any = true; break; }
    if (!any) dark.push(s);
  }
  m.hikers.forEach((h, k) => {
    // Squares every remaining direction of this hiker covers (usually: its one fixed direction).
    let common = null;
    for (let d = 0; d < 4; d++) if (st.dom[k] & (1 << d)) {
      const set = new Set(h.sees[d]);
      common = common ? new Set([...common].filter((c) => set.has(c))) : set;
    }
    for (const c of common || []) sure[c] = 1;
  });
  return { dark, sure };
}

// ------------------------------------------------------------------ rules
function ruleMeasure(m, st, out) {
  m.hikers.forEach((h, k) => {
    if (h.number == null) return;
    const set = [];
    for (let d = 0; d < 4; d++) if ((st.dom[k] & (1 << d)) && h.len[d] !== h.number) set.push([varOf(k, d), NO]);
    if (set.length) out.push({ rule: "measure", tier: 1, set, focus: [h.at], clue: k });
  });
}

// With the hiding place known, every other square must be watched: a square only one hiker can
// still see fixes which way that hiker looks.
function ruleWatch(m, st, out) {
  const { dark, sure } = sightStatus(m, st);
  if (dark.length > 1) { out.push({ contra: true, rule: "watch", focus: dark }); return; }
  if (dark.length !== 1) return;
  for (const s of m.ground) {
    if (s === dark[0] || sure[s]) continue;
    const opts = m.coverers[s].filter(([k, d]) => st.dom[k] & (1 << d));
    const ks = new Set(opts.map(([k]) => k));
    if (ks.size !== 1) continue;
    const k = opts[0][0];
    const set = [];
    for (let d = 0; d < 4; d++) if ((st.dom[k] & (1 << d)) && !opts.some(([, dd]) => dd === d)) set.push([varOf(k, d), NO]);
    if (set.length) out.push({ rule: "watch", tier: 1, set, focus: [m.hikers[k].at, s, dark[0]] });
  }
}

// If a hiker looked this way, two squares would be left unwatched, but there is only one Sasquatch.
function ruleGap(m, st, out) {
  const { dark } = sightStatus(m, st);
  if (dark.length > 1) { out.push({ contra: true, rule: "gap", focus: dark }); return; }
  m.hikers.forEach((h, k) => {
    if (popcount(st.dom[k]) < 2) return;
    for (let d = 0; d < 4; d++) {
      if (!(st.dom[k] & (1 << d))) continue;
      const newly = [];
      for (const s of m.ground) {
        if (dark.includes(s)) continue;
        const opts = m.coverers[s].filter(([kk, dd]) => st.dom[kk] & (1 << dd));
        if (opts.length && opts.every(([kk, dd]) => kk === k && dd !== d)) newly.push(s);
      }
      if (dark.length + newly.length >= 2) out.push({ rule: "gap", tier: 2, set: [[varOf(k, d), NO]], focus: [h.at, ...newly, ...dark] });
    }
  });
}

export const RULES = [
  { id: "measure", tier: 1, find: ruleMeasure },
  { id: "watch", tier: 1, find: ruleWatch },
  { id: "gap", tier: 2, find: ruleGap },
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

/** A solution is one direction index per hiker. Returns the hiding square, or -1 if invalid. */
export function hidingSpot(m, dirs) {
  const seen = new Uint8Array(m.n);
  for (let k = 0; k < m.hikers.length; k++) {
    const h = m.hikers[k], d = dirs[k];
    if (d < 0 || (h.number != null && h.len[d] !== h.number)) return -1;
    for (const c of h.sees[d]) seen[c] = 1;
  }
  const dark = m.ground.filter((s) => !seen[s]);
  return dark.length === 1 ? dark[0] : -1;
}
export const checkSolution = (m, dirs) => hidingSpot(m, dirs) >= 0;
export const isComplete = (m, st) => st.dom.every((x) => popcount(x) === 1);
export const extract = (m, st) => Array.from(st.dom, only);

export function solve(m, { limit = 2, budget = 20000 } = {}) {
  const sols = [];
  let nodes = 0, aborted = false;
  const rec = (st) => {
    if (sols.length >= limit || aborted) return;
    if (++nodes > budget) { aborted = true; return; }
    if (propagate(m, st, 2) === "contra") return;
    if (isComplete(m, st)) { const s = extract(m, st); if (checkSolution(m, s)) sols.push(s); return; }
    let best = -1;
    st.dom.forEach((x, k) => { if (popcount(x) > 1 && (best < 0 || popcount(x) < popcount(st.dom[best]))) best = k; });
    for (let d = 0; d < 4; d++) {
      if (!(st.dom[best] & (1 << d))) continue;
      const s2 = cloneState(st); s2.dom[best] = 1 << d;
      rec(s2);
    }
  };
  rec(initState(m));
  return { count: sols.length, solutions: sols, aborted, nodes };
}

export const hideEngine = {
  RULES, initState, cloneState, applyDeduction, changes, propagate, checkSolution, isComplete, extract,
  unknownCount: (m, st) => st.dom.reduce((a, x) => a + popcount(x) - 1, 0),
  trialCandidates: (m, st) => {
    const out = [];
    st.dom.forEach((x, k) => { if (popcount(x) > 1) for (let d = 0; d < 4; d++) if (x & (1 << d)) out.push([varOf(k, d), 5 - popcount(x)]); });
    return out;
  },
  trialValues: [YES, NO],
  opposite: (v) => (v === YES ? NO : YES),
  focusOf: (m, v) => [m.hikers[v >> 2].at],
};
