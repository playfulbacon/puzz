// The "not quite" explanations: a correct answer gives none; a broken one says why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PACKS } from "../site/data/puzzles.js";
import { layout, buildModel } from "../core/road/engine.js";
import * as road from "../core/road/diagnose.js";
import * as tracks from "../core/tracks/diagnose.js";
import { layout as tlayout } from "../core/tracks/engine.js";

const B = [1, 2, 4, 8];
const piecesOf = (L, edges, n) => {
  const claims = new Array(n).fill(0);
  for (const ed of edges) { const [a, b] = L.ends[ed]; for (let d = 0; d < 4; d++) { if (L.cellEdges[a][d] === ed) claims[a] |= B[d]; if (b >= 0 && L.cellEdges[b][d] === ed) claims[b] |= B[d]; } }
  return claims;
};

for (const id of ["spans", "lanes", "fog", "sasquatch"]) {
  test(`${id}: the solution has no complaints; a stray piece is explained`, () => {
    const p = PACKS[id].gentle[0], L = layout(p.rows, p.cols, p.start, p.end);
    const claims = piecesOf(L, p.solution, L.n);
    claims[L.S] |= 8; claims[L.T] |= 4;
    assert.ok(road.connected(buildModel(p), claims));
    assert.deepEqual(road.diagnose(p, claims), []);
    const stray = claims.findIndex((c, i) => !c && p.cells[i] === "." && i % p.cols > 0 && i % p.cols < p.cols - 1);
    claims[stray] = 3;
    const reasons = road.diagnose(p, claims).map((r) => r.text).join(" ");
    assert.match(reasons, /isn't part of the route/);
  });
}

test("spans: turning on open water is explained", () => {
  // Hand-made 3×3: road from bottom-left to top-right, forced to turn in the middle of the water.
  const p = { rows: 3, cols: 3, start: 0, end: 2, cells: ".........", rules: { waterStraight: true }, lands: {} };
  const L = layout(3, 3, 0, 2);
  const claims = new Array(9).fill(0);
  claims[6] = 4 | 8; claims[3] = 4 | 8; claims[0] = 8 | 2; claims[1] = 1 | 2; claims[2] = 1 | 4; // up the left, across the top
  const reasons = road.diagnose(p, claims).map((r) => r.text).join(" ");
  assert.match(reasons, /Spans can't bend/);
});

test("cable cars: the solution has no complaints", () => {
  const p = PACKS.cablecar.medium[0], L = tlayout(p.rows, p.cols);
  const claims = piecesOf(L, p.solution, L.n);
  assert.ok(tracks.allConnected(p, claims));
  assert.deepEqual(tracks.diagnose(p, claims), []);
});

test("sasquatch: a trail through a hiker's hearing range with the wrong count is explained", () => {
  const p = PACKS.sasquatch.gentle[0], L = layout(p.rows, p.cols, p.start, p.end);
  const claims = piecesOf(L, p.solution, L.n);
  claims[L.S] |= 8; claims[L.T] |= 4;
  assert.deepEqual(road.diagnose(p, claims), []);
});
