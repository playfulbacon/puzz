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
      ["You can't see the bridge in the fog.", "You can only hear it."],
      ["Each foghorn counts the road squares among the eight squares around it.", "The number is how much of the bridge it can hear close by."],
      ["When the road is complete, the fog lifts.", "It lifts on the finished road."],
    ],
    techniques: [
      ["Silence", "A 0 foghorn clears all eight squares around it. This is usually the way in."],
      ["Full chorus", "A foghorn needing every free square around it gets them all."],
      ["Overlap", "Two foghorns that share squares: the difference in their numbers settles the squares only one of them hears."],
      ["Look-ahead", "The road must still connect, so a count that could be met two ways is settled by where the road can go next."],
    ],
    lineage: "Relatives: Minesweeper's neighbour counts, and loop genres with neighbourhood clues. Counting a single road instead of mines makes connectivity do half the work.",
    generator: "Foghorns go only on squares the hidden route avoids, and only where their count differs between the true route and a competing one. Then they're removed one by one while the answer stays unique.",
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
      ["Hikers look where they're walking.", "Each hiker sees straight ahead until a tree gets in the way, and not behind them. A Sasquatch can stand right at a hiker's back."],
      ["Some hikers are counting.", "A number says how many squares that hiker can see, which is usually enough to tell which way they face."],
      ["There's exactly one square nobody can see.", "That's the only place the Sasquatch can be. Turning a hiker changes which squares are out of sight, and it must end with exactly one."],
    ],
    techniques: [
      ["Measure", "Count the squares to the first tree in each direction; a number fits only some of them."],
      ["Two blind spots", "If turning a hiker one way would leave two squares unwatched, it can't face that way. This is the signature technique."],
      ["Watch", "Once the hiding place is known, every other square must be watched. A square only one hiker can still see decides that hiker's direction."],
      ["Look-ahead", "Harder woods need you to follow a facing through several hikers before the contradiction appears."],
    ],
    lineage: "Relatives: Akari/Light Up (lines of sight stopped by walls) and puzzles with one-way searchlights. New here is the single global rule, exactly one square in shadow, and that you decide which way people are looking rather than where things go.",
    generator: "The hiding place is chosen first, then a sparse forest. Hikers are placed one by one where they watch the most unwatched squares, never facing the hiding place. Every hiker is numbered; if the facings still aren't unique, the generator drops a redundant hiker or plants a tree that changes what a hiker would see. Numbers are then removed one by one while the answer stays unique.",
    process: "The first design hid one Sasquatch per patch of woods, out of sight of hikers and of each other. It worked but was almost always easy, with a dozen hikers doing all the work. There was no global rule to reason with. Giving hikers a single facing, and making \"exactly one square in shadow\" the global rule, turned the hiding place into the answer to a real deduction.",
  },
};

export const METRIC_INFO = [
  ["opening", "Ways in", "Easy first moves available at the start", "≥ 3", (a) => a.opening >= 3],
  ["ramp", "Ramp", "How far through the solve the hardest step first appears", "0.15–0.75", (a) => a.band <= 2 || (a.ramp >= 0.15 && a.ramp <= 0.75)],
  ["breakthroughs", "Breakthroughs", "A hard step that opens up the grid again", "1–6", (a) => a.band <= 2 || (a.breakthroughs >= 1 && a.breakthroughs <= 6)],
  ["stall", "Longest stall", "Longest run with only one move available", "≤ 6 (≤ 10 hard)", (a) => a.stall <= (a.band <= 3 ? 6 : 10)],
  ["finish", "Finish", "Share of the grid that falls easily after the hardest step", "≥ 0.2", (a) => a.finish >= 0.2],
  ["variety", "Variety", "Different techniques used", "≥ 4", (a) => a.band <= 2 || a.variety >= 4],
];

export const TECHNIQUE_NAMES = {
  continue: "Keep going", full: "Both ends used", deadend: "Dead end", visit: "Must pass through",
  span: "Straight on", nospan: "No landing", "count-done": "Clue satisfied", "count-all": "Clue needs all",
  finished: "Finished", loop: "No loops", early: "Not too soon", reach: "Out of reach", pocket: "Dead-end pocket",
  bottleneck: "Bottleneck", overlap: "Overlap", "trial-short": "Short look-ahead", trial: "Long look-ahead",
  steep: "Steep", turntable: "Turntable", crossing: "Crossing", car: "Cable car", "wrong-line": "Which line?",
  measure: "Measure", watch: "Watch", gap: "Two blind spots", spot: "Last shadow",
};
