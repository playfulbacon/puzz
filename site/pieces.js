// Tap-to-cycle boards for the line puzzles (Golden Gate roads, Cable Cars tracks).
// Every square holds a piece: a bitmask of the sides it connects (L=1 R=2 U=4 D=8), or 16 for
// "no road here" (the deduction mark), or 0 for empty. Tapping a square steps through the pieces
// that fit it; long-press or right-click steps back. A connection counts where both squares agree,
// so a piece pointing at a square that doesn't point back shows as a loose end.

export const X = 16;
export const BIT = [1, 2, 4, 8];
const OPP = [1, 0, 3, 2];
export const H = 3, V = 12, NE = 6, NW = 5, SE = 10, SW = 9, CROSS = 15;
export const GLYPH = { 0: "", 3: "─", 12: "│", 10: "┌", 9: "┐", 6: "└", 5: "┘", 15: "┼", 1: "╴", 2: "╶", 4: "╵", 8: "╷", 16: "×" };

/**
 * cfg: {
 *   n, rows, cols, s, cellRect(i) → {x, y}, centre(i) → [x, y], nb(i, d),
 *   cycle(i) → array of pieces (excluding 0) or null if the square isn't tappable,
 *   fixed(i) → piece or undefined (given pieces, e.g. parked cable cars),
 *   ports(i) → extra segments [[x1,y1,x2,y2]] always drawn from this square (shore connections),
 *   solution: Uint8Array of pieces, draw(segmentsByColour) → svg, colourOf(claims) → colour per square,
 *   complete(claims) → bool, diagnose(claims) → [{text, cells}], decor() → svg on success,
 *   hintNext(claims) → {rule, tier, focus, cell, piece} | null,
 * }
 */
export function mountPieces(svg, layers, cfg, { saved, onChange, onSolved, onVerdict }) {
  const { n, s } = cfg;
  const claims = new Uint8Array(n);
  if (saved && saved.length === n) saved.forEach((v, i) => { claims[i] = v; });
  for (let i = 0; i < n; i++) { const f = cfg.fixed?.(i); if (f != null) claims[i] = f; }
  const undo = [];
  let solved = false, hint = null, verdictShown = false;

  const segs = () => {
    const colours = cfg.colourOf ? cfg.colourOf(claims) : null, groups = new Map();
    const add = (col, seg) => { if (!groups.has(col)) groups.set(col, []); groups.get(col).push(seg); };
    for (let i = 0; i < n; i++) {
      const [cx, cy] = cfg.centre(i), cc = colours ? colours[i] : "road";
      const col = Array.isArray(cc) ? cc[4] : cc;
      for (const seg of cfg.ports?.(i) || []) add(col, seg);
      const x = claims[i];
      if (!x || x === X) continue;
      for (let d = 0; d < 4; d++) if (x & BIT[d]) {
        const ex = cx + (d === 0 ? -s / 2 : d === 1 ? s / 2 : 0), ey = cy + (d === 2 ? -s / 2 : d === 3 ? s / 2 : 0);
        add(Array.isArray(cc) ? cc[d] : col, [cx, cy, ex, ey]);
      }
    }
    return groups;
  };
  const f = (v) => Math.round(v * 10) / 10;
  function draw() {
    layers.road.innerHTML = cfg.draw(segs());
    let marks = "";
    for (let i = 0; i < n; i++) if (claims[i] === X) {
      const [cx, cy] = cfg.centre(i), k = s * 0.12;
      marks += `M${f(cx - k)} ${f(cy - k)}L${f(cx + k)} ${f(cy + k)}M${f(cx + k)} ${f(cy - k)}L${f(cx - k)} ${f(cy + k)}`;
    }
    layers.marks.innerHTML = `<path d="${marks}" class="cell-x"/>`;
  }
  const pieceOf = (i) => (claims[i] === X ? 0 : claims[i]);
  const isSolved = () => { for (let i = 0; i < n; i++) if (pieceOf(i) !== cfg.solution[i]) return false; return true; };

  function evaluate() {
    if (solved) return;
    if (isSolved()) {
      solved = true; svg.classList.add("solved");
      layers.decor.innerHTML = cfg.decor ? cfg.decor() : "";
      layers.hint.innerHTML = "";
      onSolved();
      onVerdict?.({ ok: true });
      return;
    }
    if (cfg.complete(claims)) {
      const reasons = cfg.diagnose(claims);
      if (!reasons.length) reasons.push({ text: "Everything connects, but a square somewhere doesn't match. Try Check to see which.", cells: [] });
      layers.hint.innerHTML = cellsSvg(reasons.flatMap((r) => r.cells), "mistake-cell");
      verdictShown = true;
      onVerdict?.({ ok: false, reasons });
    } else if (verdictShown) { verdictShown = false; onVerdict?.(null); }
  }
  function commit(ch) {
    if (!ch.length) return;
    undo.push(ch); hint = null; layers.hint.innerHTML = ""; draw(); onChange(Array.from(claims));
    evaluate();
  }
  const setCell = (i, v, ch) => { if (claims[i] === v) return; ch.push([i, claims[i], v]); claims[i] = v; };

  // ---------------------------------------------------------------- taps
  const toLocal = (ev) => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const cellAt = (pt) => { for (let i = 0; i < n; i++) { const r = cfg.cellRect(i); if (pt.x >= r.x && pt.x < r.x + s && pt.y >= r.y && pt.y < r.y + s) return i; } return -1; };
  const step = (i, back) => {
    const list = cfg.cycle(i);
    if (!list || cfg.fixed?.(i) != null) return;
    const order = [0, ...list], k = order.indexOf(claims[i]);
    const next = order[((k < 0 ? 0 : k) + (back ? order.length - 1 : 1)) % order.length];
    const ch = []; setCell(i, next, ch); commit(ch);
  };
  let press = null;
  svg.addEventListener("pointerdown", (ev) => {
    if (solved || ev.button === 2) return;
    const i = cellAt(toLocal(ev));
    if (i < 0) return;
    ev.preventDefault();
    press = { i, long: false, timer: setTimeout(() => { if (press) { press.long = true; step(i, true); } }, 450) };
  });
  const release = (ev) => {
    if (!press) return;
    clearTimeout(press.timer);
    const p = press; press = null;
    if (!p.long && ev.type === "pointerup") step(p.i, false);
  };
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);
  svg.addEventListener("pointerleave", release);
  svg.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    if (solved) return;
    const i = cellAt(toLocal(ev)); if (i >= 0) step(i, true);
  });

  // ---------------------------------------------------------------- hints and checking
  function cellsSvg(cells, cls) {
    return [...new Set(cells)].map((c) => { const r = cfg.cellRect(c); return `<rect class="${cls}" x="${r.x + 3}" y="${r.y + 3}" width="${s - 6}" height="${s - 6}" rx="10"/>`; }).join("");
  }
  const mistakes = () => {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (!claims[i] || cfg.fixed?.(i) != null) continue;
      if (claims[i] === X ? cfg.solution[i] !== 0 : claims[i] !== cfg.solution[i]) out.push(i);
    }
    return out;
  };
  const api = {
    svg,
    get solved() { return solved; },
    undo() { if (solved) return; const ch = undo.pop(); if (!ch) return; for (let k = ch.length - 1; k >= 0; k--) claims[ch[k][0]] = ch[k][1]; hint = null; layers.hint.innerHTML = ""; draw(); onChange(Array.from(claims)); evaluate(); },
    clear() {
      if (solved) return;
      const ch = [];
      for (let i = 0; i < n; i++) if (cfg.fixed?.(i) == null) setCell(i, 0, ch);
      if (ch.length) { undo.push(ch); layers.hint.innerHTML = ""; draw(); onChange(Array.from(claims)); evaluate(); }
    },
    check() { const bad = mistakes(); layers.hint.innerHTML = cellsSvg(bad, "mistake-cell"); return bad.length; },
    hint() {
      layers.hint.innerHTML = "";
      if (solved) return null;
      const bad = mistakes();
      if (bad.length) { layers.hint.innerHTML = cellsSvg(bad, "mistake-cell"); return { kind: "mistake", count: bad.length }; }
      const h = cfg.hintNext(claims, mistakes);
      if (!h) return null;
      hint = h;
      layers.hint.innerHTML = cellsSvg(h.focus || [], "hint-cell") + cellsSvg([h.cell], "hint-target");
      return { kind: "step", rule: h.rule, tier: h.tier, count: 1, piece: GLYPH[h.piece] };
    },
    applyHint() { if (!hint) return; const ch = []; setCell(hint.cell, hint.piece === 0 ? X : hint.piece, ch); commit(ch); },
  };
  draw();
  if (isSolved()) { solved = true; svg.classList.add("solved", "instant"); layers.decor.innerHTML = cfg.decor ? cfg.decor() : ""; }
  return api;
}

/** Pieces of a solution from its edge list; `extra(i)` adds fixed bits (shore ports). */
export function solutionPieces(n, cellEdges, onEdges, extra = () => 0) {
  const on = new Set(onEdges), out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let x = extra(i);
    for (let d = 0; d < 4; d++) { const ed = cellEdges[i][d]; if (ed >= 0 && on.has(ed)) x |= BIT[d]; }
    out[i] = x;
  }
  return out;
}

/**
 * Next hint for a line puzzle: build the engine state from the squares the player has right, then
 * deduce until some square the player hasn't filled is fully decided. Returns the first
 * deduction's rule (the reason) and the square to fill.
 */
export function lineHint(E, H, m, claims, solution, cellEdges, n, { baseState, isPort = () => false, canFill = () => true }) {
  const st = baseState();
  const decided = (i) => cellEdges[i].every((ed) => ed < 0 || st.e[ed] !== 0);
  for (let i = 0; i < n; i++) {
    const c = claims[i];
    if (!c) continue;
    const correct = c === X ? solution[i] === 0 : c === solution[i];
    if (!correct) continue;
    for (let d = 0; d < 4; d++) {
      const ed = cellEdges[i][d];
      if (ed < 0 || isPort(ed) || st.e[ed] !== 0) continue;
      st.e[ed] = c !== X && (c & BIT[d]) ? 1 : 2;
    }
  }
  let first = null;
  for (let step = 0; step < 40; step++) {
    const target = [];
    for (let i = 0; i < n; i++) if (!claims[i] && canFill(i) && decided(i)) target.push(i);
    if (target.length) {
      const near = first?.focus?.length ? first.focus : [];
      const dist = (i) => near.reduce((a, c) => Math.min(a, Math.abs(Math.floor(c / m.cols) - Math.floor(i / m.cols)) + Math.abs((c % m.cols) - (i % m.cols))), 99);
      target.sort((a, b) => dist(a) - dist(b));
      const cell = target[0];
      let piece = 0;
      for (let d = 0; d < 4; d++) { const ed = cellEdges[cell][d]; if (ed >= 0 && st.e[ed] === 1) piece |= BIT[d]; }
      const d = first || { rule: "continue", tier: 1, focus: [] };
      return { rule: d.rule, tier: d.tier, focus: d.focus, cell, piece };
    }
    const nx = H.nextDeduction(m, st);
    if (!nx || nx.contra || !nx.d) return null;
    first = first || nx.d;
    E.applyDeduction(st, nx.d);
  }
  return null;
}
