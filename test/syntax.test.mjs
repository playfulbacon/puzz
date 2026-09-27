// Every site and core file must parse: a broken string once made the whole site blank.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : p.endsWith(".js") ? [p] : [];
});

test("all site and core JavaScript parses", () => {
  for (const f of [...files("site"), ...files("core")]) {
    try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); }
    catch (e) { assert.fail(`${f}: ${e.stderr}`); }
  }
});
