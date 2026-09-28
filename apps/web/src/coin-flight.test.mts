import assert from "node:assert/strict";
import test from "node:test";

import { coinFallTiming } from "./coin-flight.js";

function cubicProgress(t: number, y1: number, y2: number) {
  return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3;
}

test("coin fall has the same position and continuous velocity as its ballistic path", () => {
  const velocity = -360;
  const fall = 540;
  const { y1, y2, css } = coinFallTiming(velocity, fall);

  assert.match(css, /^cubic-bezier\(0\.333333/);
  for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const expected = velocity * t + (fall - velocity) * t * t;
    assert.ok(Math.abs(cubicProgress(t, y1, y2) * fall - expected) < 1e-8);
  }
  assert.ok(Math.abs(3 * y1 * fall - velocity) < 1e-8);
  assert.ok(Math.abs(3 * (1 - y2) * fall - (2 * fall - velocity)) < 1e-8);
});

test("coin fall also preserves downward initial velocity", () => {
  const { y1, y2 } = coinFallTiming(180, 600);
  assert.ok(Math.abs(cubicProgress(0.5, y1, y2) * 600 - 195) < 1e-8);
});
