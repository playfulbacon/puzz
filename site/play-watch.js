// Sasquatch board: tap a square once for × (nobody hides here), twice to hide a Sasquatch there,
// three times to clear. Long-press or right-click goes the other way round. Squares in a hiker's
// beam can't be used.
import { geometry, defs, patches, creeks, hikersLayer, ground, family } from "../core/render/woods.js";
import { sky, floor, trees } from "../core/render/forest.js";
import { buildModel, initState, watchEngine, SQ, NO, UNK } from "../core/watch/engine.js";
import { makeHuman } from "../core/lib/human.js";
import { diagnose, liveCheck, MX, MSQ } from "../core/watch/diagnose.js";

const H = makeHuman(watchEngine);

export function mountBoard(host, p, { saved = null, onChange = () => {}, onSolved = () => {}, onVerdict = null, onLive = null } = {}) {
  const g = geometry(p, 60); g.id = "wd" + p.seed;
  const { s } = g;
  const m = buildModel(p);
  const truth = new Set(p.solution);
  const marks = new Uint8Array(m.n);
  if (saved && saved.length === m.n) saved.forEach((v, i) => { if (m.open[i]) marks[i] = v; });
  const undo = [];
  let solved = false, hint = null, verdictShown = false;
  const h = hikersLayer(p, g);

  host.innerHTML = `<svg class="board live forest" viewBox="0 0 ${g.W} ${g.H}" xmlns="http://www.w3.org/2000/svg" role="application" aria-label="Sasquatch board: tap a square to cross it out or hide a Sasquatch there">
    ${defs(g.id)}${sky(p, g)}${floor(p, g)}${patches(p, g)}${h.beams}${creeks(p, g)}${trees(p, g)}
    <g class="marks"></g>${h.people}<g class="sq-layer"></g><g class="error-layer"></g><g class="hint-layer"></g>${ground(g)}
  </svg>`;
  const svg = host.querySelector("svg");
  const layer = (c) => svg.querySelector("." + c);
  const rect = (i, cls) => `<rect class="${cls}" x="${(i % p.cols) * s + 3}" y="${g.Y0 + Math.floor(i / p.cols) * s + 3}" width="${s - 6}" height="${s - 6}" rx="10"/>`;
  const cellsSvg = (cells, cls) => [...new Set(cells)].map((i) => rect(i, cls)).join("");

  function draw() {
    let x = "";
    const k = s * 0.13;
    for (let i = 0; i < m.n; i++) if (marks[i] === MX) {
      const cx = g.cx(i % p.cols), cy = g.cy(Math.floor(i / p.cols));
      x += `M${cx - k} ${cy - k}L${cx + k} ${cy + k}M${cx + k} ${cy - k}L${cx - k} ${cy + k}`;
    }
    layer("marks").innerHTML = `<path d="${x}" stroke="#F4EBD6" stroke-opacity="0.8" stroke-width="3" stroke-linecap="round"/>`;
    const sq = []; marks.forEach((v, i) => { if (v === MSQ) sq.push(i); });
    layer("sq-layer").innerHTML = family(p, g, sq, solved ? "waving" : "");
    const problems = solved ? [] : liveCheck(p, marks);
    layer("error-layer").innerHTML = cellsSvg(problems.flatMap((q) => q.cells), "live-error");
    onLive?.(problems);
  }
  const state = () => Array.from(marks);
  const sqCells = () => { const out = []; marks.forEach((v, i) => { if (v === MSQ) out.push(i); }); return out; };
  const isSolved = () => { const sq = sqCells(); return sq.length === truth.size && sq.every((i) => truth.has(i)); };
  function evaluate() {
    if (solved) return;
    if (isSolved()) { solved = true; svg.classList.add("solved"); clearHint(); draw(); onSolved(); onVerdict?.({ ok: true }); return; }
    // Every patch holds a Sasquatch: say whether it works, and why not.
    const covered = new Set(sqCells().map((i) => m.region[i]));
    if (covered.size === m.regions.length) {
      const reasons = diagnose(p, marks);
      if (!reasons.length) reasons.push({ text: "Something doesn't match yet. Try Check to see what.", cells: [] });
      layer("hint-layer").innerHTML = cellsSvg(reasons.flatMap((r) => r.cells), "mistake-cell");
      verdictShown = true;
      onVerdict?.({ ok: false, reasons });
    } else if (verdictShown) { verdictShown = false; onVerdict?.(null); }
  }
  function commit(ch) {
    if (!ch.length) return;
    undo.push(ch); clearHint(); draw(); onChange(state()); evaluate();
  }
  const set = (i, v, ch) => { if (marks[i] === v) return; ch.push([i, marks[i], v]); marks[i] = v; };

  const toLocal = (ev) => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const cellAt = ({ x, y }) => { const c = Math.floor(x / s), r = Math.floor((y - g.Y0) / s); return r < 0 || c < 0 || r >= p.rows || c >= p.cols ? -1 : r * p.cols + c; };
  const tap = (ev, back) => {
    if (solved) return;
    const i = cellAt(toLocal(ev));
    if (i < 0 || !m.open[i]) return;
    const ch = [];
    set(i, (marks[i] + (back ? 2 : 1)) % 3, ch);
    commit(ch);
  };
  let pressTimer = null, longPressed = false;
  svg.addEventListener("pointerdown", (ev) => {
    longPressed = false;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => { longPressed = true; tap(ev, true); }, 450);
  });
  const cancel = () => clearTimeout(pressTimer);
  svg.addEventListener("pointerup", cancel); svg.addEventListener("pointerleave", cancel); svg.addEventListener("pointercancel", cancel);
  svg.addEventListener("click", (ev) => { if (longPressed) { longPressed = false; return; } tap(ev, false); });
  svg.addEventListener("contextmenu", (ev) => { ev.preventDefault(); if (!longPressed) tap(ev, true); });

  // ---------------------------------------------------------------- hints
  function clearHint() { hint = null; layer("hint-layer").innerHTML = ""; }
  const mistakes = () => {
    const bad = [];
    for (let i = 0; i < m.n; i++) {
      if (marks[i] === MSQ && !truth.has(i)) bad.push(i);
      if (marks[i] === MX && truth.has(i)) bad.push(i);
    }
    return bad;
  };
  const api = {
    svg,
    get solved() { return solved; },
    undo() {
      if (solved) return;
      const ch = undo.pop(); if (!ch) return;
      for (let k = ch.length - 1; k >= 0; k--) { const [i, prev] = ch[k]; marks[i] = prev; }
      clearHint(); draw(); onChange(state()); evaluate();
    },
    clear() {
      if (solved) return;
      const ch = [];
      for (let i = 0; i < m.n; i++) set(i, 0, ch);
      if (ch.length) { undo.push(ch); clearHint(); draw(); onChange(state()); evaluate(); }
    },
    check() { clearHint(); const bad = mistakes(); layer("hint-layer").innerHTML = cellsSvg(bad, "mistake-cell"); return bad.length; },
    hint() {
      clearHint();
      if (solved) return null;
      const bad = mistakes();
      if (bad.length) { layer("hint-layer").innerHTML = cellsSvg(bad, "mistake-cell"); return { kind: "mistake", count: bad.length }; }
      const st = initState(m);
      for (let i = 0; i < m.n; i++) if (marks[i] === MSQ) st.v[i] = SQ; else if (marks[i] === MX) st.v[i] = NO;
      const nx = H.nextDeduction(m, st, { trials: false });
      if (!nx || nx.contra || !nx.d) {
        // Everything deducible is marked; only the obvious remains (e.g. crossing out a finished patch).
        const left = []; for (let i = 0; i < m.n; i++) if (m.open[i] && !marks[i]) left.push(i);
        if (!left.length) return null;
        hint = { set: left.map((i) => [i, truth.has(i) ? MSQ : MX]), focus: left };
        layer("hint-layer").innerHTML = cellsSvg(left, "hint-cell");
        return { kind: "step", rule: "patch", tier: 1, count: left.length };
      }
      const targets = nx.d.set.filter(([i]) => st.v[i] === UNK);
      hint = { set: targets.map(([i, v]) => [i, v === SQ ? MSQ : MX]) };
      layer("hint-layer").innerHTML = cellsSvg(nx.d.focus || [], "hint-focus") + cellsSvg(targets.map(([i]) => i), "hint-cell");
      return { kind: "step", rule: nx.d.rule, tier: nx.d.tier, count: targets.length };
    },
    applyHint() {
      if (!hint) return;
      const ch = [];
      for (const [i, v] of hint.set) set(i, v, ch);
      commit(ch);
    },
  };
  draw();
  if (isSolved()) { solved = true; svg.classList.add("solved", "instant"); draw(); }
  return api;
}
