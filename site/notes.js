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
      ["You're the Sasquatch.", "The hikers aren't yours to move: each faces a fixed way and looks straight ahead until a tree blocks the view. Every square in a sight beam is off limits."],
      ["Sneak from the den to the river.", "One unbroken trail, no branches, no loops, from the cave at the bottom to the water at the top."],
      ["Every snapped twig is heard.", "A number on a hiker is how many trail squares pass among the eight squares around them. You have to pass close, but exactly that close."],
    ],
    techniques: [
      ["Out of sight", "Sight beams wall off the woods; the trail has to thread the gaps between them."],
      ["Heard enough", "A hiker whose count is already met hears no more: the trail stays out of their other squares."],
      ["Every twig", "A hiker needing as many squares as the trail can still use around them gets all of them."],
      ["Overlap", "Two hikers sharing squares: the difference in their numbers settles the squares only one of them hears."],
      ["No dead ends", "The trail must keep going; pockets it can't leave, and squares it can't reach unseen, stay empty."],
    ],
    lineage: "It shares Fog Signals' counting (the part that felt best to solve) and adds sight lines that close off whole rows and columns. The player is the hunted, not the watcher.",
    generator: "The hidden trail is a chain of straight runs from den to river, with a few trees off the trail. Hikers are added only where they rule out a rival trail, never where they could see the true one: by sight, by their count, or both. Then hikers are removed, or their numbers hidden, while the trail stays unique.",
    process: "The first Sasquatch had you turning the hikers to leave one blind spot. It was logically sound but put you in the wrong role: you were the watcher. Now the hikers are fixed and you are the one hiding. The rules reuse the counting that made Fog Signals the most satisfying so far, and puzzles are picked for a steady, cell-by-cell solve.",
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

};
