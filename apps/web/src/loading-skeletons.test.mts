import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("loading views use content-shaped skeleton blocks", () => {
  const app = source("./App.tsx");
  const learning = source("./LearningPages.tsx");
  const market = source("./MarketPages.tsx");

  assert.match(app, /skeleton--hero[\s\S]*skeleton__line/);
  assert.match(app, /skeleton--row[\s\S]*skeleton--row-lines/);
  assert.match(learning, /flow-loading--lesson/);
  assert.match(market, /market-skeleton__icon[\s\S]*market-skeleton__lines/);
});

test("skeleton styles adapt to theme and respect reduced motion", () => {
  const styles = source("./styles.css");

  assert.match(styles, /--skeleton-base/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
