// Sasquatch feedback in the puzzle's own terms. marks: per square 0 empty, 1 ×, 2 Sasquatch.
import { buildModel } from "./engine.js";

export const MX = 1, MSQ = 2;

function sightPairs(m, sq) {
  const set = new Set(sq), bad = new Set();
  for (const i of sq) for (const j of m.sees[i]) if (set.has(j)) { bad.add(i); bad.add(j); }
  return [...bad];
}

/** Why isn't this a solution? (Called once every patch has a Sasquatch.) */
export function diagnose(p, marks) {
  const m = buildModel(p), reasons = [];
  const sq = []; marks.forEach((x, i) => { if (x === MSQ) sq.push(i); });
  const per = new Map();
  for (const i of sq) per.set(m.region[i], [...(per.get(m.region[i]) || []), i]);
  const crowded = [...per.values()].filter((l) => l.length > 1).flat();
  if (crowded.length) reasons.push({ text: "Two Sasquatches share a patch of woods. Each patch hides exactly one.", cells: crowded });
  const empty = m.regions.map((cells, r) => (per.has(r) ? null : cells)).filter(Boolean);
  if (empty.length) reasons.push({ text: `${empty.length === 1 ? "A patch has" : `${empty.length} patches have`} no Sasquatch.`, cells: empty.flat() });
  const pairs = sightPairs(m, sq);
  if (pairs.length) reasons.push({ text: "These Sasquatches can see each other along a row or column. Nobody may see a Sasquatch, not even another Sasquatch.", cells: pairs });
  const set = new Set(sq);
  const lonely = m.hikers.filter((h) => !h.watchers.some((i) => set.has(i))).map((h) => h.at);
  if (lonely.length) reasons.push({ text: `${lonely.length === 1 ? "This hiker isn't" : "These hikers aren't"} being watched. Every hiker needs a Sasquatch keeping an eye on them from their side or behind.`, cells: lonely });
  return reasons;
}

/** Things already breaking a rule, whatever happens next. Never looks at the answer. */
export function liveCheck(p, marks) {
  const m = buildModel(p), out = [];
  const add = (text, cells) => { if (cells.length) out.push({ text, cells }); };
  const sq = []; marks.forEach((x, i) => { if (x === MSQ) sq.push(i); });
  const per = new Map();
  for (const i of sq) per.set(m.region[i], [...(per.get(m.region[i]) || []), i]);
  add("Two Sasquatches in one patch of woods. Each patch hides exactly one.", [...per.values()].filter((l) => l.length > 1).flat());
  add("These Sasquatches can see each other. Nobody may see a Sasquatch.", sightPairs(m, sq));
  const full = [];
  m.regions.forEach((cells, r) => { if (!per.has(r) && m.regionOpen[r].every((i) => marks[i] === MX)) full.push(...cells); });
  add("Every square in this patch is crossed out, but the patch must hide a Sasquatch.", full);
  const set = new Set(sq);
  const stranded = m.hikers.filter((h) => !h.watchers.some((i) => set.has(i)) && h.watchers.every((i) => marks[i] === MX)).map((h) => h.at);
  add("Nobody is left who could watch this hiker: every square that sees them is crossed out.", stranded);
  return out;
}
