// Interactive Sasquatch board: tap a hiker to turn them (clockwise; right-click turns back), tap an
// open square to hide the Sasquatch there. Beams show what each hiker sees; squares no beam
// reaches sit in shadow.
import { geometry, defs, sky, floor, trees, beams, shadows, hikerSvg, sasquatchSvg, trailhead } from "../core/render/forest.js";
import { buildModel, initState, hideEngine, YES } from "../core/hide/engine.js";
import { makeHuman } from "../core/lib/human.js";
import { diagnose, liveCheck } from "../core/hide/diagnose.js";

const H = makeHuman(hideEngine);
const CYCLE = ["U", "R", "D", "L"];
const DIRS = ["L", "R", "U", "D"];

export function mountBoard(host, p, { saved = null, onChange = () => {}, onSolved = () => {}, onVerdict = null, onLive = null } = {}) {
  const g = geometry(p, 60); g.id = "fs" + p.seed;
  const { s } = g;
  const m = buildModel(p);
  const hikerCells = m.hikers.map((h) => h.at);
  const truth = p.solution.facing;
  const facing = saved?.facing && saved.facing.length === hikerCells.length ? saved.facing.slice() : hikerCells.map(() => null);
  let hidden = saved?.hidden ?? -1;
  const undo = [];
  let solved = false, hint = null, verdictShown = false;

  host.innerHTML = `<svg class="board live forest" viewBox="0 0 ${g.W} ${g.H}" xmlns="http://www.w3.org/2000/svg" role="application" aria-label="Sasquatch board: tap hikers to turn them, tap a square to hide the Sasquatch">
    ${defs(g.id)}${sky(p, g)}${floor(p, g)}<g class="shade-layer"></g><g class="beam-layer"></g>${trees(p, g)}<g class="people"></g><g class="sq-layer"></g><g class="error-layer"></g><g class="hint-layer"></g>${trailhead(g)}
  </svg>`;
  const svg = host.querySelector("svg");
  const layer = (c) => svg.querySelector("." + c);

  const facingMap = () => Object.fromEntries(hikerCells.map((c, k) => [c, facing[k]]));
  function draw() {
    const b = beams(p, g, facingMap());
    layer("beam-layer").innerHTML = b.svg;
    layer("shade-layer").innerHTML = shadows(p, g, b.seen);
    layer("people").innerHTML = hikerCells.map((c, k) => hikerSvg(g.cx(c % p.cols), g.cy(Math.floor(c / p.cols)), s, facing[k], p.numbers[c], p.seed * 13 + k)).join("");
    layer("sq-layer").innerHTML = hidden >= 0 ? sasquatchSvg(g.cx(hidden % p.cols), g.cy(Math.floor(hidden / p.cols)), s, solved ? "waving" : "") : "";
    const problems = solved ? [] : liveCheck(p, facing, hidden);
    layer("error-layer").innerHTML = problems.flatMap((x) => x.cells).filter((c, i, a) => a.indexOf(c) === i)
      .map((c) => `<rect class="live-error" x="${(c % p.cols) * s + 3}" y="${g.Y0 + Math.floor(c / p.cols) * s + 3}" width="${s - 6}" height="${s - 6}" rx="10"/>`).join("");
    onLive?.(problems);
  }
  const state = () => ({ facing: facing.slice(), hidden });
  const isSolved = () => hidden === p.solution.spot && facing.every((d, k) => d === truth[k]);
  function commit(ch) {
    if (!ch.length) return;
    undo.push(ch); clearHint(); draw(); onChange(state());
    evaluate();
  }
  // Once every hiker is turned and the Sasquatch is placed, say whether it worked and why not.
  function evaluate() {
    if (solved) return;
    if (isSolved()) { solved = true; svg.classList.add("solved"); draw(); onSolved(); onVerdict?.({ ok: true }); return; }
    if (hidden >= 0 && facing.every(Boolean)) {
      const reasons = diagnose(p, facing, hidden);
      if (!reasons.length) reasons.push({ text: "Something doesn't match yet. Try Check to see what.", cells: [] });
      layer("hint-layer").innerHTML = cellsSvg(reasons.flatMap((r) => r.cells), "mistake-cell");
      verdictShown = true;
      onVerdict?.({ ok: false, reasons });
    } else if (verdictShown) { verdictShown = false; onVerdict?.(null); }
  }
  const setFacing = (k, v, ch) => { if (facing[k] === v) return; ch.push(["f", k, facing[k], v]); facing[k] = v; };
  const setHidden = (c, ch) => { if (hidden === c) return; ch.push(["s", 0, hidden, c]); hidden = c; };

  const toLocal = (ev) => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const cellAt = ({ x, y }) => { const c = Math.floor(x / s), r = Math.floor((y - g.Y0) / s); return r < 0 || c < 0 || r >= p.rows || c >= p.cols ? -1 : r * p.cols + c; };
  const tap = (ev, back) => {
    if (solved) return;
    const c = cellAt(toLocal(ev)), ch = [];
    if (c < 0) return;
    const k = hikerCells.indexOf(c);
    if (k >= 0) {
      const order = [null, ...CYCLE], i = order.indexOf(facing[k]);
      setFacing(k, order[(i + (back ? order.length - 1 : 1)) % order.length], ch);
    } else if (p.cells[c] === ".") setHidden(hidden === c ? -1 : c, ch);
    commit(ch);
  };
  svg.addEventListener("click", (ev) => tap(ev, false));
  svg.addEventListener("contextmenu", (ev) => { ev.preventDefault(); tap(ev, true); });

  // ---------------------------------------------------------------- hints
  function clearHint() { hint = null; layer("hint-layer").innerHTML = ""; }
  const cellsSvg = (cells, cls) => [...new Set(cells)].map((c) => `<rect class="${cls}" x="${(c % p.cols) * s + 3}" y="${g.Y0 + Math.floor(c / p.cols) * s + 3}" width="${s - 6}" height="${s - 6}" rx="10"/>`).join("");
  const mistakes = () => {
    const bad = hikerCells.filter((c, k) => facing[k] && facing[k] !== truth[k]);
    if (hidden >= 0 && hidden !== p.solution.spot) bad.push(hidden);
    return bad;
  };
  const api = {
    svg,
    get solved() { return solved; },
    undo() {
      if (solved) return;
      const ch = undo.pop(); if (!ch) return;
      for (let i = ch.length - 1; i >= 0; i--) { const [t, k, prev] = ch[i]; if (t === "f") facing[k] = prev; else hidden = prev; }
      clearHint(); draw(); onChange(state()); evaluate();
    },
    clear() {
      if (solved) return;
      const ch = [];
      facing.forEach((d, k) => setFacing(k, null, ch));
      setHidden(-1, ch);
      if (ch.length) { undo.push(ch); clearHint(); draw(); onChange(state()); evaluate(); }
    },
    check() { clearHint(); const bad = mistakes(); layer("hint-layer").innerHTML = cellsSvg(bad, "mistake-cell"); return bad.length; },
    hint() {
      clearHint();
      if (solved) return null;
      const bad = mistakes();
      if (bad.length) { layer("hint-layer").innerHTML = cellsSvg(bad, "mistake-cell"); return { kind: "mistake", count: bad.length }; }
      // Work from the correct facings; keep deducing until a hiker's facing is settled.
      const st = initState(m);
      facing.forEach((d, k) => { if (d) st.dom[k] = 1 << DIRS.indexOf(d); });
      let first = null;
      for (let step = 0; step < 30; step++) {
        const settled = st.dom.findIndex((x, k) => !facing[k] && [1, 2, 4, 8].includes(x));
        if (settled >= 0) {
          hint = { k: settled, dir: DIRS[[1, 2, 4, 8].indexOf(st.dom[settled])] };
          break;
        }
        if (st.dom.every((x) => [1, 2, 4, 8].includes(x))) { hint = { spot: p.solution.spot }; break; }
        const nx = H.nextDeduction(m, st);
        if (!nx || nx.contra || !nx.d) break;
        first = first || nx.d;
        hideEngine.applyDeduction(st, nx.d);
      }
      if (!hint) return null;
      if (hint.spot != null) {
        layer("hint-layer").innerHTML = cellsSvg([hint.spot], "hint-cell");
        return { kind: "step", rule: "spot", tier: 1, count: 1 };
      }
      const d = first || { rule: "watch", tier: 1, focus: [] };
      layer("hint-layer").innerHTML = cellsSvg([...new Set([...(d.focus || []), hikerCells[hint.k]])], "hint-cell");
      return { kind: "step", rule: d.rule, tier: d.tier, count: 1 };
    },
    applyHint() {
      if (!hint) return;
      const ch = [];
      if (hint.spot != null) setHidden(hint.spot, ch); else setFacing(hint.k, hint.dir, ch);
      commit(ch);
    },
  };
  draw();
  if (isSolved()) { solved = true; svg.classList.add("solved", "instant"); draw(); }
  return api;
}
