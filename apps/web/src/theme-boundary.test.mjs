import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("application theme boundary covers MAX loading and application screens", () => {
  const theme = source("./theme.tsx");
  const styles = source("./styles.css");

  assert.match(theme, /className="crypto-theme-boundary"/);
  assert.match(theme, /data-crypto-theme=\{theme\}/);
  assert.match(styles, /\.crypto-theme-boundary\[data-crypto-theme="dark"\]/);
  assert.doesNotMatch(styles, /:root\[data-crypto-theme=/);
});

test("MAX Android theme is restored from device storage and saved there", () => {
  const theme = source("./theme.tsx");
  const maxClient = source("./max-client.ts");

  assert.match(maxClient, /DeviceStorage/);
  assert.match(theme, /DeviceStorage\?\.getItem\(STORAGE_KEY\)/);
  assert.match(theme, /DeviceStorage\?\.setItem\(STORAGE_KEY, theme\)/);
});

test("saved theme is applied before React starts", () => {
  const html = source("../index.html");
  const bootstrapIndex = html.indexOf("crypto-education-theme");
  const appIndex = html.indexOf('src="/src/main.tsx"');

  assert.ok(bootstrapIndex >= 0);
  assert.ok(bootstrapIndex < appIndex);
});

test("HTML entry point is not cached by embedded webviews", () => {
  const server = source("../../api/src/server.ts");

  assert.match(server, /express\.static\(webDistPath, \{[\s\S]*?Cache-Control", "no-store"/);
  assert.match(server, /app\.get\(\/\^\(\?!\\\/api[\s\S]*?Cache-Control", "no-store"/);
});
