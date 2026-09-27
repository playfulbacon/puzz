// Interactive Cable Cars board: drag between squares to lay track, tap a gap to mark it ×.
// Rails take a line's colour as soon as they connect to its turntable.
import { geometry, defs, bay, terrain, fixtures, railsSvg, ridingCars, LINE_COLORS } from "../core/render/cable.js";
import { buildModel, initState, ON, OFF, OPP } from "../core/tracks/engine.js";
import { makeHuman } from "../core/lib/human.js";
import { tracksEngine } from "../core/tracks/engine.js";

const H = makeHuman(tracksEngine);
const NEUTRAL = "#7C7268";

export function mountBoard(host, p, { saved = null, onChange = () => {}, onSolved = () => {} } = {}) {
  const g = geometry(p, 60); g.id = "cc" + p.seed;
  const { L, s } = g;
  const m = buildModel(p);
  const init = initState(m);
  const sol = new Set(p.solution);
  const st = saved && saved.length === L.E ? Int8Array.from(saved) : new Int8Array(L.E);
  const undo = [];
  let solved = false, hint = null;

  host.innerHTML = `<svg class="board live" viewBox="0 0 ${g.W} ${g.H}" xmlns="http://www.w3.org/2000/svg" role="application" aria-label="Cable Cars board: drag between squares to lay track">
    ${defs(g.id, g)}${bay(p, g)}${terrain(p, g)}
    <g class="marks"></g><g class="rails"></g>${fixtures(p, g)}<g class="riders"></g><g class="hint-layer"></g>
    <rect x="0" y="${g.Yb}" width="${g.W}" height="${g.H - g.Yb}" fill="#4A423A"/>
    <text x="${s * 0.25}" y="${g.Yb + (g.H - g.Yb) / 2}" class="shore-label light">MARKET STREET</text>
  </svg>`;
  const svg = host.querySelector("svg");
  const marks = svg.querySelector(".marks"), rails = svg.querySelector(".rails"), riders = svg.querySelector(".riders"), hintLayer = svg.querySelector(".hint-layer");
  const blockedEdge = (ed) => init.e[ed] === OFF && L.ends[ed].some((c) => m.blocked[c]);

  // Colour drawn track by flood-filling from each turntable through square pairings (straight through crossings).
  function colourGroups() {
    const colour = new Map();
    const on = (i, d) => { const ed = L.cellEdges[i][d]; return ed >= 0 && st[ed] === 1; };
    m.pairs.forEach(([a], k) => {
      for (const start of m.pairs[k]) {
        const q = [[start, -1]];
        while (q.length) {
          const [cur, from] = q.pop();
          const dirs = [0, 1, 2, 3].filter((d) => on(cur, d));
          let next = [];
          if (from < 0) next = dirs;
          else if (dirs.length === 4) next = [OPP[from]];
          else if (dirs.length === 2) next = dirs.filter((d) => d !== from);
          for (const d of next) {
            const ed = L.cellEdges[cur][d];
            if (colour.has(ed)) continue;
            colour.set(ed, LINE_COLORS[k % LINE_COLORS.length]);
            const j = L.nb(cur, d);
            if (m.endpoint[j] < 0) q.push([j, OPP[d]]);
          }
        }
      }
    });
    const groups = new Map([[NEUTRAL, []]]);
    for (let ed = 0; ed < L.E; ed++) if (st[ed] === 1) {
      const c = colour.get(ed) || NEUTRAL;
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c).push(ed);
    }
    return groups;
  }

  function draw() {
    rails.innerHTML = railsSvg(g, colourGroups());
    let x = "";
    for (let ed = 0; ed < L.E; ed++) if (st[ed] === 2) {
      const [a, b] = L.ends[ed];
      const mx = (g.cx(a % p.cols) + g.cx(b % p.cols)) / 2, my = (g.cy(Math.floor(a / p.cols)) + g.cy(Math.floor(b / p.cols))) / 2, k = s * 0.08;
      x += `M${mx - k} ${my - k}L${mx + k} ${my + k}M${mx + k} ${my - k}L${mx - k} ${my + k}`;
    }
    marks.innerHTML = `<path d="${x}" stroke="#5B4A38" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>`;
  }
  const isSolved = () => { for (let ed = 0; ed < L.E; ed++) if ((st[ed] === 1) !== sol.has(ed)) return false; return true; };
  function finish() {
    solved = true;
    svg.classList.add("solved");
    riders.innerHTML = ridingCars(p, g, sol);
  }
  function commit(changes) {
    if (!changes.length) return;
    undo.push(changes); clearHint(); draw(); onChange(Array.from(st));
    if (!solved && isSolved()) { finish(); onSolved(); }
  }
  const setEdge = (ed, v, changes) => { if (ed < 0 || blockedEdge(ed) || st[ed] === v) return; changes.push([ed, st[ed], v]); st[ed] = v; };

  // ---------------------------------------------------------------- input (same gestures as the road boards)
  const toLocal = (ev) => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const cellAt = ({ x, y }) => { const c = Math.floor(x / s), r = Math.floor((y - g.Y0) / s); return r < 0 || c < 0 || r >= p.rows || c >= p.cols ? -1 : r * p.cols + c; };
  const nearestEdge = ({ x, y }) => {
    const c = Math.floor(x / s), r = Math.floor((y - g.Y0) / s);
    if (r < 0 || c < 0 || r >= p.rows || c >= p.cols) return -1;
    const lx = x / s - c, ly = (y - g.Y0) / s - r, d = [lx, 1 - lx, ly, 1 - ly];
    const k = d.indexOf(Math.min(...d));
    return d[k] > 0.3 ? -1 : L.cellEdges[r * p.cols + c][k];
  };
  let drag = null;
  svg.addEventListener("pointerdown", (ev) => {
    if (solved || ev.button === 2) return;
    ev.preventDefault(); svg.setPointerCapture(ev.pointerId);
    const pt = toLocal(ev);
    drag = { cell: cellAt(pt), start: pt, mode: null, changes: [], moved: false };
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    const cell = cellAt(toLocal(ev));
    if (cell < 0 || cell === drag.cell || drag.cell < 0) { if (drag.cell < 0) drag.cell = cell; return; }
    let cur = drag.cell;
    while (cur !== cell) {
      const r = Math.floor(cur / p.cols), c = cur % p.cols, tr = Math.floor(cell / p.cols), tc = cell % p.cols;
      const next = Math.abs(tr - r) >= Math.abs(tc - c) ? (r + Math.sign(tr - r)) * p.cols + c : r * p.cols + c + Math.sign(tc - c);
      const ed = L.edgeBetween(cur, next);
      if (ed >= 0 && !blockedEdge(ed)) { if (drag.mode == null) drag.mode = st[ed] === 1 ? 0 : 1; setEdge(ed, drag.mode, drag.changes); }
      cur = next;
    }
    drag.cell = cell; drag.moved = true; draw();
  });
  const endDrag = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) { const ed = nearestEdge(d.start); if (ed >= 0) setEdge(ed, st[ed] === 0 ? 2 : 0, d.changes); }
    commit(d.changes);
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
  svg.addEventListener("contextmenu", (ev) => {
    ev.preventDefault(); if (solved) return;
    const ed = nearestEdge(toLocal(ev)), changes = [];
    if (ed >= 0) setEdge(ed, st[ed] === 2 ? 0 : 2, changes);
    commit(changes);
  });

  // ---------------------------------------------------------------- hints
  const mistakes = () => { const out = []; for (let ed = 0; ed < L.E; ed++) if ((st[ed] === 1 && !sol.has(ed)) || (st[ed] === 2 && sol.has(ed))) out.push(ed); return out; };
  function clearHint() { hint = null; hintLayer.innerHTML = ""; }
  const cellsSvg = (cells, cls) => cells.map((c) => `<rect class="${cls}" x="${(c % p.cols) * s + 3}" y="${g.Y0 + Math.floor(c / p.cols) * s + 3}" width="${s - 6}" height="${s - 6}" rx="10"/>`).join("");
  const edgesSvg = (list, cls) => list.map(([ed, v]) => {
    const [a, b] = L.ends[ed];
    const x1 = g.cx(a % p.cols), y1 = g.cy(Math.floor(a / p.cols)), x2 = g.cx(b % p.cols), y2 = g.cy(Math.floor(b / p.cols));
    if (v === ON) return `<path class="${cls} on" d="M${x1} ${y1}L${x2} ${y2}"/>`;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, k = s * 0.1;
    return `<path class="${cls} off" d="M${mx - k} ${my - k}L${mx + k} ${my + k}M${mx + k} ${my - k}L${mx - k} ${my + k}"/>`;
  }).join("");

  const api = {
    svg,
    get solved() { return solved; },
    undo() { if (solved) return; const ch = undo.pop(); if (!ch) return; for (let i = ch.length - 1; i >= 0; i--) st[ch[i][0]] = ch[i][1]; clearHint(); draw(); onChange(Array.from(st)); },
    clear() { if (solved) return; const ch = []; for (let ed = 0; ed < L.E; ed++) if (st[ed]) { ch.push([ed, st[ed], 0]); st[ed] = 0; } if (ch.length) { undo.push(ch); clearHint(); draw(); onChange(Array.from(st)); } },
    check() { clearHint(); const bad = mistakes(); if (bad.length) hintLayer.innerHTML = edgesSvg(bad.map((ed) => [ed, st[ed] === 1 ? ON : OFF]), "mistake"); return bad.length; },
    hint() {
      clearHint();
      if (solved) return null;
      const bad = mistakes();
      if (bad.length) { hintLayer.innerHTML = edgesSvg(bad.map((ed) => [ed, st[ed] === 1 ? ON : OFF]), "mistake"); return { kind: "mistake", count: bad.length }; }
      const e = init.e.slice();
      for (let ed = 0; ed < L.E; ed++) { if (st[ed] === 1) e[ed] = ON; else if (st[ed] === 2 && e[ed] === 0) e[ed] = OFF; }
      const nx = H.nextDeduction(m, { e });
      if (!nx || nx.contra || !nx.d) return null;
      const toSet = nx.d.set.filter(([ed]) => !blockedEdge(ed) && st[ed] === 0);
      hint = { toSet };
      hintLayer.innerHTML = cellsSvg(nx.d.focus || [], "hint-cell") + edgesSvg(toSet, "hint-edge");
      return { kind: "step", rule: nx.d.rule, tier: nx.d.tier, count: toSet.length };
    },
    applyHint() { if (!hint) return; const ch = []; for (const [ed, v] of hint.toSet) setEdge(ed, v === ON ? 1 : 2, ch); commit(ch); },
  };
  draw();
  if (isSolved()) { finish(); svg.classList.add("instant"); }
  return api;
}
