# puzz

Original, themed logic puzzles in the Nikoli tradition: short rules, one solution, no guessing, and a
theme that explains the rules rather than decorating them.

**Golden Gate** is the first set: three puzzles that each end with one International Orange road
across the San Francisco Bay. Play at `site/` (GitHub Pages) or locally:

```
npm run serve        # then open http://localhost:8000/site/
npm test             # engine rules, uniqueness, and every shipped puzzle
npm run generate     # regenerate site/data/puzzles.js (--variants spans --seeds 1000 for one variant)
```

## Layout

```
research/                 principles, generation heuristics, Golden Gate design write-up
core/road/                shared road engine: model + deduction rules + oracle (engine.js),
                          human-style solver and path-shape metrics (human.js), route walker (walk.js)
core/variants/            spans.js, lanes.js, fog.js, and the shared generation pipeline (common.js)
core/render/board.js      SVG art for every variant
site/                     the web app (no build step; imports ../core directly)
cli/generate.mjs          batch generation, gating and level selection
test/                     node:test suite
```

## Deploying

`.github/workflows/pages.yml` runs the tests and publishes `site/` + `core/` on every push to
`master`. One-time setup: in the repo on GitHub, **Settings → Pages → Build and deployment → Source:
GitHub Actions**. The site then lives at `https://playfulbacon.github.io/puzz/`.
