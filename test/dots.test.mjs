// Marking a dot on every road square of a shipped puzzle must join up into exactly its solution.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PACKS } from "../site/data/puzzles.js";
import { resolveDots, solutionPieces, DOT } from "../site/pieces.js";
import { layout, buildModel } from "../core/road/engine.js";
import { buildModel as tmodel } from "../core/tracks/engine.js";

test("golden gate: dots on every road square resolve to the solution", () => {
  for (const id of ["spans", "lanes", "fog", "sasquatch"]) for (const list of Object.values(PACKS[id])) for (const p of list) {
    const m = buildModel(p), L = m.L;
    const portBits = (i) => (i === L.S ? 8 : 0) | (i === L.T ? 4 : 0);
    const sol = solutionPieces(L.n, L.cellEdges, p.solution, portBits);
    const user = Array.from(sol, (x) => (x ? DOT : 0));
    const { claims, conflicts } = resolveDots(user, { nb: L.nb, blocked: (i) => !!m.blocked[i], portBits });
    assert.deepEqual(conflicts, [], p.id);
    assert.deepEqual(Array.from(claims), Array.from(sol), p.id);
  }
});

test("cable cars: dots on every track square resolve to the solution", () => {
  for (const list of Object.values(PACKS.cablecar)) for (const p of list) {
    const m = tmodel(p), L = m.L;
    const sol = solutionPieces(L.n, L.cellEdges, p.solution);
    const car = (i) => (p.cars?.[i] ? (p.cars[i] === "H" ? 3 : 12) : null);
    const user = Array.from(sol, (x, i) => (car(i) ?? (x && m.endpoint[i] < 0 ? DOT : 0)));
    const cfg = {
      nb: L.nb, blocked: (i) => !!m.blocked[i], auto: (i) => m.endpoint[i] >= 0, ends: (i) => m.endpoint[i] >= 0,
      crossOK: (i) => m.endpoint[i] < 0 && [0, 1, 2, 3].every((d) => { const j = L.nb(i, d); return j >= 0 && !m.blocked[j]; }),
    };
    const { claims, conflicts } = resolveDots(user, cfg);
    assert.deepEqual(conflicts, [], p.id);
    assert.deepEqual(Array.from(claims), Array.from(sol), p.id);
  }
});
