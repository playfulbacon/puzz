// Sasquatch (Pacific Northwest woods). Engine: core/hide.
import { generate } from "../hide/generate.js";

export const sasquatch = {
  id: "sasquatch",
  family: "hide",
  name: "Sasquatch",
  tagline: "Exactly one square nobody can see.",
  ruleText: [
    "Turn each hiker to face the right way. A hiker sees every square straight ahead until a tree blocks the view; a number says how many squares that is.",
    "Facing the right way, the hikers leave exactly one square of the woods out of sight. Hide the Sasquatch there.",
  ],
  generate,
  tierNames: { 1: "Direct", 2: "Two blind spots", 3: "—", 4: "Short look-ahead", 5: "Long look-ahead" },
  ruleHints: {
    measure: "This hiker's number only fits some directions: count the squares until a tree or the edge.",
    watch: "The Sasquatch's square is known, so every other square must be watched, and only this hiker can still see this one.",
    gap: "If this hiker faced that way, two squares would be out of sight, but there is only one Sasquatch.",
    "trial-short": "What if? A quick look ahead: this facing runs into trouble within a couple of moves.",
    trial: "What if? Following this facing through leads to a contradiction, so it's wrong.",
  },
};
