# Sasquatch

The brief: hide the Sasquatch in a wooded area where people are hiking. The Sasquatch must go in a square where humans can't see it.

## The rules

> Turn each hiker to face the right way. A hiker sees every square straight ahead until a tree blocks the view; a number says how many squares that is.
> Facing the right way, the hikers leave exactly one square of the woods out of sight. Hide the Sasquatch there.

The player works out which way each hiker is looking. The Sasquatch's hiding place is the answer the whole board converges on: the one square left in shadow.

| Real thing | Puzzle rule |
|---|---|
| Hikers look where they're walking | Each hiker sees one straight line ahead, not behind (so a Sasquatch can stand right at their back) |
| Trees block the view | Sight stops at the first tree |
| Some hikers are counting what they see | A number is the length of that hiker's view |
| Bigfoot is never seen | Exactly one square is out of everyone's sight |

**How it looks.** A Pacific Northwest forest below a snow-capped peak. Conifers come in three greens, one with a redwood trunk. Hikers wear bright jackets and cast warm sight beams straight ahead. Every square no beam reaches is in shadow, so as you turn hikers the shadows shrink toward the answer. The Sasquatch waves when you've found the spot. Along the bottom: "TRAILHEAD · NO SASQUATCH SIGHTINGS REPORTED".

## How the design got here: a first version that was too easy

The first version was a placement puzzle: one Sasquatch per patch of woods, out of sight of every hiker and of each other.

- It generated easily, but nearly every puzzle was band 1–2. Crossing off the squares hikers can see did almost all the work, because every constraint was local, so uniqueness needed lots of local clues.
- One-way hikers made each clue weaker, but the generator then needed 10–13 hikers per board, and puzzles stayed easy and got cluttered.
- The fix was a **global rule**: exactly one square in shadow. It links every hiker to every other, which produces the signature technique, *two blind spots*: "if this hiker faced that way, two squares would be unwatched, but there is only one Sasquatch."

This is the same lesson as Spans v1 (`golden-gate.md`): when every puzzle comes out easy, the fix is in the rules, not the generator.

## Principles applied

- **The story makes the global rule.** "Nobody sees the Sasquatch" plus "there's only one Sasquatch" gives exactly one blind spot.
- **Techniques:** *measure* (a number fits only some directions), *two blind spots* (tier 2, the signature), *watch* (once the hiding place is known, every other square needs a watcher, and a square only one hiker can still see decides that hiker), and look-aheads.
- **Clues must earn their place.** Every hiker starts numbered; the generator removes numbers one at a time while the answer stays unique. Ambiguity is repaired by dropping a redundant hiker or planting a tree that changes a hiker's view length, never by adding decoration.
- **A busy trail is part of the design.** Each hiker watches one line, and every square but one must be watched, so an 8×8 wood needs about 12 hikers whatever the tree density. The art keeps hikers small and bright.

## Results

| Attempts | Distinct | Pass every gate | Bands |
|---|---|---|---|
| 8000 | 3000 | 1328 | 1: 1010, 2: 1394, 4: 596 |

About one seed in three yields a valid puzzle (the rest can't be repaired to a unique answer), at a few milliseconds each. Every shipped puzzle passes every gate.

**The honest gap:** Sasquatch never reaches band 5, and it has no tier-3 technique yet. Hard is the most demanding band-4 puzzles that pass every gate. A named mid-tier technique (for example "pairs of hikers who between them must cover two squares") would give a truer medium/hard split.

**Family.** Akari / Light Up (sight lines stopped by walls) and one-way searchlight puzzles. The new parts are that you decide which way people look rather than where things go, and the single "exactly one square in shadow" rule.
