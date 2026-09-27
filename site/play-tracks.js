// Cable Cars boards: tap a square to cycle its piece of track (─ │ ┌ ┐ └ ┘ ┼, then × for "no track
// here", then empty; turntables cycle through the four ways out). Long-press or right-click steps
// back. Rails take a line's colour as soon as they connect to its turntable.
import { geometry, defs, bay, terrain, fixtures, railsSvgSegs, ridingCars, LINE_COLORS } from "../core/render/cable.js";
import { buildModel, initState, tracksEngine } from "../core/tracks/engine.js";
import { makeHuman } from "../core/lib/human.js";
import { diagnose, allConnected, lines } from "../core/tracks/diagnose.js";
import { mountPieces, solutionPieces, lineHint, BIT, X, H, V, NE, NW, SE, SW, CROSS } from "./pieces.js";

const HM = makeHuman(tracksEngine);
const NEUTRAL = "#7C7268";
const ALL = [H, V, SE, SW, NE, NW, CROSS];

export function mountBoard(host, p, { saved = null, onChange = () => {}, onSolved = () => {}, onVerdict = null } = {}) {
  const g = geometry(p, 60); g.id = "cc" + p.seed;
  const { L, s } = g;
  const m = buildModel(p);
  host.innerHTML = `<svg class="board live" viewBox="0 0 ${g.W} ${g.H}" xmlns="http://www.w3.org/2000/svg" role="application" aria-label="Cable Cars board: tap a square to change its piece of track">
    ${defs(g.id, g)}${bay(p, g)}${terrain(p, g)}
    <g class="marks"></g><g class="rails"></g>${fixtures(p, g)}<g class="riders"></g><g class="hint-layer"></g>
    <rect x="0" y="${g.Yb}" width="${g.W}" height="${g.H - g.Yb}" fill="#4A423A"/>
    <text x="${s * 0.25}" y="${g.Yb + (g.H - g.Yb) / 2}" class="shore-label light">MARKET STREET</text>
  </svg>`;
  const svg = host.querySelector("svg");
  const layer = (c) => svg.querySelector("." + c);

  const fits = (i, piece) => {
    for (let d = 0; d < 4; d++) {
      if (!(piece & BIT[d])) continue;
      const j = L.nb(i, d);
      if (j < 0 || m.blocked[j]) return false;
    }
    return true;
  };
  const cycle = (i) => {
    if (m.blocked[i]) return null;
    if (m.endpoint[i] >= 0) return BIT.filter((b) => fits(i, b));
    return [...ALL.filter((x) => fits(i, x)), X];
  };
  const carPiece = (i) => { const c = p.cars?.[i]; return c ? (c === "H" ? H : V) : undefined; };
  const solution = solutionPieces(L.n, L.cellEdges, p.solution);

  // Colour each half-piece by the turntable its track reaches.
  const colourOf = (claims) => {
    const { piece, find } = lines(m, claims);
    const label = new Map();
    for (let i = 0; i < L.n; i++) if (m.endpoint[i] >= 0) label.set(find(L.E + i), m.endpoint[i]);
    return Array.from({ length: L.n }, (_, i) => {
      const cols = [0, 1, 2, 3].map((d) => {
        if (!(piece[i] & BIT[d])) return NEUTRAL;
        const k = label.get(find(L.cellEdges[i][d]));
        return k == null ? NEUTRAL : LINE_COLORS[k % LINE_COLORS.length];
      });
      return [...cols, NEUTRAL];
    });
  };

  return mountPieces(svg, { road: layer("rails"), marks: layer("marks"), decor: layer("riders"), hint: layer("hint-layer") }, {
    n: L.n, s,
    cellRect: (i) => ({ x: (i % p.cols) * s, y: g.Y0 + Math.floor(i / p.cols) * s }),
    centre: (i) => [g.cx(i % p.cols), g.cy(Math.floor(i / p.cols))],
    cycle, fixed: carPiece, solution, colourOf,
    draw: (groups) => railsSvgSegs(g, groups),
    complete: (claims) => allConnected(p, claims),
    diagnose: (claims) => diagnose(p, claims),
    decor: () => ridingCars(p, g, new Set(p.solution)),
    hintNext: (claims) => lineHint(tracksEngine, HM, m, claims, solution, L.cellEdges, L.n, {
      baseState: () => initState(m), canFill: (i) => !m.blocked[i] && carPiece(i) == null,
    }),
  }, { saved, onChange, onSolved, onVerdict });
}
