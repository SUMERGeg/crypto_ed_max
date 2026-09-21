import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("application theme uses an attribute isolated from the MAX host theme", () => {
  const theme = source("./theme.tsx");
  const styles = source("./styles.css");

  assert.match(theme, /document\.documentElement\.dataset\.cryptoTheme = theme/);
  assert.match(styles, /:root\[data-crypto-theme="dark"\]/);
  assert.doesNotMatch(styles, /:root\[data-theme=/);
});
