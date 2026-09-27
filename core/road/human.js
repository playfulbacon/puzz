// Road-engine adapter for the generic human solver (core/lib/human.js).
import { RULES, UNK, ON, OFF, initState, cloneState, applyDeduction, changes, propagate, fragments, scan, checkSolution } from "./engine.js";
import { makeHuman, analyse as analyseTrace, gates, BAND_LABELS } from "../lib/human.js";

export { gates, BAND_LABELS };
export const TIER_NAMES = { 1: "Direct", 2: "No loops", 3: "Connection", 4: "Overlap / short look-ahead", 5: "Long look-ahead" };

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

export const roadEngine = {
  RULES, initState, cloneState, applyDeduction, changes, propagate, checkSolution,
  isComplete: (m, st) => { const f = fragments(m, st); return !f.cycle && f.sComp === f.tComp; },
  unknownCount: (m, st) => { let k = 0; for (let ed = 0; ed < m.L.PS; ed++) if (st.e[ed] === UNK) k++; return k; },
  extract: (m, st) => Array.from(st.e, (s) => (s === ON ? 1 : 0)),
  trialCandidates: (m, st) => {
    const out = [];
    for (let ed = 0; ed < m.L.PS; ed++) {
      if (st.e[ed] !== UNK) continue;
      const [a, b] = m.L.ends[ed];
      out.push([ed, scan(m, st, a).on + scan(m, st, b).on]);
    }
    return out;
  },
  trialValues: [ON, OFF],
  opposite: (v) => (v === ON ? OFF : ON),
  focusOf: (m, ed) => m.L.ends[ed].filter((c) => c >= 0),
};

const H = makeHuman(roadEngine);
export const nextDeduction = H.nextDeduction;
export function humanSolve(m, opts) { const t = H.humanSolve(m, opts); return { ...t, edges: t.solution }; }

export function analyse(m, trace) {
  let clueUse = null;
  if (m.counts.length) {
    const used = new Set(trace.steps.filter((s) => s.clue != null).map((s) => s.clue));
    // A ship is "used" when any deduction touches its lane.
    const shipAt = new Map(m.counts.map((k, idx) => [k.kind === "ship" ? k.at : -1, idx]));
    for (const s of trace.steps) for (const c of s.focus || []) for (const li of m.cellLanes[c]) {
      const idx = shipAt.get(m.lanes[li].at); if (idx != null) used.add(idx);
    }
    clueUse = +(used.size / m.counts.length).toFixed(2);
  }
  return analyseTrace(m, trace, clueUse);
}
