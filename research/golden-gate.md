# Golden Gate: three bridge puzzles

The brief: puzzles inspired by San Francisco and the Golden Gate Bridge that **end with one line moving over the grid**. The line is the bridge, it connects landmasses, and it may have to go around obstacles. Try several variants, explain how the principles apply, and make the visuals match the theme.

All three variants share one ending. A single International Orange road runs from the **toll plaza in San Francisco** (the bottom shore) to **Vista Point in Marin** (the top shore), across the bay. They differ in what stands in the bay and what the clues say. That makes them a fair comparison: the same kind of solution, three different clue languages.

Play them: `python3 -m http.server` from the repo root, then open `/site/`. Once GitHub Pages is enabled, the Actions workflow deploys the site on every push.

---

## The shared frame

| Principle (from `japanese-logic-puzzle-principles.md`) | How the frame applies it |
|---|---|
| Rules in one or two sentences | Every variant's rules are two sentences, and the first sentence is shared: *"Build one road from the toll plaza to Vista Point that never branches or crosses itself."* |
| A global rule linking distant parts | "One road, shore to shore" is global. Loops, dead ends, pockets you can't get out of, and finishing too early are all ruled out by it, and they become the mid-tier techniques. |
| The theme predicts the rules | Each variant's second sentence is a fact about bridges, ships or fog, written as a constraint (details below). |
| The solved grid is the picture | The finished puzzle is always *a bridge across the bay*. On completion the fog lifts, the road glows, and the longest straight span over water gets two towers, main cables and suspenders. |
| No outside knowledge | You don't need to know anything about San Francisco to solve these. The theme only helps you remember the rules. |
| Hand-set feel from a generator | Everything in `generation-heuristics.md`: a human-style solver trace, path-shape gates, removing clues that aren't needed, and curation. |

---

## Variant 1 — Spans

> Build one road from the toll plaza to Vista Point that never branches or crosses itself.
> Over open water it runs dead straight, so it can only turn on land. A number on an island counts the island squares the road uses.

**Where the rules come from.** A bridge span can't bend, so the road turns only on land. That one fact makes the *map itself* the main clue: islands are the only places the road can change direction, and rocks block the straight lines between them. Island numbers exist only because the map sometimes isn't enough, like a surveyor noting how much of an island the road crosses.

**The techniques the rules produce** (found by the solver, not designed in):
- *No landing*: a span heading this way would hit the edge or a rock before reaching land, so it's never built. This is the usual way in, and there are always several (opening width is typically 20+).
- *Straight on*: once the road is on water, it carries straight across to the far shore.
- *Island counts*: a satisfied island closes; an island needing every free square takes them all.
- *Look-ahead*: which island a span lands on decides whether the road can still finish. This is the expert tier.

**Family.** Relatives are Hashiwokakero (straight bridges between islands) and Country Road (one line, numbered regions). The new element is one road threading both land and water, where land is the only place it can turn.

**What the process changed.** The first version used single-square islets: turn only on an islet, and visit every islet. It had no numbers at all, and every puzzle came out band 1, at every grid size. When the road must turn at every islet and visit all of them, every choice is forced. The metrics caught it before anyone played a puzzle. Redesigning around multi-square landmasses (the road may wander on land but not on water) fixed it, and it is closer to "connecting landmasses" anyway. The generator also learned a new way to remove competing solutions: *erosion*, which wears an unused land square back into water where the competing route can't turn.

## Variant 2 — Shipping Lanes

> Build one road from the toll plaza to Vista Point that never branches or crosses itself, and keep it off the ships.
> Each ship sails straight out to sea along its lane. The road may only cross a lane at right angles, and the number says how many times the ship passes under it.

**Where the rules come from.** Ships leave the bay through the Golden Gate. A bridge crosses a shipping channel, it never runs along one, so wherever the road meets a lane it crosses straight over. The number counts how often that ship passes under the bridge. The ships are also the obstacles the road has to go around.

**The techniques:**
- *Straight across*: a lane square with road on it is a straight crossing, which pushes the road into the next row or column.
- *Clear channel*: a ship's 0 empties its lane. Once a ship has its crossings, the rest of its lane is empty.
- *Every crossing*: a ship needing as many crossings as it has free lane squares gets them all.
- Where lanes cross each other, the road can't use that square at all. It can't cross both lanes at once.

**A difficulty knob taken from the fiction.** The generator can *hide a ship's number* and keep the ship. Its lane still forbids running along it. This removes information without removing the constraint, a finer step than deleting clues outright.

**Family.** Yajilin's arrows also count along a line. Here the count is of crossings, and the lane itself limits the road's direction.

**Honest assessment.** This is the gentlest variant: at 7×7 almost everything is band 1. Harder puzzles come from 9×9 and 10×10 bays. It's the natural first puzzle in the set.

## Variant 3 — Fog Signals

> Build one road from the toll plaza to Vista Point that never branches or crosses itself, and keep it off the foghorns.
> Each foghorn hears the road nearby: its number counts the road squares among the eight squares around it.

**Where the rules come from.** In fog you can't see the bridge, only hear it. The board is literally foggy (soft banks drift over the water), the clues are sounds, and solving it lifts the fog.

**The techniques:**
- *Silence*: a 0 clears all eight squares around it. This is the way in.
- *Full chorus*: a foghorn needing every free square around it gets them.
- *Overlap*: two foghorns that share squares, where the difference in their numbers settles the squares only one of them hears. This is the signature technique, and the only variant where tier 4 is a real deduction rather than a look-ahead.
- Connectivity does half the work. A count that could be met two ways is settled by where the road can go next.

**Family.** Minesweeper's neighbour counts, and loop puzzles with neighbourhood clues. Counting a single connected road instead of scattered mines is what makes it a path puzzle.

**Honest assessment.** This is the hardest variant. Minimal puzzles are mostly bands 4–5, so gentle ones are made by putting redundant foghorns back. Its opening is often narrow (1–3 ways in), which is the gate it fails most.

---

## How the principles were applied to generated puzzles

Pipeline (`core/variants/common.js`), identical for all three:

1. **Route.** A random chain of straight spans from shore to shore (`core/road/walk.js`) that never runs alongside itself. Spans are what make the solved line read as a *bridge*, not a scribble.
2. **Clues from the route.** Land at every Spans turn; nothing for Lanes and Fog.
3. **Add a clue only to rule out a competing solution.** The oracle finds another solution; a clue that the true route satisfies and the rival breaks is added. No clue exists without a reason.
4. **Remove every clue that can go** (random order, uniqueness re-checked each time).
5. **Add some back for gentler levels** (the `addBack` knob).
6. **Human-solve and measure** (`core/road/human.js`). One deduction at a time, cheapest tier first:

   | Tier | Techniques |
   |---|---|
   | 1 Direct | keep going, dead end, both ends used, straight on / no landing, clue satisfied / clue needs all |
   | 2 No loops | joining two ends of one piece |
   | 3 Connection | out of reach, dead-end pocket, bottleneck, not too soon |
   | 4 Overlap / short look-ahead | two overlapping counts; a what-if that fails within 3 steps |
   | 5 Long look-ahead | a what-if that fails within 30 steps |

   Anything still stuck is rejected: no puzzle needs guessing.
7. **Gate and select.** The quality gates (opening, ramp, breakthroughs, stall, finish, variety, clue use) come from `generation-heuristics.md`. The CLI samples many seeds and sizes, sorts them into Gentle (bands 1–2), Medium (3–4) and Hard (5), and keeps the best of each.

**Results of the shipped build** (`site/data/puzzles.js`, 6 puzzles per level per variant):

| Variant | Attempts | Distinct puzzles | Pass every gate | Bands (count) | Most-failed gates |
|---|---|---|---|---|---|
| Spans | 6000 | 4205 | 1705 | 1: 1706, 3: 97, 4: 395, 5: 2007 | finish, breakthroughs, ramp |
| Shipping Lanes | 1500 | 1175 | 846 | 1: 921, 3: 109, 4: 23, 5: 122 | breakthroughs, finish, ramp |
| Fog Signals | 720 | 542 | 72 | 1: 76, 3: 53, 4: 189, 5: 224 | breakthroughs, opening, finish |

Every shipped puzzle passes every gate **except Shipping Lanes / Medium**. None of its 132 band 3–4 candidates has a breakthrough: the hard step (usually a bottleneck) happens, but it doesn't open the grid up afterwards. Those six puzzles are marked ✗ in their setter's notes rather than having the gate relaxed to fit. This is the first thing to look at in play-testing.

**What the metrics taught us:**
- *The hard step comes last.* The most common failing gate is **finish**: the look-ahead lands at the very end, so there's no easy finish after it. That's the "flat, machine-like ending" flaw, and the gates filter it out.
- *Difficulty is bimodal.* Puzzles tend to be either all direct deductions or need a real look-ahead. Mid-tier connection techniques are rarely the hardest step, and grading look-aheads by depth recovered a medium band.
- *Clue use catches patching.* Clues added only to force uniqueness sometimes go unused in the human solve (§4 of the heuristics note). Island numbers in Spans fail this most often.

Each shipped puzzle carries its measurements. **Setter's notes** under the board shows them against their targets.

## Visual language

- **Palette:** International Orange road (#C0362C); bay blues (#173E53 → #24566F); golden Marin headlands (#D4AA62); the green Presidio (#6D8555); fog white.
- **Shores frame the puzzle:** Marin's hills across the top with the Vista Point marker, San Francisco across the bottom with the toll plaza, a skyline and one Transamerica Pyramid.
- **Clues are objects:** islands with sand and grass rims, slate rocks, ships with wakes that mark their lanes, foghorns with sound rings.
- **The payoff:** fog lifts, marks fade, the road glows, and towers and cables rise on the longest straight span over water.
- **Type:** Josefin Sans for display and clue numbers (geometric, deco-era); Inter for body text.

## Next steps worth trying

- **Hand-set showpieces.** One or two per variant as the reference for "good", per the heuristics note.
- **A two-tower rule.** The real bridge has exactly two towers on its main span. A fourth variant could make the solver place the towers.
- **Symmetric clue layouts** for Fog Signals, where clue positions are free.
- **Widen the Spans technique ladder** with a named mid-tier technique ("landing parity"?) if play-testing shows the look-ahead steps have a common pattern.
- **Calibrate** by timing real solves per band.
