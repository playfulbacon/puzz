# Cable Cars

The brief: another San Francisco puzzle, about cable cars moving through the hilly city by the bay. How it works and looks was left open.

## The idea: the streets run straight up the hills

San Francisco's street grid was laid out as if the hills weren't there, which is why the streets are so famously steep. That one fact is the whole rule:

> Connect each pair of matching turntables with a cable car line. Lines run through square centres, go around the houses and never branch; two different lines may cross straight over each other.
> San Francisco's streets run straight up the hills, so a line only turns on level ground: the squares before, at and after a turn are all the same height. A cable car on the street shows a straight piece of line.

| Real thing | Puzzle rule |
|---|---|
| The grid ignores the hills; streets climb straight up | A line may change height only while running straight; turns need level ground |
| Cars reverse on turntables at the ends of the line (Powell & Market) | Each line joins a matching pair of turntables |
| California and Powell cross at the top of Nob Hill | Two different lines may cross at right angles |
| Painted Ladies along the streets | Houses block a square |
| Cable cars sit on their tracks | A given car shows a straight piece of line and its direction |

**How it looks.** A terraced city in four height bands, from the waterfront (0) to the hilltops (3). Contour lines are drawn heavier for steeper steps, and each square shows its height in a small numeral, so colour isn't the only cue. The bay with Alcatraz and a sailboat runs across the top and Market Street along the bottom. Houses are pastel Victorians, and turntables are wooden discs with a line badge. Drawn track looks like cable car rails, with the slot between them. It takes a line's colour (Powell–Hyde red, Powell–Mason green, California blue) as soon as it reaches that line's turntable. When the puzzle is solved, a cable car rides each line back and forth.

## Principles applied

- **The story predicts the rule.** You can explain the level-ground rule by pointing at a photo of Hyde Street.
- **The map is the clue.** Like Spans, the terrain carries most of the information, and reading contour lines is most of the game.
- **A global rule.** Lines must join their own pair without branching or looping, and must not cross themselves. That gives "which line?" deductions and dead-end pockets.
- **The easy clue comes from the theme.** A parked cable car shows a straight piece of line. The generator uses cars to break rival solutions and to put information back for gentler levels.
- **Techniques found by the solver:** *steep* (can't turn here, so carry straight on), *turntable* (one track out, often forced by the slope), *crossing*, *which line?*, *out of reach*, *dead-end pocket*, and look-aheads.

## What the process changed

1. **Terrain noise.** The first terrain came from quantised random bumps, and heights flickered between 2 and 3. It didn't look hilly, and the rule felt arbitrary. Stretching the height field so every city runs from 0 to 3 made the hills readable.
2. **Everything was band 5.** With terrain as the only clue, puzzles were unique but needed long look-aheads. Adding the parked cable car as a clue gave a thematic dial: the generator removes every car it doesn't need, then adds some back for gentler levels. The shipped set now covers bands 1–5.
3. **The breakthrough metric.** Medium and hard puzzles had a good shape (long opening, one hard step about two-thirds through, a steady finish) but failed "breakthrough", because a line puzzle rarely offers three options at once. The metric now also counts a hard step followed by four or more easy steps. See `generation-heuristics.md` §3.

## Results

| Attempts | Distinct | Pass every gate | Bands |
|---|---|---|---|
| 840 | 820 | 413 | 1: 321, 2: 72, 3: 55, 4: 85, 5: 287 |

Every shipped puzzle passes every gate. Sizes are 6×6 to 8×8 with two lines; the generator supports three lines from 9×9, but the uniqueness search gets slow there.

**Family.** Numberlink / Arukone (pairs joined by lines) and Masyu-style turn rules. The height map as the main clue, turns only on level ground, and lines crossing each other are the new parts.

## Next ideas

- Three- and four-line cities at 9×9+, which need a faster oracle (e.g. SAT).
- A "grip" clue: a square where a line must be climbing (it changes height as it passes).
- A shared-track rule, like Powell–Hyde and Powell–Mason sharing Powell Street. Probably its own variant.
