#!/usr/bin/env node
// Bump the site version everywhere it lives and add a changelog entry.
//   node scripts/bump.mjs [major|minor|patch] "What changed"
import { readFileSync, writeFileSync } from "node:fs";

const [kind = "minor", ...words] = process.argv.slice(2);
const note = words.join(" ").trim();
const cur = JSON.parse(readFileSync("site/version.json", "utf8")).version.split(".").map(Number);
const next = kind === "major" ? [cur[0] + 1, 0, 0] : kind === "patch" ? [cur[0], cur[1], cur[2] + 1] : [cur[0], cur[1] + 1, 0];
const version = next.join("."), today = new Date().toISOString().slice(0, 10);

writeFileSync("site/version.json", JSON.stringify({ version, released: today }) + "\n");
writeFileSync("site/version.js", `// Bumped on every change by scripts/bump.mjs (keep in step with version.json).\nexport const VERSION = "${version}";\nexport const RELEASED = "${today}";\n`);
const log = readFileSync("CHANGELOG.md", "utf8");
const i = log.indexOf("\n## ");
const entry = `\n## ${version} (${today})\n- ${note || "Changes."}\n`;
writeFileSync("CHANGELOG.md", i < 0 ? log + entry : log.slice(0, i) + entry + log.slice(i));
console.log(version);
