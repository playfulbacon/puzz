// Why isn't the Sasquatch hidden? Facing: one of "L","R","U","D" per hiker (hiker order = cell order).
import { buildModel } from "./engine.js";

const DI = { L: 0, R: 1, U: 2, D: 3 };

export function diagnose(p, facing, hidden) {
  const m = buildModel(p), reasons = [];
  const seen = new Map();
  m.hikers.forEach((h, k) => {
    const d = DI[facing[k]];
    if (h.number != null && h.len[d] !== h.number) reasons.push({ text: `Facing this way, this hiker sees ${h.len[d]} square${h.len[d] === 1 ? "" : "s"}; the number says ${h.number}.`, cells: [h.at] });
    for (const c of h.sees[d]) { if (!seen.has(c)) seen.set(c, []); seen.get(c).push(h.at); }
  });
  const dark = m.ground.filter((c) => !seen.has(c));
  if (hidden >= 0 && seen.has(hidden)) reasons.push({ text: "A hiker is looking straight at the Sasquatch.", cells: [hidden, ...seen.get(hidden)] });
  if (dark.length === 0) reasons.push({ text: "Every square is watched, so there's nowhere left to hide. Facing the right way, the hikers leave exactly one square out of sight.", cells: [] });
  else if (dark.length > 1) reasons.push({ text: `${dark.length} squares are out of sight. Facing the right way, the hikers leave exactly one.`, cells: dark });
  else if (hidden >= 0 && hidden !== dark[0] && !seen.has(hidden)) reasons.push({ text: "The one square nobody can see is somewhere else.", cells: [hidden] });
  return reasons;
}
