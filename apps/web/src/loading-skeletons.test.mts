import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("loading views use content-shaped skeleton blocks", () => {
  const app = source("./App.tsx");
  const learning = source("./LearningPages.tsx");
  const market = source("./MarketPages.tsx");
  const security = source("./SecurityPages.tsx");
  const simulation = source("./SimulationPages.tsx");
  const profile = source("./ProfilePage.tsx");
  const career = source("./CareerPages.tsx");

  assert.match(app, /skeleton--hero[\s\S]*skeleton__line/);
  assert.match(app, /skeleton--row[\s\S]*skeleton--row-lines/);
  assert.match(learning, /flow-loading--lesson/);
  assert.match(market, /market-skeleton__icon[\s\S]*market-skeleton__lines/);
  assert.match(security, /security-skeleton__icon[\s\S]*security-skeleton__lines/);
  assert.match(simulation, /ReplaySkeleton/);
  assert.match(simulation, /simulation-skeleton__chart[\s\S]*simulation-skeleton__panel/);
  assert.match(profile, /profile-skeleton__hero[\s\S]*profile-skeleton__stats/);
  assert.match(career, /career-skeleton__hero[\s\S]*career-skeleton__card/);
});

test("large route modules are lazy loaded and prefetched from navigation", () => {
  const app = source("./App.tsx");

  assert.match(app, /lazyPage\(\(\) => import\("\.\/SecurityPages"\)/);
  assert.match(app, /lazyPage\(\(\) => import\("\.\/SimulationPages"\)/);
  assert.match(app, /lazyPage\(\(\) => import\("\.\/MarketPages"\)/);
  assert.match(app, /preloadSection\(item\.to\)/);
  assert.match(app, /<Suspense fallback={<RouteChunkFallback/);
});

test("frequently used robot images use mobile-sized webp assets", () => {
  const robot = source("./robot.ts");

  assert.doesNotMatch(robot, /crypto-buddy[^"\n]*\.png/);
  assert.equal((robot.match(/\.webp/g) ?? []).length, 5);
});

test("skeleton styles adapt to theme and respect reduced motion", () => {
  const styles = source("./styles.css");

  assert.match(styles, /--skeleton-base/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
