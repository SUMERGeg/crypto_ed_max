import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("application theme uses an attribute isolated from the MAX host theme", () => {
  const app = source("./App.tsx");
  const styles = source("./styles.css");

  assert.match(app, /data-crypto-theme=\{theme\}/);
  assert.match(styles, /\.app-canvas\[data-crypto-theme="dark"\]/);
  assert.doesNotMatch(styles, /:root\[data-crypto-theme=/);
  assert.doesNotMatch(styles, /\.app-canvas\[data-crypto-theme="dark"\] \.app-canvas/);
});
