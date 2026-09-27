// node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildModel, initState, solve, checkSolution, propagate, layout, ON, OFF } from "../core/road/engine.js";
import { humanSolve } from "../core/road/human.js";
import { VARIANTS } from "../core/variants/index.js";
import { PACKS } from "../site/data/puzzles.js";

const edgesOf = (p) => {
  const L = layout(p.rows, p.cols, p.start, p.end), e = new Int8Array(L.E);
  e[L.PS] = ON; e[L.PN] = ON;
  for (const ed of p.solution) e[ed] = ON;
  return e;
};

test("straight rule carries a span from the shore across open water", () => {
  // 3×3 bay, road enters bottom-middle and must leave top-middle; all water, so it runs straight up.
  const spec = { rows: 3, cols: 3, start: 1, end: 1, cells: ".........", rules: { waterStraight: true } };
  const m = buildModel(spec), st = initState(m);
  assert.equal(propagate(m, st), "ok");
  const L = m.L;
  assert.equal(st.e[L.vIdx(0, 1)], ON);
  assert.equal(st.e[L.vIdx(1, 1)], ON);
  assert.equal(st.e[L.hIdx(1, 0)], OFF);
  assert.equal(solve(m).count, 1);
});

test("a road can't turn on water but can on land", () => {
  const water = { rows: 3, cols: 3, start: 0, end: 2, cells: ".........", rules: { waterStraight: true } };
  assert.equal(solve(buildModel(water)).count, 0);
  const land = { rows: 3, cols: 3, start: 0, end: 2, cells: "......o.o", rules: { waterStraight: true } };
  assert.equal(solve(buildModel(land)).count, 1);
});

test("dead-end pockets are never entered", () => {
  // The right-hand block joins the rest of the bay through a single gap, so a road could go in but
  // never come back out: the connection rule rules it out before any search.
  const spec = { rows: 3, cols: 4, start: 0, end: 0, cells: ".#...#.....#", rules: {} };
  const m = buildModel(spec), st = initState(m), L = m.L;
  assert.equal(propagate(m, st), "ok");
  assert.equal(st.e[L.hIdx(2, 1)], OFF);
  assert.equal(st.e[L.vIdx(0, 0)], ON);
  assert.equal(solve(m).count, 1);
});

for (const id of Object.keys(VARIANTS).filter((k) => ["road", "trail"].includes(VARIANTS[k].family))) {
  test(`${id}: generated puzzles are unique and solved by the human solver`, () => {
    let made = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const p = VARIANTS[id].generate({ rows: 7, cols: 7, seed, addBack: 1 });
      if (!p) continue;
      made++;
      const m = buildModel(p);
      assert.ok(checkSolution(m, edgesOf(p)), `${p.id} solution valid`);
      assert.equal(solve(m).count, 1, `${p.id} unique`);
      assert.ok(humanSolve(m).solved, `${p.id} human-solvable`);
    }
    assert.ok(made >= 3, `${id}: at least half the seeds produce a puzzle`);
  });
}

test("every shipped puzzle is valid and unique", async () => {
  const T = await import("../core/tracks/engine.js");
  for (const [id, levels] of Object.entries(PACKS)) for (const [level, list] of Object.entries(levels)) {
    assert.ok(list.length > 0, `${id}/${level} is not empty`);
    for (const p of list) {
      const family = VARIANTS[id].family;
      if (family === "road" || family === "trail") {
        const m = buildModel(p);
        assert.ok(checkSolution(m, edgesOf(p)), `${p.id} valid`);
        assert.equal(solve(m, { budget: 200000 }).count, 1, `${p.id} unique`);
      } else if (family === "tracks") {
        const m = T.buildModel(p), e = new Uint8Array(m.L.E);
        for (const ed of p.solution) e[ed] = 1;
        assert.ok(T.checkSolution(m, e), `${p.id} valid`);
        assert.equal(T.solve(m, { budget: 200000 }).count, 1, `${p.id} unique`);
      }
    }
  }
});
