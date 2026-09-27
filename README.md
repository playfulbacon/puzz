# puzz

Original, themed logic puzzles in the Nikoli tradition: short rules, one solution, no guessing, and a
theme that explains the rules rather than decorating them.

Collections so far (write-ups in `research/`):

- **Golden Gate**: Spans, Shipping Lanes, Fog Signals. One International Orange road across the bay.
- **Cable Cars**: lines between turntables on a terraced city; streets run straight up the hills, so
  lines only turn on level ground.
- **Sasquatch**: turn the hikers to face the right way; exactly one square is left out of sight.

Play at `site/` (GitHub Pages) or locally:

```
npm run serve        # then open http://localhost:8000/site/
npm test             # engine rules, uniqueness, and every shipped puzzle
npm run generate     # regenerate site/data/puzzles.js (--variants spans --seeds 1000 for one variant)
```

## Versioning

The site shows its version in the corner of every page and checks the server for a newer one on
load (offering a cache-clearing reload). **Every change bumps the version**:

```
npm run bump -- minor "What changed"     # or patch / major
```

This updates `site/version.js`, `site/version.json` and `CHANGELOG.md`; a test checks they agree.

## Layout

```
research/                 principles, generation heuristics, Golden Gate design write-up
core/lib/human.js         engine-agnostic human-style solver, path-shape metrics, quality gates
core/road/                Golden Gate engine: one road shore to shore (engine, route walker, adapter)
core/tracks/              Cable Cars engine + generator: several lines, crossings, level-ground turns
core/hide/                Sasquatch engine + generator: hiker facings, exactly one blind spot
core/variants/            variant metadata (rules text, hints) and collections; Golden Gate generators
core/render/              SVG art: board.js (Golden Gate), cable.js, forest.js
site/                     the web app (no build step; imports ../core directly); play*.js boards
cli/generate.mjs          batch generation, gating and level selection
test/                     node:test suite
```

## Deploying

`.github/workflows/pages.yml` runs the tests and publishes `site/` + `core/` on every push to
`master`. One-time setup: in the repo on GitHub, **Settings → Pages → Build and deployment → Source:
GitHub Actions**. The site then lives at `https://playfulbacon.github.io/puzz/`.
