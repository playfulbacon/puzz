// Cable Cars (tracks engine).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "../core/tracks/engine.js";
import { generate as genTracks } from "../core/tracks/generate.js";
import { makeHuman } from "../core/lib/human.js";

test("tracks: a line can't turn on a slope", () => {
  // A at top-left, A at bottom-right of a 2×2: the only route turns at a corner.
  const base = { rows: 2, cols: 2, cells: "A..A" };
  const level = T.buildModel({ ...base, heights: "0000" });
  assert.equal(T.solve(level).count, 2); // two corners to turn at
  const sloped = T.buildModel({ ...base, heights: "0100" }); // top-right corner not level
  assert.equal(T.solve(sloped).count, 1);
});

test("tracks: two lines may cross straight over each other, never themselves", () => {
  // A across the middle row, B down the middle column: they must cross in the centre.
  const spec = { rows: 3, cols: 3, cells: ".B.A.A.B.", heights: "111111111" };
  const m = T.buildModel(spec);
  const res = T.solve(m);
  assert.equal(res.count, 1);
  const L = m.L, centre = 4;
  assert.ok(L.cellEdges[centre].every((ed) => res.solutions[0][ed] === 1));
});

test("tracks: a cable car fixes a straight piece", () => {
  const m = T.buildModel({ rows: 3, cols: 3, cells: "A.......A", heights: "000000000", cars: { 4: "H" } });
  const st = T.initState(m);
  assert.equal(st.e[m.L.cellEdges[4][T.DU]], T.OFF);
  assert.equal(st.e[m.L.cellEdges[4][T.DD]], T.OFF);
});

for (const [name, gen, E] of [["cable cars", genTracks, T.tracksEngine]]) {
  test(`${name}: generated puzzles are unique and solved by the human solver`, () => {
    const H = makeHuman(E);
    let made = 0;
    for (let seed = 1; seed <= 24 && made < 4; seed++) {
      const p = gen({ rows: 6, cols: 6, seed, addBack: 2 });
      if (!p) continue;
      made++;
      const m = T.buildModel(p);
      assert.equal(T.solve(m).count, 1, `${p.id} unique`);
      assert.ok(H.humanSolve(m).solved, `${p.id} human-solvable`);
    }
    assert.ok(made >= 2, `${name}: generator produces puzzles`);
  });
}
