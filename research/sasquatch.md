# Sasquatch

The brief: hide the Sasquatch in a wooded area where people are hiking, in squares where humans can't see it. Refined by feedback:
- *"I want to feel like I'm the Sasquatch hiding from humans who are not under my control."*
- After v3: *"Try something totally different."*

## The rules (v4, "the family")

> Hide one Sasquatch in every patch of woods (the creeks mark the patches).
> Nobody may see a Sasquatch. Hikers look straight ahead; Sasquatches look along their row and column. Trees and people block the view.
> Every hiker must be watched by a Sasquatch.

You place Sasquatches; you don't draw anything. The hikers are fixed, facing whichever way they happen to face. You hide from them and you watch them.

| Real thing | Puzzle rule |
|---|---|
| Sasquatches are solitary and territorial | One per patch; they keep out of each other's sight |
| Hikers look where they're walking | One-way sight: the squares beside and behind a hiker are safe |
| Trees and people block the view | Sight stops at the first tree or person |
| The Sasquatch keeps tabs on the humans | Every hiker is seen by some Sasquatch, from where they aren't looking |

**How it looks.** A stretch of woods from above, below a snow-capped peak. Creeks wind along the borders between patches, and each patch has a faintly different green. Hikers in bright jackets cast warm sight beams. You mark × for "nobody hides here" and place Sasquatch figures; when the family is complete they all wave.

## Why this design

- **Totally different from Fog Signals.** v3 (a trail from den to river past counting hikers) was a line puzzle with Fog's counting rule, and the user called that out. v4 is a placement puzzle, the Star Battle / Akari family. You narrow each patch's candidate squares until one is left, rather than growing a line.
- **The fantasy is hiding *and* stalking.** A pure hiding rule only forbids squares. That made v1 too easy: every constraint was local, and uniqueness needed a crowd of hikers. The watching rule adds *positive* constraints ("someone must be over here"). One-way sight is what makes both possible at once: beside or behind a hiker is exactly where you can see them and they can't see you.
- **Patches carry the global structure.** One per patch is the counting rule that links the whole board (as rows and regions do in Star Battle). Sight between Sasquatches links patches to each other, and the trees break sight lines so the links stay local and readable.

## Techniques

| Name | Tier | Idea |
|---|---|---|
| Last spot / only watcher | 1 | A patch with one square left; a hiker only one square can still watch |
| Out of sight / patch done | 1 | Cross off what a hidden Sasquatch sees, and the rest of its patch |
| Claimed | 2 | Every candidate of a patch (or every possible watcher of a hiker) sees this square, so it's empty |
| Watcher's patch | 2 | All of a hiker's possible watchers are in one patch: that patch's Sasquatch is the watcher |
| Squeeze | 2 | A Sasquatch here would empty another patch, or leave a hiker unwatchable |
| Two-patch squeeze | 3 | A Sasquatch here would leave patch A only squares that each empty patch B |

No puzzle needs a look-ahead: the generator guarantees it (see `generation-heuristics.md` §10).

## Generator

1. Scatter trees (about 7%).
2. Place the family (one per patch, as many patches as the grid is wide) so no two see or touch each other.
3. Grow the patches outward from each Sasquatch at random.
4. While a rival answer exists, either reshape the patches (hand one border square to the neighbouring patch, keeping both in one piece) or add a hiker. A hiker is placed only where they can't see the family and some Sasquatch watches them. Reshaping is preferred, so hikers stay few.
5. While a solver without look-aheads gets stuck, apply the same two moves, keeping only those that let it carry on.
6. Remove every hiker whose absence keeps the puzzle unique and solvable without look-aheads.

## History

- **v1, placement:** Sasquatches out of hikers' sight, one per patch. Too easy and cluttered, because every constraint was local.
- **v2, turning hikers:** Turn each hiker so exactly one square is left in shadow. Sound, but you were controlling the humans.
- **v3, the trail:** Sneak a line from the den to the river, with hikers counting snapped twigs. Better fiction, but it was Fog Signals with a skin.
- **v4, the family (this one):** Placement again, now with patches, mutual sight and the watching rule.

**Family.** Star Battle (one per region) and Akari (sight blocked by walls; lights mustn't see each other). The one-way sight and the watch rule are the new parts.
