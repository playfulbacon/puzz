// The human solver: applies one deduction at a time, always the cheapest tier available, and logs
// the trace. Difficulty, path-shape metrics, clue usage and in-app hints all come from this trace.
import { RULES, UNK, ON, OFF, initState, cloneState, applyDeduction, propagate, fragments, scan, checkSolution } from "./engine.js";

export const TIER_NAMES = { 1: "Direct", 2: "No loops", 3: "Connection", 4: "Overlap / short look-ahead", 5: "Long look-ahead" };
export const BAND_LABELS = { 1: "Gentle", 2: "Easy", 3: "Medium", 4: "Hard", 5: "Expert" };

export const RULE_TEXT = {
  continue: "This piece of road has only one way to go on.",
  full: "This square already has both of its road ends, so nothing else can join it.",
  deadend: "Only one way into this square: a road can't stop here, so it stays empty.",
  visit: "The road has to pass through this square, and there are only two ways in.",
  span: "The road can't turn here, so it carries straight on.",
  nospan: "A span this way would never reach a place the road can turn, so none is built.",
  "count-done": "This clue already has all the road it needs; the rest of its squares stay empty.",
  "count-all": "This clue needs every square it has left.",
  finished: "The road is complete.",
  loop: "Joining these two ends would close a loop, but the bridge is one road.",
  early: "Joining these would finish the road too soon and leave something undone.",
  reach: "The road can't get to these squares from the shore.",
  pocket: "A road that went in here could never come back out.",
  bottleneck: "Every route from shore to shore has to pass through here.",
  overlap: "Compare these two clues: their difference settles the squares only one of them sees.",
  "trial-short": "What if? A quick look ahead: this choice runs into trouble within a couple of moves.",
  trial: "What if? Following this choice through leads to a contradiction, so the opposite is true.",
};

const keyOf = (d) => d.set.map((s) => s[0] + ":" + s[1]).sort().join(",") + "|" + (d.need || []).slice().sort().join(",");
const changes = (st, d) => d.set.some(([ed]) => st.e[ed] === UNK) || (d.need || []).some((c) => !st.need[c]);

function findTier(m, st, tier) {
  const out = [], seen = new Set();
  for (const rule of RULES) {
    if (rule.tier !== tier) continue;
    const ds = [];
    rule.find(m, st, ds);
    if (ds.some((d) => d.contra)) return { contra: true, list: [] };
    for (const d of ds) {
      if (!changes(st, d)) continue;
      const k = keyOf(d);
      if (!seen.has(k)) { seen.add(k); out.push(d); }
    }
  }
  return { contra: false, list: out };
}

// "What if": assume an edge, propagate with tiers 1–3, and keep the opposite if that runs into a
// contradiction. Short lookaheads (≤ 3 steps) are tier 4; longer ones, up to maxSteps, are tier 5.
// Edges next to the drawn road are tried first, as a person would.
function findTrial(m, st, maxSteps) {
  const { L } = m, cand = [];
  for (let ed = 0; ed < L.PS; ed++) {
    if (st.e[ed] !== UNK) continue;
    const [a, b] = L.ends[ed];
    cand.push([scan(m, st, a).on + scan(m, st, b).on, ed]);
  }
  cand.sort((x, y) => y[0] - x[0]);
  for (const [cap, tier] of [[3, 4], [maxSteps, 5]]) {
    for (const [, ed] of cand) {
      for (const v of [ON, OFF]) {
        const s2 = cloneState(st); s2.e[ed] = v;
        const stats = {};
        if (propagate(m, s2, 3, cap, stats) === "contra") {
          return { rule: tier === 4 ? "trial-short" : "trial", tier, depth: stats.steps, set: [[ed, v === ON ? OFF : ON]], focus: L.ends[ed].filter((c) => c >= 0) };
        }
      }
    }
  }
  return null;
}

const complete = (m, st) => { const f = fragments(m, st); return !f.cycle && f.sComp === f.tComp; };
const center = (m, d) => {
  if (!d?.focus?.length) return null;
  const C = m.L.C; let r = 0, c = 0;
  for (const i of d.focus) { r += Math.floor(i / C); c += i % C; }
  return [r / d.focus.length, c / d.focus.length];
};

/** Next deduction from a state, or null. Prefers deductions near `near` (the last one), like a person would. */
export function nextDeduction(m, st, { maxTier = 5, trialSteps = 30, near = null } = {}) {
  for (let tier = 1; tier <= Math.min(maxTier, 4); tier++) {
    const { contra, list } = findTier(m, st, tier);
    if (tier === 4 && !contra && !list.length) {
      const d = findTrial(m, st, 3);
      if (d && d.tier === 4) return { d, avail: 1 };
    }
    if (contra) return { contra: true };
    if (list.length) {
      let best = list[0];
      if (near) {
        let bd = Infinity;
        for (const d of list) {
          const c = center(m, d); if (!c) continue;
          const dist = Math.abs(c[0] - near[0]) + Math.abs(c[1] - near[1]);
          if (dist < bd) { bd = dist; best = d; }
        }
      }
      return { d: best, avail: list.length };
    }
  }
  if (maxTier >= 5) { const d = findTrial(m, st, trialSteps); if (d) return { d, avail: 1 }; }
  return null;
}

export function humanSolve(m, { maxTier = 5, trialSteps = 30, from = null } = {}) {
  const st = from ? cloneState(from) : initState(m);
  const steps = [];
  let near = null, stuck = false;
  const totalUnk = () => { let k = 0; for (let ed = 0; ed < m.L.PS; ed++) if (st.e[ed] === UNK) k++; return k; };
  const startUnk = totalUnk();
  while (!complete(m, st)) {
    const nx = nextDeduction(m, st, { maxTier, trialSteps, near });
    if (!nx || nx.contra) { stuck = true; break; }
    const before = totalUnk();
    applyDeduction(st, nx.d);
    steps.push({ tier: nx.d.tier, rule: nx.d.rule, avail: nx.avail, decided: before - totalUnk(), clue: nx.d.clue, focus: nx.d.focus });
    near = center(m, nx.d) || near;
    if (steps.length > 5000) { stuck = true; break; }
  }
  const e = Array.from(st.e, (s) => (s === ON ? 1 : 0));
  const solved = !stuck && checkSolution(m, e);
  return { solved, stuck, steps, edges: e, startUnk };
}

const decidedTotalOf = (steps) => steps.reduce((a, s) => a + s.decided, 0);

/** Path-shape metrics (research/generation-heuristics.md §3) and a rating from a human trace. */
export function analyse(m, trace) {
  const { steps } = trace;
  const n = steps.length;
  const maxTier = steps.reduce((a, s) => Math.max(a, s.tier), 1);
  const firstMax = steps.findIndex((s) => s.tier === maxTier);
  let lastMax = -1; steps.forEach((s, i) => { if (s.tier === maxTier) lastMax = i; });
  const opening = n ? (steps[0].tier === 1 ? steps[0].avail : 0) : 0;
  let stall = 0, run = 0, breakthroughs = 0;
  for (let i = 0; i < n; i++) {
    if (steps[i].avail <= 1) { run++; stall = Math.max(stall, run); } else run = 0;
    if (steps[i].tier >= 2 && steps[i].avail <= 2 && i + 1 < n && steps[i + 1].avail >= 3) breakthroughs++;
  }
  const decidedTotal = decidedTotalOf(steps) || 1;
  const finishDecided = maxTier === 1 ? decidedTotalOf(steps) : steps.slice(lastMax + 1).reduce((a, s) => a + (s.tier === 1 ? s.decided : 0), 0);
  const variety = new Set(steps.map((s) => s.rule)).size;
  const techniques = {};
  for (const s of steps) techniques[s.rule] = (techniques[s.rule] || 0) + 1;
  const hard = steps.filter((s) => s.tier >= 3).length;
  const usedClues = new Set(steps.filter((s) => s.clue != null).map((s) => s.clue));
  // A ship is "used" when any deduction touches its lane.
  const shipAt = new Map(m.counts.map((k, idx) => [k.kind === "ship" ? k.at : -1, idx]));
  for (const s of steps) for (const c of s.focus || []) for (const li of m.cellLanes[c]) {
    const idx = shipAt.get(m.lanes[li].at); if (idx != null) usedClues.add(idx);
  }
  const band = maxTier;
  const score = Math.round((band * 10 + Math.min(hard, 20) * 0.6 + steps.filter((s) => s.tier >= 4).length * 1.5) * 10) / 10;
  return {
    band, label: BAND_LABELS[band], score, steps: n, maxTier,
    opening, ramp: n && firstMax >= 0 ? +(firstMax / n).toFixed(2) : 0,
    breakthroughs, stall, finish: +(finishDecided / decidedTotal).toFixed(2), variety, techniques,
    clueUse: m.counts.length ? +(usedClues.size / m.counts.length).toFixed(2) : null,
  };
}

/** Quality gates from the design brief, relaxed for gentle puzzles. */
export function gates(a) {
  const g = {
    opening: a.opening >= 3,
    ramp: a.band <= 2 || (a.ramp >= 0.15 && a.ramp <= 0.75),
    breakthroughs: a.band <= 2 || (a.breakthroughs >= 1 && a.breakthroughs <= 6),
    stall: a.stall <= (a.band <= 3 ? 6 : 10),
    finish: a.finish >= 0.2,
    variety: a.band <= 2 || a.variety >= 4,
    clueUse: a.clueUse == null || a.clueUse >= 0.8,
  };
  return { ...g, pass: Object.values(g).every(Boolean) };
}
