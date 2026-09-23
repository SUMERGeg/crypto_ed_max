import assert from "node:assert/strict";
import test from "node:test";
import { buildRecommendedRoute, routeCatalog } from "./route-data.js";

test("catalog has 30 unique stops and keeps lessons in chapter order", () => {
  assert.equal(routeCatalog.length, 30);
  assert.equal(new Set(routeCatalog.map((stop) => stop.id)).size, 30);
  assert.deepEqual(routeCatalog.filter((stop) => stop.type === "LESSON").map((stop) => stop.contentId), [
    "crypto-intro", "crypto-bitcoin", "crypto-tokens", "crypto-ethereum", "crypto-stablecoins",
    "blockchain-ledger", "blockchain-transactions", "blockchain-blocks", "blockchain-consensus", "blockchain-pow",
    "finance-risk-return", "finance-diversification", "finance-volatility", "finance-cap-fees", "finance-risk-plan",
    "law-status", "law-taxes", "law-payments", "law-mining", "law-safe-check",
  ]);
  assert.equal(routeCatalog.filter((stop) => stop.type === "SECURITY_CASE").length, 5);
  assert.equal(routeCatalog.filter((stop) => stop.type === "REPLAY").length, 5);
});

test("later completion does not skip the first unfinished stop", () => {
  const route = buildRecommendedRoute({
    completedLessonIds: ["crypto-intro", "crypto-bitcoin"],
    completedCaseIds: [],
    completedScenarioIds: [],
  });
  assert.equal(route.completedCount, 2);
  assert.equal(route.continuousCompletedCount, 1);
  assert.equal(route.currentIndex, 1);
  assert.equal(route.stops[1]?.available, true);
  assert.equal(route.stops[2]?.completed, true);
  assert.equal(route.stops[3]?.available, false);
});

test("completed scenarios count once and all completed stops finish the route", () => {
  const route = buildRecommendedRoute({
    completedLessonIds: routeCatalog.filter((stop) => stop.type === "LESSON").map((stop) => stop.contentId),
    completedCaseIds: routeCatalog.filter((stop) => stop.type === "SECURITY_CASE").map((stop) => stop.contentId),
    completedScenarioIds: [...routeCatalog.filter((stop) => stop.type === "REPLAY").map((stop) => stop.contentId), "boom-2017-2018"],
  });
  assert.equal(route.completedCount, 30);
  assert.equal(route.continuousCompletedCount, 30);
  assert.equal(route.currentIndex, null);
  assert.equal(route.finished, true);
  assert.equal(route.stops.every((stop) => stop.available), true);
});
