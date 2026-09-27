import { spans } from "./spans.js";
import { lanes } from "./lanes.js";
import { fog } from "./fog.js";
import { cablecar } from "./cablecar.js";
import { sasquatch } from "./sasquatch.js";

for (const v of [spans, lanes, fog]) v.family = "road";

export const VARIANTS = { spans, lanes, fog, cablecar, sasquatch };
export const VARIANT_ORDER = ["spans", "lanes", "fog", "cablecar", "sasquatch"];

// Collections group variants by theme; each has its own look in the app.
export const COLLECTIONS = [
  { id: "goldengate", name: "Golden Gate", place: "San Francisco", blurb: "One orange road across the bay, from the toll plaza to Vista Point.", variants: ["spans", "lanes", "fog"] },
  { id: "cablecars", name: "Cable Cars", place: "San Francisco", blurb: "Lines climbing the city's hills, where the streets run straight up and the cars turn only on the level.", variants: ["cablecar"] },
  { id: "sasquatch", name: "Sasquatch", place: "Pacific Northwest", blurb: "You're the Sasquatch. Sneak from your den to the river past hikers who only look straight ahead, and who hear every twig you snap.", variants: ["sasquatch"] },
];
export const collectionOf = (variantId) => COLLECTIONS.find((c) => c.variants.includes(variantId));
