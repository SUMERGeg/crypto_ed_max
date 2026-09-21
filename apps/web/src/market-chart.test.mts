import assert from "node:assert/strict";
import test from "node:test";

import { buildChartGeometry, nearestChartPoint } from "./market-chart.js";

const series = [
  { at: "2026-09-19T00:00:00.000Z", priceRub: 6_000_000 },
  { at: "2026-09-20T00:00:00.000Z", priceRub: 6_500_000 },
  { at: "2026-09-21T00:00:00.000Z", priceRub: 6_250_000 },
];

test("builds chart geometry from actual prices", () => {
  const chart = buildChartGeometry(series, 360, 190);

  assert.equal(chart.points.length, 3);
  assert.equal(chart.points[0]?.x, 10);
  assert.equal(chart.points.at(-1)?.x, 306);
  assert.equal(chart.yTicks.length, 4);
  assert.match(chart.linePoints, /^10,/);
  assert.match(chart.areaPoints, /^10,172 /);
  assert.equal(chart.minPrice, 6_000_000);
  assert.equal(chart.maxPrice, 6_500_000);
});

test("selects the nearest real observation", () => {
  const chart = buildChartGeometry(series, 360, 190);

  assert.equal(nearestChartPoint(chart.points, 15), 0);
  assert.equal(nearestChartPoint(chart.points, 170), 1);
  assert.equal(nearestChartPoint(chart.points, 300), 2);
});
