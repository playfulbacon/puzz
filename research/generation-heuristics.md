# Fixing the common flaws of computer-generated puzzles

This note starts from what [`playfulbacon/puzzle-books`](https://github.com/playfulbacon/puzzle-books) worked out: its `docs/DESIGN-BRIEF.md` §3–4, `docs/PLAN.md` §3–4, and the `core/` code. It adapts that work to this project, which differs in two ways: **original genres** (not reskins) and **an interactive web app** on GitHub Pages.

## 1. The stance we inherit

Nikoli's case against generated puzzles is that they lack "the sense of communication between solver and author." puzzle-books answers that the qualities Nikoli names can be described, and anything describable can be measured and optimised for. Where a quality can't be measured, a human curates from candidates. The generator's job isn't "make unique puzzles." It is **"make puzzles a Nikoli setter wouldn't be embarrassed by," with a person making the final cut.**

We keep that stance and are honest about it: computer-generated, hand-selected, and a few showpieces set by hand.

## 2. Flaw → countermeasure

| # | Flaw of machine puzzles | Countermeasure | Kind | Status in puzzle-books |
|---|---|---|---|---|
| 1 | **Flat or front-loaded solving path.** Hard deductions come immediately, with no warm-up and no payoff. | **Path-shape metrics** from a human-solver trace (§3). | scored gate | specified, not built |
| 2 | **Difficulty labels that lie.** Ratings come from clue count or search effort. | Rate by the **hardest technique needed** plus how many hard steps there are. Calibrate with timed solves. | measured | provisional: rating by the oracle's branch count |
| 3 | **Guessing.** Uniqueness is proved by search, but a human would have to try things and backtrack. | **No bifurcation ever:** the human solver must finish; the top tier allows only short contradiction chains (depth ≤ 2–3). | hard gate | specified |
| 4 | **Random clue scatter.** | **Symmetric clue removal**: pick the symmetry group first, then remove clues in pairs or groups, never one at a time. **Dispersion**: no quadrant holds more than 40% of the clues, and no empty band of rows or columns. | hard gate + score | symmetric removal in Slitherlink and Gokigen |
| 5 | **Ugly or degenerate solutions.** Loops that hug the border, all-1 islands, all-2 bridges, 1×n strips. | Structural penalties per genre, and rewards for a pleasing solved silhouette. | score | specified |
| 6 | **Noisy clue palette.** | Limit the number of distinct clue values where that reads cleaner. | score | specified |
| 7 | **Trivial collapse.** One sweep of the easiest rules solves most of the grid. | Reject at band ≥ 3 if more than ~40% of the grid falls to tier-1 rules in one sweep. | hard gate | specified |
| 8 | **Near-duplicates.** | Hash each puzzle's canonical form under rotation and reflection. | hard gate | specified |
| 9 | **No author's voice.** | A **curation contact sheet**: solve, time, approve/maybe/reject, and tag. The tag vocabulary is itself a list of flaws: *great opening, showpiece, flat path, too easy, too hard, ugly layout, clue cluster*. | human | **built** (`review/`) |
| 10 | **No theme.** | **Clue-mask themes** (clues may only sit inside a chosen shape) and **solution themes** (bias the structure toward a target silhouette). | constraint | specified |
| 11 | **Arbitrary clues added just to force uniqueness.** *(new, from reading the code)* | See §4. | score | not addressed |

**The main gap.** puzzle-books has a very good *spec* for items 1, 2, 5, 6, 7 and 8, but its code only has the uniqueness oracle, a search-effort rating, symmetric removal in two genres, and the curation app. Everything that makes the path *feel* hand-made depends on a **human-technique solver**, and none has been built yet. Here we build it first, not last. Section 5 explains why original genres make it even more central.

## 3. Path-shape metrics (from DESIGN-BRIEF §4.2)

These are computed from the human solver's step log. Each step records `(tier, technique, cells decided, options available)`.

| Metric | Definition | Target |
|---|---|---|
| Opening width | Separate tier-1 deductions available at the start | ≥ 3 |
| Ramp | How far through the solve (0–1) the first max-tier step comes | 0.25–0.6 |
| Breakthroughs | A hard step taken at a stall that opens things up: ≥ 3 options next, or a run of ≥ 4 easy steps (line puzzles advance on a narrow front) | 1–6 |
| Stall depth | Longest run of steps with only one available deduction | ≤ 4 (bands 1–3), ≤ 8 (bands 4–5) |
| Finish | Share of the grid solved by the tier-1 cascade after the last max-tier step | ≥ 0.3 |
| Technique variety | Distinct techniques used | ≥ 3 at band ≥ 3 |

They map straight onto the craft principles in `japanese-logic-puzzle-principles.md` §4: a way in, flow, the aha, and a good ending. The "breakthrough" count is our measurable stand-in for the aha moment.

## 4. A flaw puzzle-books ran into: clues that exist only to force uniqueness

Two of its generators reach uniqueness by **patching**. Nurikabe plants 1-cell islands or moves clues so that competing solutions die. Masyu tweaks the loop until the pearls pin it. It works, but it leaves the classic machine signature: a clue whose only job is to kill a second solution that no human would ever have considered. Solvers experience it as arbitrary.

Heuristics:

- **Prefer removing clues or changing the structure over adding clues.** Only add a clue as a last resort.
- **Check that each clue gets used.** In the human solver's log, every clue should appear in at least one deduction the solver actually makes. A clue that was needed for uniqueness but never used in the solve is a red flag. Score it down, or swap it.
- **Watch for clue clusters from patching.** Patches pile up wherever alternative solutions live, which breaks dispersion (item 4) and symmetry.

## 5. What changes for original genres

Reskins inherit a known genre with a known technique ladder. We don't get one, so every genre has to prove itself.

1. **The technique ladder *is* the genre's design.** We write the rules, then find the techniques by running the human solver on generated puzzles and seeing where it gets stuck. Each stuck state is either a new technique to name and add, or evidence that the genre needs guessing. A genre whose ladder stays at 1–2 techniques is shallow. A genre that keeps needing search is broken.
2. **Acceptance tests for a new genre**, before any theme art:
   - rules fit in ≤ 2 sentences, stated in the theme's own terms
   - the theme **predicts** the rules (see principles §6.1); if you could swap the story for numbers and nothing would change, it's only a skin
   - there is a global rule linking distant parts of the grid (connectivity, a single loop, a flow), not just local counts
   - the ladder has ≥ 5 named techniques across ≥ 3 tiers
   - the generator reaches every band from 1 to 5 at usable acceptance rates
   - one or two **hand-set** puzzles exist and play well (a reference for "good" that the generator must match)
3. **Uniqueness-by-construction** is worth designing for. Rules where clues follow directly from the solution (Hashi-style: every clue is fixed by the structure) make generation cheaper and avoid §4. Rules where clues can be removed give finer control over difficulty. Choose deliberately for each genre.

## 6. What the web app gives us that print doesn't

The human solver pays for itself several times over in an interactive medium:

- **Hints for free.** "Next deduction" is the solver's next step, shown with its technique name and the cells it used, not a spoiler.
- **Tutorials generated from the ladder.** Each technique gets a tiny puzzle where it is the only way forward, and the tutorial ramp follows the ladder order. Rules are taught by playing, not by a paragraph.
- **Difficulty that means something.** A rating of "needs technique X" links to X's tutorial.
- **A solved-state reveal.** Completing the puzzle can animate the theme's payoff: water flows, lanterns light, the garden settles. This is where aesthetic value lands, and print can't do it.
- **Curation built in.** Keep puzzle-books' A/M/R review flow as a dev-mode view of the same app.

Carry over from puzzle-books' layout studies: one puzzle per screen, the grid as the hero, generous negative space (*ma*), a restrained palette, and a hand-ruled wobble as an optional texture. These fit the "quiet ritual" feel if the themes want it. Each theme may bring its own look.

## 7. Proposed architecture (mirrors puzzle-books)

Plain ES modules with no build step, so one core runs in Node (batch generation, tests) and in the browser (the app). It deploys to GitHub Pages through an Actions workflow.

```
puzz/
  research/                 these notes
  core/
    lib/                    seeded RNG, grid helpers, trace metrics, rating, symmetry, canonical hash
    genres/<name>/
      index.js              id, name, theme, one-line rules, defaults
      logic.js              generate() + countSolutions() (uniqueness oracle)
      techniques.js         human solver: ordered, tiered deduction rules; emits the step log
      render.js             SVG + interactive mount (input, check, hint, reveal animation)
      tutorials.js          one tiny puzzle per technique
  app/                      the player-facing site
  review/                   curation view (dev only)
  cli/                      generate, rate, pack
  test/                     per-technique positive/negative tests, uniqueness soak tests
```

Pipeline for every genre: **structure → clues → symmetric reduction (the oracle keeps it unique; the human solver keeps it solvable at the target band) → trace metrics → accept or retry → curate.**

## Source

puzzle-books at commit `54ec84f` (2026-09-04): `docs/PLAN.md`, `docs/DESIGN-BRIEF.md`, `docs/REVIEW-APP.md`, `docs/strategies/`, `core/lib/difficulty.js`, `core/genres/{nurikabe,masyu,slitherlink,gokigen}/logic.js`, `review/app.js`.

## 8. Interaction and feedback (app)

- **Taps only.** Every square is changed by tapping it: line puzzles cycle through the pieces that fit the square (─ │ ┌ ┐ └ ┘, ┼ where lines may cross), then × ("nothing here", the deduction mark), then empty. Long-press or right-click steps back. Pieces that would point off the map or into an obstacle are never offered.
- **Verdict on completion.** When the player's answer is complete in shape (the road links both shores, every turntable pair is linked, or every hiker is turned and the Sasquatch placed), the board says whether it's right. If it isn't, it explains why in the puzzle's own terms ("Spans can't bend: the road turns on open water here", "This ship would pass under the road 2 times; its number says 1", "3 squares are out of sight") and outlines the squares involved. See `core/*/diagnose.js`.
- **Live rule checks.** After every tap the board checks the player's marks against the rules, never against the answer, and outlines anything that already breaks one: a piece of road turning on open water, road running along a shipping lane, a line turning on a slope, two squares that disagree about a connection, a closed loop, two lines joined together, a clue already over its number (or with too many squares marked ×), a numbered hiker facing a way that gives the wrong count, a hiker looking straight at the Sasquatch. Unfinished work (a piece pointing at an empty square) is never flagged. Because the checks use only the rules, they never give away where the answer is. Tests assert they stay silent on every shipped solution and on half-finished ones (`test/live.test.mjs`).
- **Dots that join themselves (v1.6).** In the line puzzles, tap marks a square • ("road goes through here") or × ("no road here"); dots connect to every neighbouring road square (other dots, the shore, turntables, parked cars), so the player never cycles through piece shapes. A dot that could join more neighbours than a road can (more than two, or more than one at a turntable, four only where a crossing is legal) is outlined in red. For this to be exact, the generators guarantee the hidden route never runs alongside itself, and in Cable Cars that two different lines never touch except where they cross. A test marks dots on every road square of every shipped puzzle and checks they join into exactly its solution (`test/dots.test.mjs`). Long-press or right-click still picks an exact piece.
