// Cable Cars (San Francisco series). Engine: core/tracks.
import { generate } from "../tracks/generate.js";

export const cablecar = {
  id: "cablecar",
  family: "tracks",
  name: "Cable Cars",
  tagline: "Straight up the hills, turning only on the level.",
  ruleText: [
    "Connect each pair of matching turntables with a cable car line. Lines run through square centres, go around the houses and never branch; two different lines may cross straight over each other.",
    "San Francisco's streets run straight up the hills, so a line only turns on level ground: the squares before, at and after a turn are all the same height. A cable car on the street shows a straight piece of line.",
  ],
  generate,
  tierNames: { 1: "Direct", 2: "Which line", 3: "Reach", 4: "Short look-ahead", 5: "Long look-ahead" },
  ruleHints: {
    continue: "This piece of line has only one way to go on.",
    deadend: "No line can pass through this square in any legal way, so it stays empty.",
    steep: "A line can't turn here: the ground isn't level, so the line must run straight through (or not come this way at all).",
    turntable: "A turntable has exactly one track leaving it, and only one way is still open.",
    crossing: "The only way through this square is a crossing, straight over in both directions.",
    car: "The cable car shows the line running straight through here.",
    loop: "Joining these would close a loop, but every line runs turntable to turntable.",
    "wrong-line": "These two pieces belong to different lines, so they can't join.",
    reach: "No pair of turntables can reach these streets, so no line runs here.",
    pocket: "A line that went in here could only come back out by crossing itself.",
    "trial-short": "What if? A quick look ahead: this choice runs into trouble within a couple of moves.",
    trial: "What if? Following this choice through leads to a contradiction, so the opposite is true.",
  },
};
