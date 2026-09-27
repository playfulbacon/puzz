// Real-time rule checks: never fire on a correct board, always fire on a real contradiction.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PACKS } from "../site/data/puzzles.js";
import { layout } from "../core/road/engine.js";
import { layout as tlayout, buildModel as tmodel, levelTurn } from "../core/tracks/engine.js";
import * as road from "../core/road/diagnose.js";
import * as tracks from "../core/tracks/diagnose.js";

const B = [1, 2, 4, 8];
const piecesOf = (L, edges, n) => {
  const c = new Array(n).fill(0);
  for (const ed of edges) { const [a, b] = L.ends[ed]; for (let d = 0; d < 4; d++) { if (L.cellEdges[a][d] === ed) c[a] |= B[d]; if (b >= 0 && L.cellEdges[b][d] === ed) c[b] |= B[d]; } }
  return c;
};

test("road: no live warnings on any shipped solution, or on its partial halves", () => {
  for (const id of ["spans", "lanes", "fog", "sasquatch"]) for (const list of Object.values(PACKS[id])) for (const p of list) {
    const L = layout(p.rows, p.cols, p.start, p.end), c = piecesOf(L, p.solution, L.n);
    c[L.S] |= 8; c[L.T] |= 4;
    assert.deepEqual(road.liveCheck(p, c), [], p.id);
    const half = c.map((x, i) => (i % 2 ? x : 0)); // unfinished work is not an error
    assert.deepEqual(road.liveCheck(p, half), [], p.id + " half");
  }
});

test("road: a turn on open water and a piece pointing at × are flagged", () => {
  const p = { rows: 3, cols: 3, start: 1, end: 1, cells: ".........", rules: { waterStraight: true } };
  const c = new Array(9).fill(0);
  c[4] = 2 | 8; // ┌ in the middle of the water
  assert.match(road.liveCheck(p, c).map((x) => x.text).join(" "), /Spans can't bend/);
  const c2 = new Array(9).fill(0);
  c2[4] = 3; c2[5] = 16;
  assert.match(road.liveCheck(p, c2).map((x) => x.text).join(" "), /disagree/);
});

test("cable cars: no live warnings on shipped solutions; a turn on a slope is flagged", () => {
  for (const list of Object.values(PACKS.cablecar)) for (const p of list) {
    const L = tlayout(p.rows, p.cols);
    assert.deepEqual(tracks.liveCheck(p, piecesOf(L, p.solution, L.n)), [], p.id);
  }
  const p = PACKS.cablecar.gentle[0], m = tmodel(p), L = m.L;
  const i = [...Array(L.n).keys()].find((k) => !m.blocked[k] && m.endpoint[k] < 0 && L.nb(k, 1) >= 0 && L.nb(k, 3) >= 0 && !levelTurn(L, m.h, k, 1, 3));
  const c = new Array(L.n).fill(0); c[i] = 2 | 8;
  assert.match(tracks.liveCheck(p, c).map((x) => x.text).join(" "), /slope/);
});
