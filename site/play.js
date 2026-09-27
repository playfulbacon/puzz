// Golden Gate boards: tap a square to cycle its piece of road (─ │ ┌ ┐ └ ┘, then × for "no road
// here", then empty); long-press or right-click steps back.
import { geometry, defs, water, terrain, ships, fogBanks, shoreTop, shoreBottom, roadSvgD, bridgeDecor, foghorns, landNumbers } from "../core/render/board.js";
import { buildModel, initState } from "../core/road/engine.js";
import { roadEngine, nextDeduction } from "../core/road/human.js";
import { diagnose, connected } from "../core/road/diagnose.js";
import { mountPieces, solutionPieces, lineHint, BIT, X, H, V, NE, NW, SE, SW } from "./pieces.js";

const ALL = [H, V, SE, SW, NE, NW];

export function mountBoard(host, p, { saved = null, onChange = () => {}, onSolved = () => {}, onVerdict = null } = {}) {
  const g = geometry(p, 60); g.id = "pz" + p.seed;
  const { L, s } = g;
  const m = buildModel(p);
  host.innerHTML = `<svg class="board live" viewBox="0 0 ${g.W} ${g.H}" xmlns="http://www.w3.org/2000/svg" role="application" aria-label="Puzzle board: tap a square to change its piece of road">
    ${defs(g.id, g)}${water(p, g)}${terrain(p, g)}${ships(p, g)}${fogBanks(p, g)}
    ${shoreTop(p, g)}${shoreBottom(p, g)}
    <g class="marks"></g><g class="road-layer"></g><g class="decor-layer"></g>
    ${foghorns(p, g)}${landNumbers(p, g)}<g class="hint-layer"></g>
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
  const cycle = (i) => {
    if (m.blocked[i]) return null;
    const list = ALL.filter((x) => fits(i, x));
    return portBit(i) ? list : [...list, X];
  };
  const solution = solutionPieces(L.n, L.cellEdges, p.solution, portBit);
  const centre = (i) => [g.cx(i % p.cols), g.cy(Math.floor(i / p.cols))];

  const H_ = { nextDeduction };
  return mountPieces(svg, { road: layer("road-layer"), marks: layer("marks"), decor: layer("decor-layer"), hint: layer("hint-layer") }, {
    n: L.n, s,
    cellRect: (i) => ({ x: g.X0 + (i % p.cols) * s, y: g.Y0 + Math.floor(i / p.cols) * s }),
    centre, cycle,
    ports: (i) => {
      const [cx, cy] = centre(i), out = [];
      if (i === L.S) out.push([cx, cy + s / 2, g.plaza[0], g.plaza[1] - s * 0.13]);
      if (i === L.T) out.push([cx, cy - s / 2, g.vista[0], g.vista[1] + s * 0.17]);
      return out;
    },
    solution,
    draw: (groups) => {
      let d = "";
      for (const list of groups.values()) for (const [x1, y1, x2, y2] of list) d += `M${x1} ${y1}L${x2} ${y2}`;
      return roadSvgD(g, d);
    },
    complete: (claims) => connected(m, claims),
    diagnose: (claims) => diagnose(p, claims),
    decor: () => bridgeDecor(p, g, [...p.solution, L.PS, L.PN]),
    hintNext: (claims) => lineHint(roadEngine, H_, m, claims, solution, L.cellEdges, L.n, {
      baseState: () => initState(m), isPort: (ed) => ed >= L.PS, canFill: (i) => !m.blocked[i],
    }),
  }, { saved, onChange, onSolved, onVerdict });
}
