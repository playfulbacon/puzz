#!/usr/bin/env node
// Generate the puzzle packs the site ships with.
//   node cli/generate.mjs [--variants spans,lanes,fog] [--seeds 40] [--per-level 6] [--out site/data/puzzles.js]
// Variants not listed keep whatever the output file already holds.
// Samples many seeds across sizes and clue add-back levels, buckets the results into three levels by
// measured band, and keeps the best of each by the quality gates (research/generation-heuristics.md).
import { writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { VARIANTS, VARIANT_ORDER } from "../core/variants/index.js";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith("--") ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []));
const variants = (args.variants || VARIANT_ORDER.join(",")).split(",");
const seeds = +(args.seeds || 40);
const perLevel = +(args["per-level"] || 6);
const out = args.out || "site/data/puzzles.js";

// [size, clue add-back levels, seed multiplier]. Sasquatch keeps ~1 seed in 4, so it samples more.
const PLAN = {
  spans: [["7x7", [0, 3]], ["8x8", [0, 2]], ["9x9", [0]], ["10x10", [0]]],
  lanes: [["7x7", [0, 2]], ["8x8", [0]], ["9x9", [0]], ["10x10", [0]]],
  fog: [["7x7", [0, 3]], ["8x8", [0, 2]], ["9x9", [0]], ["10x10", [0]]],
  cablecar: [["6x6", [0, 2, 4]], ["7x7", [0, 2, 4]], ["8x8", [0, 3], 0.5]],
  sasquatch: [["6x6", [0, 2]], ["7x7", [0, 2]], ["8x8", [0]], ["9x9", [0], 1.5]],
};

// Higher is better: gates passed first, then the shape of the solve.
function quality(p) {
  const r = p.rating, g = p.gates;
  const passed = Object.entries(g).filter(([k, v]) => k !== "pass" && v).length;
  return passed * 10 + Math.min(r.breakthroughs, 3) * 2 + Math.min(r.variety, 8) + r.finish * 4 - Math.max(0, r.stall - 4)
    - (r.lookaheads || 0) * 6 + Math.min(r.reasoning || 0, 12);
}

// Keep packs for variants not being regenerated.
let packs = {}, stats = {};
if (existsSync(out)) {
  const prev = await import(pathToFileURL(resolve(out)).href);
  packs = { ...prev.PACKS }; stats = { ...prev.STATS };
}
for (const id of variants) {
  const v = VARIANTS[id];
  const all = [];
  const t0 = Date.now();
  let tried = 0;
  const failures = await import(`../core/${v.family === "tracks" ? "tracks/generate" : v.family === "watch" ? "watch/generate" : "variants/common"}.js`).then((mod) => mod.failures);
  for (const k of Object.keys(failures)) delete failures[k];
  for (const [size, adds, mul = 1] of PLAN[id]) {
    const [rows, cols] = size.split("x").map(Number);
    for (const addBack of adds) for (let seed = 1; seed <= Math.round(seeds * mul); seed++) {
      tried++;
      const p = v.generate({ rows, cols, seed, addBack });
      if (p) all.push(p);
    }
    process.stderr.write(`${id} ${size} done, ${all.length} puzzles so far\n`);
  }
  // De-duplicate identical grids (add-back can reproduce the minimal puzzle).
  const seen = new Set(), uniq = [];
  for (const p of all) { const key = p.cells + JSON.stringify(p.lands || p.ships || p.fogs || p.hikers || p.numbers || p.cars || "") + (p.heights || "") + (p.regions || "") + (p.towers || ""); if (!seen.has(key)) { seen.add(key); uniq.push(p); } }
  // Levels are cut by effort (what a person spends finding each move, research/generation-heuristics.md
  // §10), not by the single hardest step: Gentle from the easiest third, Medium from the middle, Hard
  // from the top quarter. Every level caps look-aheads at two (Fog and Sasquatch never need one).
  const byQuality = (a, b) => (b.gates.pass - a.gates.pass) || (quality(b) - quality(a)) || (a.rows * a.cols - b.rows * b.cols);
  // One puzzle per base seed across all levels (add-back variants of a seed look alike).
  const usedBase = new Set();
  const baseOf = (p) => `${p.rows}x${p.cols}-${p.seed}`;
  const take = (pool, cmp = byQuality) => {
    const out = [];
    for (const p of pool.sort(cmp)) {
      if (out.length >= perLevel) break;
      if (usedBase.has(baseOf(p))) continue;
      usedBase.add(baseOf(p)); out.push(p);
    }
    return out;
  };
  const eligible = uniq.filter((p) => (p.rating.lookaheads || 0) <= 2).sort((a, b) => a.rating.effort - b.rating.effort);
  const cut = (x) => Math.round(eligible.length * x);
  const hard = take(eligible.slice(cut(0.75)), (a, b) => b.rating.effort - a.rating.effort);
  const gentle = take(eligible.slice(0, cut(0.3)), (a, b) => (a.rows * a.cols - b.rows * b.cols) || byQuality(a, b));
  const medium = take(eligible.slice(cut(0.4), cut(0.72)));
  const order = (list) => list.sort((a, b) => a.rating.effort - b.rating.effort);
  packs[id] = { gentle: order(gentle), medium: order(medium), hard: order(hard) };
  const bands = {}; uniq.forEach((p) => { bands[p.rating.band] = (bands[p.rating.band] || 0) + 1; });
  const gateFails = {}; uniq.forEach((p) => Object.entries(p.gates).forEach(([k, ok]) => { if (!ok && k !== "pass") gateFails[k] = (gateFails[k] || 0) + 1; }));
  stats[id] = { tried, generated: all.length, unique: uniq.length, passing: uniq.filter((p) => p.gates.pass).length, bands, gateFails, failures: { ...failures }, seconds: Math.round((Date.now() - t0) / 1000),
    picked: Object.fromEntries(Object.entries(packs[id]).map(([l, ps]) => [l, ps.map((p) => ({ id: p.id, effort: p.rating.effort, pass: p.gates.pass }))])) };
  process.stderr.write(`${id}: ${JSON.stringify(stats[id])}\n`);
}

const body = `// Generated by cli/generate.mjs on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.\nexport const PACKS = ${JSON.stringify(packs)};\nexport const STATS = ${JSON.stringify(stats, null, 1)};\n`;
writeFileSync(out, body);
process.stderr.write(`wrote ${out}\n`);
