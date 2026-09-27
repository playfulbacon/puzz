import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VERSION } from "../site/version.js";

test("site/version.js and site/version.json agree, and the changelog has an entry", () => {
  const json = JSON.parse(readFileSync(new URL("../site/version.json", import.meta.url), "utf8"));
  assert.equal(json.version, VERSION);
  assert.match(readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8"), new RegExp(`## ${VERSION.replace(/\./g, "\\.")} `));
});
