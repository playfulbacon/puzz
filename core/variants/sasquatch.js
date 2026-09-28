// Sasquatch (Pacific Northwest woods). You're a family of Sasquatches. Each patch of woods hides
// exactly one of you; nobody may see a Sasquatch (hikers look straight ahead, Sasquatches look along
// their row and column, sight stops at trees and people); and every hiker must be watched by a
// Sasquatch. Engine: core/watch.
import { generate } from "../watch/generate.js";

export const sasquatch = {
  id: "sasquatch",
  family: "watch",
  name: "Sasquatch",
  tagline: "Hide the family. Keep an eye on the hikers.",
  ruleText: [
    "Hide one Sasquatch in every patch of woods (the creeks mark the patches).",
    "Nobody may see a Sasquatch. Hikers look straight ahead; Sasquatches look along their row and column. Trees and people block the view.",
    "Every hiker must be watched by a Sasquatch.",
  ],
  generate,
  tierNames: { 1: "Direct", 2: "One patch, one hiker", 3: "Two patches", 4: "Look-ahead", 5: "Long look-ahead" },
  ruleHints: {
    last: "This patch has only one square left where a Sasquatch could hide.",
    patch: "This patch already hides its Sasquatch, so nobody else hides here.",
    sight: "A Sasquatch here sees along its row and column until a tree or a person. Nobody can hide in its view.",
    watch: "Only one square left can watch this hiker, so a Sasquatch hides there.",
    claim: "Wherever this patch's Sasquatch hides, it would see these squares. So nobody hides in them.",
    "watch-claim": "Whichever square ends up watching this hiker would see these squares. So nobody hides in them.",
    "watch-patch": "Every square that could watch this hiker is in one patch. That patch's Sasquatch is the watcher, so it hides among those squares.",
    block: "A Sasquatch here would leave another patch with nowhere to hide (or a hiker nobody could watch).",
    pair: "A Sasquatch here would squeeze two other patches: whatever the first of them did, the second would have nowhere left to hide.",
  },
};
