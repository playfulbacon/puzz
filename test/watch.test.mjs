// Sasquatch (watch engine) and Fog Signals towers.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as W from "../core/watch/engine.js";
import { generate } from "../core/watch/generate.js";
import { makeHuman } from "../core/lib/human.js";
import { liveCheck } from "../core/watch/diagnose.js";
import { buildModel, solve, initState, propagate, layout, ON, OFF } from "../core/road/engine.js";
import { PACKS } from "../site/data/puzzles.js";

test("watch: one per patch, nobody sees a Sasquatch, every hiker watched", () => {
  // Two patches side by side (A left column pair, B right), no trees: the two Sasquatches can't
  // share a row or a column.
  const spec = { rows: 2, cols: 2, cells: "....", regions: "ABAB", hikers: {} };
  const m = W.buildModel(spec);
  assert.equal(W.solve(m).count, 2);
  assert.ok(W.checkSolution(m, [0, 3]));
  assert.ok(!W.checkSolution(m, [0, 1]), "same row: they'd see each other");
  // A hiker facing up in the bottom-left corner sees the square above it.
  const h = W.buildModel({ rows: 2, cols: 3, cells: "...h..", regions: "AABAAB", hikers: { 3: { dir: "U" } } });
  assert.equal(h.open[0], 0);
  assert.ok(h.hikers[0].watchers.includes(4), "the square beside the hiker watches them");
});

test("watch: generated puzzles are unique and solved without look-aheads", () => {
  const H = makeHuman(W.watchEngine);
  let made = 0;
  for (let seed = 1; seed <= 8 && made < 4; seed++) {
    const p = generate({ rows: 7, cols: 7, seed });
    if (!p) continue;
    made++;
    const m = W.buildModel(p);
    assert.ok(W.checkSolution(m, p.solution), `${p.id} valid`);
    assert.equal(W.solve(m).count, 1, `${p.id} unique`);
    const t = H.humanSolve(m, { trials: false });
    assert.ok(t.solved, `${p.id} human-solvable`);
    assert.equal(t.steps.filter((s) => s.rule.startsWith("trial")).length, 0);
  }
  assert.ok(made >= 3);
});

test("watch: live checks stay silent on shipped solutions and partial ones", () => {
  for (const list of Object.values(PACKS.sasquatch)) for (const p of list) {
    const m = W.buildModel(p), marks = new Uint8Array(m.n);
    for (let i = 0; i < m.n; i++) if (m.open[i] && !p.solution.includes(i)) marks[i] = 1;
    assert.deepEqual(liveCheck(p, new Uint8Array(m.n)), [], `${p.id} empty board`);
    p.solution.slice(0, 2).forEach((i) => (marks[i] = 2));
    assert.deepEqual(liveCheck(p, marks), [], `${p.id} partial`);
    p.solution.forEach((i) => (marks[i] = 2));
    assert.deepEqual(liveCheck(p, marks), [], `${p.id} solved`);
  }
});

test("towers: a lonely tower turns; twins are joined straight; no third tower", () => {
  // 3×5 bay, towers at (1,1) and (1,3): nothing else in their column, so they pair along the row.
  const L = layout(3, 5, 0, 4);
  const m = buildModel({ rows: 3, cols: 5, start: 0, end: 4, cells: ".".repeat(15), towers: [6, 8] });
  const st = initState(m);
  assert.notEqual(propagate(m, st), "contra");
  assert.equal(st.e[L.hIdx(1, 1)], ON, "the span between the twins is road");
  assert.equal(st.e[L.hIdx(1, 2)], ON);
  assert.equal(st.e[L.vIdx(0, 1)], OFF, "towers run straight");
  // A third tower on the same row can't share the stretch.
  const m3 = buildModel({ rows: 3, cols: 5, start: 0, end: 4, cells: ".".repeat(15), towers: [5, 7, 9] });
  assert.equal(solve(m3).count, 0);
});
