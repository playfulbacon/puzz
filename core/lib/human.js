// Engine-agnostic human-style solver. Given an engine (rules + state helpers), it applies one
// deduction at a time, cheapest tier first, and logs the trace that difficulty, path-shape metrics
// and in-app hints are built from (research/generation-heuristics.md §3).
//
// An engine provides:
//   RULES: [{ tier, find(m, st, out) }]  deductions {rule, tier, set:[[var,val]], need?, focus, clue?} or {contra}
//   initState(m), cloneState(st), applyDeduction(st, d) → bool, changes(st, d) → bool
//   propagate(m, st, maxTier, maxSteps, stats) → "ok" | "contra" | "capped"
//   isComplete(m, st), unknownCount(m, st), extract(m, st) → solution vector, checkSolution(m, sol)
//   trialCandidates(m, st) → [[var, weight]], trialValues: [a, b], opposite(val)
//   clueUse?(m, steps) → fraction or null

export const BAND_LABELS = { 1: "Gentle", 2: "Easy", 3: "Medium", 4: "Hard", 5: "Expert" };

export function makeHuman(E) {
  const keyOf = (d) => d.set.map((s) => s[0] + ":" + s[1]).sort().join(",") + "|" + (d.need || []).slice().sort().join(",");

  function findTier(m, st, tier) {
    const out = [], seen = new Set();
    for (const rule of E.RULES) {
      if (rule.tier !== tier) continue;
      const ds = [];
      rule.find(m, st, ds);
      if (ds.some((d) => d.contra)) return { contra: true, list: [] };
      for (const d of ds) {
        if (!E.changes(st, d)) continue;
        const k = keyOf(d);
        if (!seen.has(k)) { seen.add(k); out.push(d); }
      }
    }
    return { contra: false, list: out };
  }

  // "What if": assume a value, propagate with tiers 1–3, keep the opposite on contradiction.
  // Look-aheads of ≤ 3 steps are tier 4; longer ones (up to maxSteps) tier 5.
  function findTrial(m, st, maxSteps, onlyShort = false) {
    const cand = E.trialCandidates(m, st).sort((x, y) => y[1] - x[1]);
    for (const [cap, tier] of onlyShort ? [[3, 4]] : [[3, 4], [maxSteps, 5]]) {
      for (const [v] of cand) {
        for (const val of E.trialValues) {
          const s2 = E.cloneState(st);
          if (!E.applyDeduction(s2, { set: [[v, val]] })) continue;
          const stats = {};
          if (E.propagate(m, s2, 3, cap, stats) === "contra") {
            return { rule: tier === 4 ? "trial-short" : "trial", tier, depth: stats.steps, set: [[v, E.opposite(val)]], focus: E.focusOf ? E.focusOf(m, v) : [], assumed: [v, val] };
          }
        }
      }
    }
    return null;
  }

  const center = (m, d) => {
    if (!d?.focus?.length) return null;
    const C = m.cols; let r = 0, c = 0;
    for (const i of d.focus) { r += Math.floor(i / C); c += i % C; }
    return [r / d.focus.length, c / d.focus.length];
  };

  function nextDeduction(m, st, { maxTier = 5, trialSteps = 30, near = null } = {}) {
    for (let tier = 1; tier <= Math.min(maxTier, 4); tier++) {
      const { contra, list } = findTier(m, st, tier);
      if (contra) return { contra: true };
      if (!list.length && tier === 4) {
        const d = findTrial(m, st, 3, true);
        if (d) return { d, avail: 1 };
      }
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

  function humanSolve(m, { maxTier = 5, trialSteps = 30, from = null } = {}) {
    const st = from ? E.cloneState(from) : E.initState(m);
    const steps = [];
    let near = null, stuck = false;
    while (!E.isComplete(m, st)) {
      const nx = nextDeduction(m, st, { maxTier, trialSteps, near });
      if (!nx || nx.contra) { stuck = true; break; }
      const before = E.unknownCount(m, st);
      E.applyDeduction(st, nx.d);
      steps.push({ tier: nx.d.tier, rule: nx.d.rule, avail: nx.avail, decided: before - E.unknownCount(m, st), clue: nx.d.clue, focus: nx.d.focus });
      near = center(m, nx.d) || near;
      if (steps.length > 5000) { stuck = true; break; }
    }
    const solution = E.extract(m, st);
    const solved = !stuck && E.checkSolution(m, solution);
    return { solved, stuck, steps, solution, state: st };
  }

  return { nextDeduction, humanSolve, findTier, findTrial };
}

/** Path-shape metrics and a rating from a human trace. */
export function analyse(m, trace, clueUse = null) {
  const { steps } = trace;
  const n = steps.length;
  const maxTier = steps.reduce((a, s) => Math.max(a, s.tier), 1);
  const firstMax = steps.findIndex((s) => s.tier === maxTier);
  let lastMax = -1; steps.forEach((s, i) => { if (s.tier === maxTier) lastMax = i; });
  const opening = n ? (steps[0].tier === 1 ? steps[0].avail : 0) : 0;
  let stall = 0, run = 0, breakthroughs = 0;
  for (let i = 0; i < n; i++) {
    if (steps[i].avail <= 1) { run++; stall = Math.max(stall, run); } else run = 0;
    // A breakthrough: a hard step taken at a stall that opens things up again, either several options
    // at once (wide-front puzzles) or a run of at least four easy steps (line puzzles advance on a
    // narrow front, one or two options at a time).
    if (steps[i].tier >= 2 && steps[i].avail <= 2 && i + 1 < n) {
      let run = 0;
      for (let j = i + 1; j < n && steps[j].tier === 1; j++) run++;
      if (steps[i + 1].avail >= 3 || run >= 4) breakthroughs++;
    }
  }
  const total = steps.reduce((a, s) => a + s.decided, 0);
  const finishDecided = maxTier === 1 ? total : steps.slice(lastMax + 1).reduce((a, s) => a + (s.tier === 1 ? s.decided : 0), 0);
  const techniques = {};
  for (const s of steps) techniques[s.rule] = (techniques[s.rule] || 0) + 1;
  const hard = steps.filter((s) => s.tier >= 3).length;
  // Cell-by-cell narrowing: look-aheads feel like guessing; the target solve narrows by clues alone.
  const lookaheads = steps.filter((s) => s.rule === "trial" || s.rule === "trial-short").length;
  const reasoning = steps.filter((s) => s.tier >= 2 && s.rule !== "trial" && s.rule !== "trial-short").length;
  let dist = 0, moves = 0, prev = null;
  for (const s of steps) {
    if (!s.focus?.length) continue;
    const c = [s.focus.reduce((a, i) => a + Math.floor(i / m.cols), 0) / s.focus.length, s.focus.reduce((a, i) => a + (i % m.cols), 0) / s.focus.length];
    if (prev) { dist += Math.abs(c[0] - prev[0]) + Math.abs(c[1] - prev[1]); moves++; }
    prev = c;
  }
  const band = maxTier;
  // Difficulty within a band comes from real reasoning steps, not from how many look-aheads it took.
  const score = Math.round((band * 10 + Math.min(reasoning, 20) * 0.8 + Math.min(lookaheads, 3) * 0.5) * 10) / 10;
  return {
    band, label: BAND_LABELS[band], score, steps: n, maxTier,
    opening, ramp: n && firstMax >= 0 ? +(firstMax / n).toFixed(2) : 0,
    breakthroughs, stall, finish: +(finishDecided / (total || 1)).toFixed(2), variety: Object.keys(techniques).length, techniques,
    lookaheads, reasoning, locality: moves ? +(dist / moves).toFixed(2) : 0,
    clueUse,
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
    // The target experience is cell-by-cell narrowing: at most two look-aheads in any puzzle.
    lookahead: (a.lookaheads ?? 0) <= 2,
  };
  return { ...g, pass: Object.values(g).every(Boolean) };
}

export function weightedPick(rng, cands) {
  const total = cands.reduce((a, c) => a + (c.w ?? 1), 0);
  let x = rng.next() * total;
  for (const c of cands) { x -= c.w ?? 1; if (x <= 0) return c; }
  return cands[cands.length - 1];
}
