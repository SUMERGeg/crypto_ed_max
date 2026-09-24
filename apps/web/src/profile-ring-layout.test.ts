import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("profile ring stacks its label around one visual center", () => {
  const selector = ".profile-ring > i";
  const rule = styles.slice(styles.indexOf(selector), styles.indexOf(selector) + 350);

  assert.match(rule, /display:\s*flex/);
  assert.match(rule, /flex-direction:\s*column/);
  assert.match(rule, /justify-content:\s*center/);
  assert.match(rule, /align-items:\s*center/);
});
