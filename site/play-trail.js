// Sasquatch boards: you're the Sasquatch. Tap a square for • (the trail goes here) or × (not here);
// dots join into a trail by themselves. Squares a hiker can see can't be used.
import { geometry, defs, river, den, hikers, trailSvg, walk } from "../core/render/trail.js";
import { floor, trees } from "../core/render/forest.js";
import { buildModel, initState } from "../core/road/engine.js";
import { roadEngine, nextDeduction } from "../core/road/human.js";
import { diagnose, connected, liveCheck } from "../core/road/diagnose.js";
import { mountPieces, solutionPieces, lineHint, BIT, H, V, NE, NW, SE, SW } from "./pieces.js";

const ALL = [H, V, SE, SW, NE, NW];

export function mountBoard(host, p, { saved = null, onChange = () => {}, onSolved = () => {}, onVerdict = null, onLive = null } = {}) {
  const g = geometry(p, 60); g.id = "tr" + p.seed;
  const { L, s } = g;
  const m = buildModel(p);
  const h = hikers(p, g);
  host.innerHTML = `<svg class="board live forest" viewBox="0 0 ${g.W} ${g.H}" xmlns="http://www.w3.org/2000/svg" role="application" aria-label="Sasquatch board: tap squares to lay the Sasquatch's trail">
    ${defs(g.id, g)}${river(p, g)}${floor(p, g)}${h.beams}${trees(p, g)}${den(p, g)}
    <g class="marks"></g><g class="road-layer"></g>${h.people}<g class="decor-layer"></g><g class="error-layer"></g><g class="hint-layer"></g>
  </svg>`;
  const svg = host.querySelector("svg");
  const layer = (c) => svg.querySelector("." + c);

  const portBit = (i) => (i === L.S ? BIT[3] : 0) | (i === L.T ? BIT[2] : 0);
  const fits = (i, piece) => {
    for (let d = 0; d < 4; d++) {
      if (!(piece & BIT[d]) || (portBit(i) & BIT[d])) continue;
      const j = L.nb(i, d);
      if (j < 0 || m.blocked[j]) return false;
    }
    return (piece & portBit(i)) === portBit(i);
  };
  const solution = solutionPieces(L.n, L.cellEdges, p.solution, portBit);
  const centre = (i) => [g.cx(i % p.cols), g.cy(Math.floor(i / p.cols))];

  return mountPieces(svg, { road: layer("road-layer"), marks: layer("marks"), decor: layer("decor-layer"), hint: layer("hint-layer"), errors: layer("error-layer") }, {
    n: L.n, s,
    cellRect: (i) => ({ x: (i % p.cols) * s, y: g.Y0 + Math.floor(i / p.cols) * s }),
    centre,
    pieces: (i) => (m.blocked[i] ? null : ALL.filter((x) => fits(i, x))),
    nb: L.nb, blocked: (i) => !!m.blocked[i], portBits: portBit, mustUse: (i) => !!portBit(i),
    dotColour: "#8A6A44",
    ports: (i) => {
      const [cx, cy] = centre(i), out = [];
      if (i === L.S) out.push([cx, cy + s / 2, g.den[0], g.den[1]]);
      if (i === L.T) out.push([cx, cy - s / 2, g.river[0], g.river[1]]);
      return out;
    },
    solution,
    draw: (groups) => {
      let d = "";
      for (const list of groups.values()) for (const [x1, y1, x2, y2] of list) d += `M${x1} ${y1}L${x2} ${y2}`;
      return trailSvg(g, d);
    },
    complete: (claims) => connected(m, claims),
    diagnose: (claims) => diagnose(p, claims),
    live: (claims) => liveCheck(p, claims),
    decor: () => walk(p, g),
    hintNext: (claims, isEmpty) => lineHint(roadEngine, { nextDeduction }, m, claims, solution, L.cellEdges, L.n, {
      baseState: () => initState(m), isPort: (ed) => ed >= L.PS, canFill: (i) => !m.blocked[i], isEmpty,
    }),
  }, { saved, onChange, onSolved, onVerdict, onLive });
}
