// Interactive board: drag to build road between squares, tap a gap (or right-click) to mark it ×.
// Hints come from the same human solver that rated the puzzle, so every hint is a named deduction.
import { geometry, defs, water, terrain, ships, fogBanks, shoreTop, shoreBottom, roadSvg, bridgeDecor, foghorns, landNumbers, edgeLine } from "../core/render/board.js";
import { buildModel, initState, ON, OFF } from "../core/road/engine.js";
import { nextDeduction } from "../core/road/human.js";

const SVGNS = "http://www.w3.org/2000/svg";

export function mountBoard(host, p, { saved = null, onChange = () => {}, onSolved = () => {} } = {}) {
  const g = geometry(p, 60); g.id = "pz" + p.seed;
  const { L, s } = g;
  const m = buildModel(p);
  const init = initState(m);
  const sol = new Set(p.solution);
  const st = saved && saved.length === L.PS ? Int8Array.from(saved) : new Int8Array(L.PS); // 0 empty, 1 road, 2 ×
  const undo = [];
  let solved = false, hint = null;

  host.innerHTML = `<svg class="board live" viewBox="0 0 ${g.W} ${g.H}" xmlns="${SVGNS}" role="application" aria-label="Puzzle board: drag between squares to build the road">
    ${defs(g.id, g)}${water(p, g)}${terrain(p, g)}${ships(p, g)}${fogBanks(p, g)}
    ${shoreTop(p, g)}${shoreBottom(p, g)}
    <g class="marks"></g><g class="road-layer"></g><g class="decor-layer"></g><g class="hint-layer"></g>
    ${foghorns(p, g)}${landNumbers(p, g)}
    <rect class="hit" x="0" y="0" width="${g.W}" height="${g.H}" fill="transparent"/>
  </svg>`;
  const svg = host.querySelector("svg");
  const marks = svg.querySelector(".marks"), roadLayer = svg.querySelector(".road-layer"), decorLayer = svg.querySelector(".decor-layer"), hintLayer = svg.querySelector(".hint-layer");

  const blockedEdge = (ed) => L.ends[ed].some((c) => c >= 0 && m.blocked[c]);
  const onEdges = () => { const out = [L.PS, L.PN]; for (let ed = 0; ed < L.PS; ed++) if (st[ed] === 1) out.push(ed); return out; };

  function draw() {
    roadLayer.innerHTML = roadSvg(g, onEdges());
    let x = "";
    for (let ed = 0; ed < L.PS; ed++) if (st[ed] === 2) {
      const [x1, y1, x2, y2] = edgeLine(g, ed), mx = (x1 + x2) / 2, my = (y1 + y2) / 2, k = s * 0.08;
      x += `M${mx - k} ${my - k}L${mx + k} ${my + k}M${mx + k} ${my - k}L${mx - k} ${my + k}`;
    }
    marks.innerHTML = `<path d="${x}" stroke="#F4F0E6" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>`;
  }

  function isSolved() {
    for (let ed = 0; ed < L.PS; ed++) if ((st[ed] === 1) !== sol.has(ed)) return false;
    return true;
  }

  function commit(changes) {
    if (!changes.length) return;
    undo.push(changes);
    clearHint();
    draw();
    onChange(Array.from(st));
    if (!solved && isSolved()) {
      solved = true;
      svg.classList.add("solved");
      decorLayer.innerHTML = bridgeDecor(p, g, onEdges());
      onSolved();
    }
  }
  const setEdge = (ed, v, changes) => { if (blockedEdge(ed) || st[ed] === v) return; changes.push([ed, st[ed], v]); st[ed] = v; };

  // ---------------------------------------------------------------- input
  const toLocal = (ev) => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const cellAt = ({ x, y }) => {
    const c = Math.floor((x - g.X0) / s), r = Math.floor((y - g.Y0) / s);
    return r < 0 || c < 0 || r >= p.rows || c >= p.cols ? -1 : r * p.cols + c;
  };
  const nearestEdge = ({ x, y }) => {
    const c = Math.floor((x - g.X0) / s), r = Math.floor((y - g.Y0) / s);
    if (r < 0 || c < 0 || r >= p.rows || c >= p.cols) return -1;
    const lx = (x - g.X0) / s - c, ly = (y - g.Y0) / s - r;
    const d = [lx, 1 - lx, ly, 1 - ly]; // distance to L, R, U, D sides
    const k = d.indexOf(Math.min(...d));
    if (d[k] > 0.3) return -1;
    const ed = L.cellEdges[r * p.cols + c][k];
    return ed >= 0 && ed < L.PS ? ed : -1;
  };

  let drag = null;
  svg.addEventListener("pointerdown", (ev) => {
    if (solved || ev.button === 2) return;
    ev.preventDefault();
    svg.setPointerCapture(ev.pointerId);
    const pt = toLocal(ev);
    drag = { cell: cellAt(pt), start: pt, mode: null, changes: [], moved: false };
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    const cell = cellAt(toLocal(ev));
    if (cell < 0 || cell === drag.cell || drag.cell < 0) { if (drag.cell < 0) drag.cell = cell; return; }
    // Walk one square at a time towards the pointer, so fast drags don't skip squares.
    let cur = drag.cell;
    while (cur !== cell) {
      const r = Math.floor(cur / p.cols), c = cur % p.cols, tr = Math.floor(cell / p.cols), tc = cell % p.cols;
      const next = Math.abs(tr - r) >= Math.abs(tc - c) ? (r + Math.sign(tr - r)) * p.cols + c : r * p.cols + c + Math.sign(tc - c);
      const ed = L.edgeBetween(cur, next);
      if (ed >= 0 && ed < L.PS && !blockedEdge(ed)) {
        if (!drag.mode) drag.mode = st[ed] === 1 ? 0 : 1;
        setEdge(ed, drag.mode, drag.changes);
      }
      cur = next;
    }
    drag.cell = cell; drag.moved = true;
    draw();
  });
  const endDrag = (ev) => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) {
      const ed = nearestEdge(d.start);
      if (ed >= 0) setEdge(ed, st[ed] === 0 ? 2 : 0, d.changes);
    }
    commit(d.changes);
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
  svg.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    if (solved) return;
    const ed = nearestEdge(toLocal(ev)), changes = [];
    if (ed >= 0) setEdge(ed, st[ed] === 2 ? 0 : 2, changes);
    commit(changes);
  });

  // ---------------------------------------------------------------- hints and checking
  function mistakes() {
    const out = [];
    for (let ed = 0; ed < L.PS; ed++) if ((st[ed] === 1 && !sol.has(ed)) || (st[ed] === 2 && sol.has(ed))) out.push(ed);
    return out;
  }
  function clearHint() { hint = null; hintLayer.innerHTML = ""; }
  function showCells(cells, cls) {
    return cells.map((c) => `<rect class="${cls}" x="${g.X0 + (c % p.cols) * s + 3}" y="${g.Y0 + Math.floor(c / p.cols) * s + 3}" width="${s - 6}" height="${s - 6}" rx="10"/>`).join("");
  }
  function showEdges(list, cls) {
    return list.map(([ed, v]) => {
      const [x1, y1, x2, y2] = edgeLine(g, ed);
      if (v === ON) return `<path class="${cls} on" d="M${x1} ${y1}L${x2} ${y2}"/>`;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, k = s * 0.1;
      return `<path class="${cls} off" d="M${mx - k} ${my - k}L${mx + k} ${my + k}M${mx + k} ${my - k}L${mx - k} ${my + k}"/>`;
    }).join("");
  }

  const api = {
    svg,
    get solved() { return solved; },
    undo() {
      if (solved) return;
      const ch = undo.pop(); if (!ch) return;
      for (let i = ch.length - 1; i >= 0; i--) st[ch[i][0]] = ch[i][1];
      clearHint(); draw(); onChange(Array.from(st));
    },
    clear() {
      if (solved) return;
      const changes = [];
      for (let ed = 0; ed < L.PS; ed++) if (st[ed]) { changes.push([ed, st[ed], 0]); st[ed] = 0; }
      if (changes.length) { undo.push(changes); clearHint(); draw(); onChange(Array.from(st)); }
    },
    check() {
      clearHint();
      const bad = mistakes();
      if (bad.length) hintLayer.innerHTML = showEdges(bad.map((ed) => [ed, st[ed] === 1 ? ON : OFF]), "mistake");
      return bad.length;
    },
    /** The next deduction from the correct part of the player's marks. */
    hint() {
      clearHint();
      if (solved) return null;
      const bad = mistakes();
      if (bad.length) {
        hintLayer.innerHTML = showEdges(bad.map((ed) => [ed, st[ed] === 1 ? ON : OFF]), "mistake");
        return { kind: "mistake", count: bad.length };
      }
      const e = init.e.slice();
      for (let ed = 0; ed < L.PS; ed++) {
        if (st[ed] === 1) e[ed] = ON;
        else if (st[ed] === 2 && e[ed] === 0) e[ed] = OFF;
      }
      // Deductions that only mark squares as "must be road" leave nothing to draw, so keep going
      // (up to a few steps) until one does; the first deduction names the hint.
      const work = { e, need: init.need.slice() };
      let first = null, d = null, toSet = [], needs = [];
      for (let k = 0; k < 12; k++) {
        const nx = nextDeduction(m, work);
        if (!nx || nx.contra || !nx.d) break;
        d = nx.d; first = first || d;
        toSet = d.set.filter(([ed]) => ed < L.PS && !blockedEdge(ed) && st[ed] === 0);
        needs.push(...(d.need || []));
        if (toSet.length) break;
        for (const [ed, v] of d.set) if (work.e[ed] === 0) work.e[ed] = v;
        for (const c of d.need || []) work.need[c] = 1;
      }
      if (!first) return null;
      hint = { d, toSet };
      hintLayer.innerHTML = showCells(first.focus || [], "hint-cell") + showCells(needs, "hint-need") + showEdges(toSet, "hint-edge");
      return { kind: "step", rule: first.rule, tier: first.tier, count: toSet.length };
    },
    applyHint() {
      if (!hint) return;
      const changes = [];
      for (const [ed, v] of hint.toSet) setEdge(ed, v === ON ? 1 : 2, changes);
      commit(changes);
    },
    reveal() {
      const changes = [];
      for (let ed = 0; ed < L.PS; ed++) setEdge(ed, sol.has(ed) ? 1 : 0, changes);
      commit(changes);
    },
  };
  draw();
  if (isSolved()) { solved = true; svg.classList.add("solved", "instant"); decorLayer.innerHTML = bridgeDecor(p, g, onEdges()); }
  return api;
}
