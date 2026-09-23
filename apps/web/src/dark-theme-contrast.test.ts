import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("dark theme gives compact status surfaces dark backgrounds", () => {
  const selector = ".app-canvas[data-crypto-theme=\"dark\"] .practice-rule";

  assert.ok(styles.includes(selector));
  assert.match(styles.slice(styles.indexOf(selector), styles.indexOf(selector) + 900), /background:\s*#(?:10291f|142338|18263a)/);
});
