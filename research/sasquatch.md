# Sasquatch

The brief: hide the Sasquatch in a wooded area where people are hiking. The Sasquatch must stay where humans can't see it. After playing it, the user sharpened the brief: *"I want to feel like I'm the Sasquatch hiding from humans who are not under my control"*, and the solving should feel like Fog Signals: cell by cell, narrowing the possibilities until the line is clear.

## The rules (v3, "the trail")

> Lead the Sasquatch from its den to the river along one trail that never branches or crosses itself, and never steps where a hiker can see: hikers look straight ahead until a tree blocks the view.
> A number on a hiker is how many twigs they heard snap: the trail squares among the eight squares around them.

You are the Sasquatch. The hikers are fixed, facing wherever they happen to face; you don't control them, you sneak past them. Every square a beam touches is off limits, and every number tells you how close the trail must pass (a 0 means give that hiker a wide berth; a 6 means you crept right around them).

| Real thing | Puzzle rule |
|---|---|
| Bigfoot is never seen | The trail never enters a hiker's sight line |
| Hikers look where they're walking | Each hiker sees one straight line ahead, not behind |
| Trees block the view | Sight stops at the first tree |
| Twigs snap underfoot | A number counts trail squares in the eight around that hiker |
| The den and the river | The trail runs from a fixed entrance to a fixed exit, one unbroken line |

**How it looks.** A green forest floor between a river (with a fir-lined far bank) at the top and a rocky hillside with a cave, the den, at the bottom. Hikers in bright jackets cast warm sight beams. The trail you draw is a worn dirt path with big footprints; when it's done the Sasquatch walks out of the den along it and waves from the riverbank: "Nobody saw a thing!"

## How the design got here

**v1, placement.** One Sasquatch per patch of woods, out of sight of every hiker and of each other. Nearly every puzzle was band 1–2: crossing off watched squares did almost all the work, and uniqueness needed 10–13 hikers, so boards were cluttered.

**v2, turning hikers.** Turn each hiker so exactly one square is left in shadow; hide the Sasquatch there. The global rule fixed the difficulty, but the user rejected the fantasy: the solver was *controlling the humans*, not being the Sasquatch. Theme predicting rules (principle 7) cuts both ways: rules that work mechanically but cast the player in the wrong role break the story.

**v3, the trail.** Keep what worked (sight lines stopped by trees) and put the player in the Sasquatch's feet. The trail is a single line, which gives the Fog Signals texture the user liked best: each deduction fills or crosses a square, which opens or closes the next one. It reuses the road engine (edge states, ports, blocked squares, counts), so it inherits the dots-that-join interaction, live rule checks and verdicts.

## Principles applied

- **The story makes the rules.** Hikers are obstacles you read, not pieces you move. Sight lines become blocked squares; heard twigs become neighbourhood counts. Both are facts about the hikers, fixed before you arrive.
- **Two kinds of clue, two kinds of reasoning.** Beams prune squares outright (tier 1, the break-in). Twig counts drive the narrowing: a 0 crosses off a ring, a high number forces the trail to hug a hiker, and a count that's almost satisfied closes the remaining neighbours. Counts combined with the one-line rule (dead ends, no branching, must reach the river) are where the mid-tier steps come from.
- **Clues must earn their place.** Candidate hikers are placed only where their view never touches the true trail. A hiker is added only when it kills a rival solution (a silent hiker must kill it by sight and see at least two squares); then every removable hiker is sunk and every removable number hidden, and a few are added back for a smoother ramp.
- **Trees are scenery that works.** 8–14% of off-trail squares get a tree, which cuts beams short, so where a hiker stands and which way they face both matter.

## Results

| Attempts | Unique | Pass every gate | Bands (of unique) |
|---|---|---|---|
| 600 | 543 | 185 | 1: 208, 3: 155, 4: 78, 5: 102 |

Shipped puzzles, measured by the human solver (R = mid-tier reasoning steps, L = look-ahead trials):

| Level | R | L |
|---|---|---|
| Gentle | 0 | 0 |
| Medium | 2–6 | 0 |
| Hard | 2–6 | 0–1 |

Medium and hard are solved by reasoning, square by square, with at most one short look-ahead: the target experience. Every shipped puzzle passes every gate.

**Family.** Slitherlink-style neighbourhood counts on a single path (as in Fog Signals), plus Akari-style sight lines stopped by walls. The new part is that the sight lines belong to people facing one way, and the counts are *around* them, so each hiker is both a wall of light and a clue.
