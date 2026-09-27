// Tap boards for the line puzzles (Golden Gate roads, Cable Cars tracks).
//
// What the player marks, per square:  0 empty · DOT "road goes through here" · X "no road here" ·
// or an explicit piece (bitmask of sides L=1 R=2 U=4 D=8) chosen by long-press / right-click.
// Tap cycles empty → • → × → empty. Dots join up by themselves: a dot connects to every neighbour
// that is also road (another dot, a piece pointing at it, the shore, a turntable), so two road
// neighbours make it a piece of road. A dot that could join more neighbours than a road can
// (more than two, or more than one at a turntable) is a conflict and is outlined in red.
//
// Everything downstream (rule checks, the verdict, hints, "solved") works on the resolved pieces.

export const X = 16, DOT = 32;
export const BIT = [1, 2, 4, 8];
const OPP = [1, 0, 3, 2];
export const H = 3, V = 12, NE = 6, NW = 5, SE = 10, SW = 9, CROSS = 15;
export const GLYPH = { 0: "", 3: "─", 12: "│", 10: "┌", 9: "┐", 6: "└", 5: "┘", 15: "┼", 1: "╴", 2: "╶", 4: "╵", 8: "╷", 16: "×", 32: "•" };
const bitCount = (x) => (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
const isPieceVal = (v) => v > 0 && v < 16;

/**
 * cfg: {
 *   n, s, cellRect(i) → {x, y}, centre(i) → [x, y], nb(i, d), blocked(i),
 *   pieces(i) → explicit pieces offered on long-press (null if the square can't hold road),
 *   portBits(i) → sides always connected (the shore at the start/end squares),
 *   auto(i) → true if the square is always road and resolves itself (turntables),
 *   ends(i) → true if the square is a line end (connects to exactly one neighbour),
 *   mustUse(i) → true if the square can't be marked × (start/end/turntables),
 *   crossOK(i) → true if four connections make a legal crossing here,
 *   fixed(i) → piece or undefined (given pieces, e.g. parked cable cars),
 *   ports(i) → extra segments [[x1,y1,x2,y2]] always drawn from this square,
 *   solution, draw(groups) → svg, colourOf(claims) → colour(s) per square,
 *   complete(claims), diagnose(claims), live(claims), decor(), hintNext(claims, isEmpty),
 *   dotColour: colour of the "road here" marker,
 * }
 */
export function mountPieces(svg, layers, cfg, { saved, onChange, onSolved, onVerdict, onLive }) {
  const { n, s } = cfg;
  const user = new Uint8Array(n);
  if (saved && saved.length === n) saved.forEach((v, i) => { user[i] = v; });
  for (let i = 0; i < n; i++) { const f = cfg.fixed?.(i); if (f != null) user[i] = f; }
  const undo = [];
  let solved = false, hint = null, verdictShown = false;
  let claims = new Uint8Array(n), conflicts = [];

  // ---------------------------------------------------------------- dots → pieces
  const isDot = (i) => user[i] === DOT || (user[i] === 0 && cfg.auto?.(i));
  function resolve() { ({ claims, conflicts } = resolveDots(user, cfg)); }

  // ---------------------------------------------------------------- drawing
  const f = (v) => Math.round(v * 10) / 10;
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
  function draw() {
    resolve();
    layers.road.innerHTML = cfg.draw(segs());
    let marks = "", dots = "";
    for (let i = 0; i < n; i++) {
      const [cx, cy] = cfg.centre(i);
      if (user[i] === X) { const k = s * 0.12; marks += `M${f(cx - k)} ${f(cy - k)}L${f(cx + k)} ${f(cy + k)}M${f(cx + k)} ${f(cy - k)}L${f(cx - k)} ${f(cy + k)}`; }
      // A dot that hasn't joined two neighbours yet shows as a marker, so "road here" is visible.
      if (user[i] === DOT && bitCount(claims[i]) < 2) dots += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s * 0.13)}"/>`;
    }
    layers.marks.innerHTML = `<path d="${marks}" class="cell-x"/><g class="road-dot" style="fill:${cfg.dotColour || "#C0362C"}">${dots}</g>`;
    live();
  }
  function live() {
    const problems = solved ? [] : [...(cfg.live ? cfg.live(claims) : [])];
    if (!solved && conflicts.length) problems.unshift({ text: "A dot here could join more neighbours than a road can (a road joins two, a turntable one). Mark one of the neighbours ×, or long-press this square to choose its piece.", cells: conflicts });
    layers.errors.innerHTML = cellsSvg(problems.flatMap((x) => x.cells), "live-error");
    onLive?.(problems);
  }

  const pieceOf = (i) => (claims[i] === X ? 0 : claims[i]);
  const isSolved = () => { for (let i = 0; i < n; i++) if (pieceOf(i) !== cfg.solution[i]) return false; return true; };
  function evaluate() {
    if (solved) return;
    if (isSolved()) {
      solved = true; svg.classList.add("solved");
      layers.decor.innerHTML = cfg.decor ? cfg.decor() : "";
      layers.hint.innerHTML = ""; layers.errors.innerHTML = ""; onLive?.([]);
      onSolved(); onVerdict?.({ ok: true });
      return;
    }
    if (!conflicts.length && cfg.complete(claims)) {
      const reasons = cfg.diagnose(claims);
      if (!reasons.length) reasons.push({ text: "Everything connects, but a square somewhere doesn't match. Try Check to see which.", cells: [] });
      layers.hint.innerHTML = cellsSvg(reasons.flatMap((r) => r.cells), "mistake-cell");
      verdictShown = true;
      onVerdict?.({ ok: false, reasons });
    } else if (verdictShown) { verdictShown = false; onVerdict?.(null); }
  }
  function commit(ch) {
    if (!ch.length) return;
    undo.push(ch); hint = null; layers.hint.innerHTML = ""; draw(); onChange(Array.from(user));
    evaluate();
  }
  const setCell = (i, v, ch) => { if (user[i] === v) return; ch.push([i, user[i], v]); user[i] = v; };

  // ---------------------------------------------------------------- taps
  const toLocal = (ev) => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const cellAt = (pt) => { for (let i = 0; i < n; i++) { const r = cfg.cellRect(i); if (pt.x >= r.x && pt.x < r.x + s && pt.y >= r.y && pt.y < r.y + s) return i; } return -1; };
  const editable = (i) => cfg.pieces(i) != null && cfg.fixed?.(i) == null;
  // Tap: empty → • → × → empty (squares that must be road skip ×; an explicit piece goes back to •).
  const tap = (i) => {
    if (!editable(i)) return;
    const order = cfg.mustUse?.(i) ? [0, DOT] : [0, DOT, X];
    const cur = isPieceVal(user[i]) ? -1 : order.indexOf(user[i]);
    const ch = []; setCell(i, cur < 0 ? DOT : order[(cur + 1) % order.length], ch); commit(ch);
  };
  // Long-press / right-click: step through the exact pieces that fit, then back to a dot.
  const pick = (i) => {
    if (!editable(i)) return;
    const list = [...cfg.pieces(i), DOT], k = list.indexOf(user[i]);
    const ch = []; setCell(i, list[(k + 1) % list.length], ch); commit(ch);
  };
  let press = null;
  svg.addEventListener("pointerdown", (ev) => {
    if (solved || ev.button === 2) return;
    const i = cellAt(toLocal(ev));
    if (i < 0) return;
    ev.preventDefault();
    press = { i, long: false, timer: setTimeout(() => { if (press) { press.long = true; pick(i); } }, 450) };
  });
  const release = (ev) => {
    if (!press) return;
    clearTimeout(press.timer);
    const p = press; press = null;
    if (!p.long && ev.type === "pointerup") tap(p.i);
  };
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);
  svg.addEventListener("pointerleave", release);
  svg.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    if (solved) return;
    const i = cellAt(toLocal(ev)); if (i >= 0) pick(i);
  });

  // ---------------------------------------------------------------- hints and checking
  function cellsSvg(cells, cls) {
    return [...new Set(cells)].map((c) => { const r = cfg.cellRect(c); return `<rect class="${cls}" x="${r.x + 3}" y="${r.y + 3}" width="${s - 6}" height="${s - 6}" rx="10"/>`; }).join("");
  }
  // A mark is a mistake if it can't be part of the answer: a dot or piece where there's no road,
  // an × where there is, or a piece (or fully joined dot) of the wrong shape.
  const mistakes = () => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const u = user[i];
      if (!u || cfg.fixed?.(i) != null) continue;
      if (u === X) { if (cfg.solution[i] !== 0) out.push(i); continue; }
      if (cfg.solution[i] === 0) { out.push(i); continue; }
      if (isPieceVal(u) && u !== cfg.solution[i]) out.push(i);
      else if (u === DOT && bitCount(claims[i]) >= 2 && claims[i] !== cfg.solution[i]) out.push(i);
    }
    return out;
  };
  const api = {
    svg,
    get solved() { return solved; },
    undo() { if (solved) return; const ch = undo.pop(); if (!ch) return; for (let k = ch.length - 1; k >= 0; k--) user[ch[k][0]] = ch[k][1]; hint = null; layers.hint.innerHTML = ""; draw(); onChange(Array.from(user)); evaluate(); },
    clear() {
      if (solved) return;
      const ch = [];
      for (let i = 0; i < n; i++) if (cfg.fixed?.(i) == null) setCell(i, 0, ch);
      if (ch.length) { undo.push(ch); layers.hint.innerHTML = ""; draw(); onChange(Array.from(user)); evaluate(); }
    },
    check() { const bad = mistakes(); layers.hint.innerHTML = cellsSvg(bad, "mistake-cell"); return bad.length; },
    hint() {
      layers.hint.innerHTML = "";
      if (solved) return null;
      const bad = mistakes();
      if (bad.length) { layers.hint.innerHTML = cellsSvg(bad, "mistake-cell"); return { kind: "mistake", count: bad.length }; }
      const h = cfg.hintNext(claims, (i) => !user[i] && !cfg.auto?.(i));
      if (!h) return null;
      hint = h;
      layers.hint.innerHTML = cellsSvg(h.focus || [], "hint-cell") + cellsSvg([h.cell], "hint-target");
      return { kind: "step", rule: h.rule, tier: h.tier, count: 1, piece: h.piece === 0 ? "×" : "•" };
    },
    // Fill the hinted square: × if no road, otherwise a dot, or the exact piece if a dot would join up differently.
    applyHint() {
      if (!hint) return;
      let v = X;
      if (hint.piece !== 0) {
        const prev = user[hint.cell];
        user[hint.cell] = DOT; resolve();
        const got = claims[hint.cell];
        v = got === hint.piece || ((got & ~hint.piece) === 0 && bitCount(got) < 2) ? DOT : hint.piece;
        user[hint.cell] = prev; resolve();
      }
      const ch = []; setCell(hint.cell, v, ch); commit(ch);
    },
  };
  draw();
  if (isSolved()) { solved = true; svg.classList.add("solved", "instant"); layers.decor.innerHTML = cfg.decor ? cfg.decor() : ""; layers.errors.innerHTML = ""; onLive?.([]); }
  return api;
}

/** Dots → pieces: each dot connects to every neighbour that is also road. Pure, so it can be tested. */
export function resolveDots(user, cfg) {
  const n = user.length, out = new Uint8Array(n), bad = [];
  const isDot = (i) => user[i] === DOT || (user[i] === 0 && cfg.auto?.(i));
  for (let i = 0; i < n; i++) if (isPieceVal(user[i])) out[i] = user[i];
  for (let i = 0; i < n; i++) {
    if (!isDot(i)) { if (user[i] === X) out[i] = X; continue; }
    let cand = cfg.portBits?.(i) || 0;
    for (let d = 0; d < 4; d++) {
      const j = cfg.nb(i, d);
      if (j < 0 || cfg.blocked(j)) continue;
      if (isDot(j) || (isPieceVal(user[j]) && (user[j] & BIT[OPP[d]]))) cand |= BIT[d];
    }
    out[i] = cand;
    const k = bitCount(cand);
    if (cfg.ends?.(i) ? k > 1 : k === 3 || (k === 4 && !cfg.crossOK?.(i))) bad.push(i);
  }
  return { claims: out, conflicts: bad };
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
 * deduce until some empty square is fully decided. Returns the first deduction's rule (the
 * reason) and the square to fill with its piece (0 = no road).
 */
export function lineHint(E, H, m, claims, solution, cellEdges, n, { baseState, isPort = () => false, canFill = () => true, isEmpty = () => true }) {
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
    for (let i = 0; i < n; i++) if (isEmpty(i) && canFill(i) && decided(i)) target.push(i);
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
