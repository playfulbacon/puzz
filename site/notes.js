// Design notes shown in the app. The long form lives in research/golden-gate.md.
export const NOTES = {
  spans: {
    fiction: [
      ["A span can't bend.", "Over open water the road runs dead straight, so every turn happens on land. This one rule turns the map itself into the clue: islands are where the road can change direction."],
      ["Surveyors count the island.", "A number on an island says how many of its squares the road uses. Numbers appear only where the map alone isn't enough."],
      ["One road, shore to shore.", "No branches, no loops. The global rule is what links distant parts of the bay."],
    ],
    techniques: [
      ["No landing", "A span heading this way would run into the edge or a rock before reaching land, so it's never built. This is the usual way in."],
      ["Straight span", "Once the road steps onto water, it carries straight on to the far shore."],
      ["Island count", "An island with its number reached lets the road pass no further; one needing every free square takes them all."],
      ["Look-ahead", "In harder bays, which island a span lands on decides whether the road can still finish."],
    ],
    lineage: "Relatives: Hashiwokakero (straight bridges between islands) and Country Road (numbered regions on a single line). What's new here is one road threading both land and water, where land is the only place it can turn.",
    generator: "The hidden route is built from straight spans. Land grows around every turn. Clues are added only to rule out a competing route: an island number, a rock, or an unused land square worn back into water. Then every clue that can go is removed.",
  },
  lanes: {
    fiction: [
      ["Ships sail out to sea.", "Each ship's lane runs straight from its bow to the edge of the bay (or the first obstacle)."],
      ["A bridge crosses a channel; it never runs along one.", "Wherever the road meets a lane it must go straight across at a right angle."],
      ["The number is how many times the ship passes under the bridge.", "Some ships carry no number, and their lanes still forbid running along them."],
    ],
    techniques: [
      ["Straight across", "A lane square with road on it is a straight crossing, which pushes the road into the next row or column."],
      ["Clear channel", "A 0 ship's lane is road-free; once a ship has all its crossings, the rest of its lane is empty."],
      ["Every crossing", "A ship needing as many crossings as it has free lane squares gets all of them."],
      ["No loops, no dead ends", "The single road has to thread between the lanes and still reach Marin."],
    ],
    lineage: "Relatives: Yajilin's arrows also count along a line. Here the count is of crossings, and the lane itself limits the road's direction, a rule taken straight from the fiction.",
    generator: "Ships are placed only where their lane is consistent with the hidden route and rules out a competing route. Then ships are sunk, or their numbers hidden, until nothing more can go.",
  },
  fog: {
    fiction: [
      ["You can't see the bridge in the fog.", "You can only hear it, and see its towers."],
      ["Each foghorn counts the road squares among the eight squares around it.", "The number is how much of the bridge it can hear close by."],
      ["The towers rise above the fog in pairs.", "Like the Golden Gate's two towers, each pair holds up one straight span: the road runs straight over both, with no turn between. That lets you build pieces of road in the middle of the bay long before they join up."],
      ["When the road is complete, the fog lifts.", "The cables go up between each pair of towers."],
    ],
    techniques: [
      ["Silence", "A 0 foghorn clears all eight squares around it. This is usually the way in."],
      ["Full chorus", "A foghorn needing every free square around it gets them all."],
      ["Lonely tower", "A tower with no twin it could reach along its row (a foghorn, the edge, or a third tower in the way) must run up and down, and the other way round."],
      ["Twin", "Once you know which way a tower runs, and only one tower is in reach that way, the road runs straight from one to the other: lay the whole span."],
      ["No third tower", "A stretch that already holds a pair can't run on into another tower, so it must turn first."],
      ["Shapes", "Only a few road shapes fit around a foghorn once some squares are known. Try them by eye: whatever they all agree on is certain. This is the hard puzzles' main tool."],
      ["Overlap", "Two foghorns that share squares: the difference in their numbers settles the squares only one of them hears."],
    ],
    lineage: "Relatives: Minesweeper's neighbour counts, and loop genres with neighbourhood clues. Counting a single road instead of mines makes connectivity do half the work. The towers borrow the idea of paired endpoints on a line (as in Hashi's bridges), but here the pair is a straight stretch of the one road, and a third tower may not share it.",
    generator: "Tower pairs are placed first on the hidden route's longer straight runs, at least a square apart. Foghorns go only on squares the route avoids. Wherever a solver that never looks ahead gets stuck, the generator adds a foghorn or tower pair that lets it carry on from exactly there; then it removes every clue it can while the puzzle stays unique and solvable without look-aheads. No Fog Signals puzzle needs a look-ahead.",
  },
  cablecar: {
    fiction: [
      ["San Francisco's streets run straight up the hills.", "The city's grid was laid out without regard for the terrain, which is why the streets are so famously steep. So a cable car line only turns on level ground: the square before, the turn itself, and the square after all sit at the same height."],
      ["Each line runs turntable to turntable.", "Cars reverse on turntables at the ends of the line (Powell & Market is the famous one). Matching letters mark each line's two ends."],
      ["Lines cross straight over each other.", "Like California and Powell at the top of Nob Hill. Two different lines may cross at right angles, but a line never meets itself and never branches."],
      ["A cable car on the street shows the way.", "It sits on a straight piece of its line, running the way it faces. These are the gentle clues, and the generator adds more of them to easier puzzles."],
    ],
    techniques: [
      ["Steep", "On a slope a line can't turn, so once it arrives it must carry straight on, or never come this way at all. Reading the contour lines is most of the game."],
      ["Turntable", "Exactly one track leaves each turntable. On a slope that often settles which way it goes."],
      ["Which line?", "A piece of track that already reaches turntable A can't join a piece from B."],
      ["Reach and pockets", "Streets no pair of turntables can use stay empty, and a line can't enter a dead-end pocket without crossing itself to get out."],
      ["Look-ahead", "In harder cities, a line forced up a slope runs into a dead end several squares later."],
    ],
    lineage: "Relatives: Numberlink / Arukone (pairs joined by lines) and Masyu's turn rules. New here are the height map as the main clue, turns allowed only on level ground, and lines allowed to cross each other.",
    generator: "Lines are laid first as straight runs with a few turns, crossing only straight over another line. Hills are raised as smooth terraces and levelled around every turn. If a rival set of lines exists, the generator tilts a square the rival needs to turn on, places a house on the rival's street, or parks a cable car on the true line. Every house and car that isn't needed is then removed.",
    process: "First drafts had noisy terrain (heights flickering between 2 and 3), which made the rule feel arbitrary, and almost every puzzle needed long look-aheads. Stretching the hills to run from the waterfront (0) to the hilltops (3) fixed the look. Parked cable cars gave a thematic way to add information back, which is what produces the gentle levels.",
  },
  sasquatch: {
    fiction: [
      ["You're the Sasquatch family.", "Sasquatches are solitary: each keeps to its own patch of woods, and the creeks mark where one patch ends and the next begins. One Sasquatch per patch."],
      ["Nobody sees a Sasquatch.", "Hikers look the way they're walking, straight ahead until a tree or another person blocks the view. You don't move them; you hide from them. Sasquatches look along their row and column, and they keep out of each other's sight too."],
      ["You keep an eye on them.", "Every hiker is watched by at least one Sasquatch: from beside them or behind, where they aren't looking. Hide, but never lose track of the humans."],
    ],
    techniques: [
      ["Out of sight", "Beams close off squares before you start; each Sasquatch you hide closes off its row and column up to the nearest tree or person."],
      ["Last spot", "A patch with one square left: the Sasquatch hides there. A hiker only one square can still watch: same."],
      ["Claimed", "Wherever a patch's Sasquatch ends up, it would see a certain square: nobody hides there. The same works for the squares that could watch a hiker."],
      ["Watcher's patch", "Every square that could watch a hiker lies in one patch: that patch's Sasquatch is the watcher, so the rest of the patch is empty."],
      ["Squeeze", "A Sasquatch here would leave another patch with nowhere to hide, or a hiker nobody could watch. Hard puzzles extend this to two patches at once."],
    ],
    lineage: "A placement puzzle, not a line: the family of Star Battle and Akari. Regions holding one each come from Star Battle; sight blocked by walls from Akari. The new parts are the one-way sight of the hikers, which makes 'behind a hiker' the safest place in the woods, and the rule that every hiker must be watched, which turns hiding into stalking and gives the puzzle positive clues as well as forbidden squares.",
    generator: "Trees are scattered, then the family is placed so no two can see each other, then the patches are grown out from each Sasquatch. Wherever a rival answer exists, the generator either reshapes the patches (moving a border square from one patch to its neighbour) or adds a hiker who can't see the family and is watched by it. Wherever a solver that never looks ahead gets stuck, it does the same to let the solver carry on. Then hikers are removed wherever the puzzle stays unique and solvable without them.",
    process: "Version one had you place Sasquatches out of hikers' sight: every constraint was local, so it was too easy. Version two had you turning the hikers to leave one blind spot: sound, but you were controlling the humans. Version three had you sneak a trail to the river: better fiction, but it was Fog Signals with a skin. This version is a different kind of puzzle altogether: you place, you don't draw, and the humans are fixed obstacles you both hide from and watch.",
  },
};

export const METRIC_INFO = [
  ["opening", "Ways in", "Easy first moves available at the start", "≥ 3", (a) => a.opening >= 3],
  ["ramp", "Ramp", "How far through the solve the hardest step first appears", "0.15–0.75", (a) => a.band <= 2 || (a.ramp >= 0.15 && a.ramp <= 0.75)],
  ["breakthroughs", "Breakthroughs", "A hard step that opens up the grid again", "1–6", (a) => a.band <= 2 || (a.breakthroughs >= 1 && a.breakthroughs <= 6)],
  ["stall", "Longest stall", "Longest run with only one move available", "≤ 6 (≤ 10 hard)", (a) => a.stall <= (a.band <= 3 ? 6 : 10)],
  ["finish", "Finish", "Share of the grid that falls easily after the hardest step", "≥ 0.2", (a) => a.finish >= 0.2],
  ["variety", "Variety", "Different techniques used", "≥ 4", (a) => a.band <= 2 || a.variety >= 4],
  ["lookaheads", "Look-aheads", "Moves that need trying something and following it through", "≤ 2 (0 in Fog, Sasquatch)", (a) => (a.lookaheads ?? 0) <= 2],
];

export const TECHNIQUE_NAMES = {
  continue: "Keep going", full: "Both ends used", deadend: "Dead end", visit: "Must pass through",
  span: "Straight on", nospan: "No landing", "count-done": "Clue satisfied", "count-all": "Clue needs all",
  finished: "Finished", loop: "No loops", early: "Not too soon", reach: "Out of reach", pocket: "Dead-end pocket",
  bottleneck: "Bottleneck", overlap: "Overlap", lonely: "Lonely tower", last: "Last spot", patch: "Patch done", sight: "Out of sight", watch: "Only watcher", claim: "Claimed", "watch-claim": "Claimed by a watcher", "watch-patch": "Watcher’s patch", block: "Squeeze", pair: "Two-patch squeeze", twin: "Twin", third: "No third tower", shapes: "Shapes", "trial-short": "Short look-ahead", trial: "Long look-ahead",
  steep: "Steep", turntable: "Turntable", crossing: "Crossing", car: "Cable car", "wrong-line": "Which line?",

};
