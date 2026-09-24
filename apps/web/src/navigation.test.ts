import assert from "node:assert/strict";
import test from "node:test";
import { backDestination, contextualFollowUp, routeStopPath } from "./navigation.js";

const lessonStop = { type: "LESSON" as const, contentId: "crypto-intro" };

test("creates route stop URLs and keeps route origin", () => {
  assert.equal(routeStopPath(lessonStop), "/lessons/crypto-intro?from=route");
  assert.equal(routeStopPath({ type: "SECURITY_CASE", contentId: "seed-phrase" }), "/security/cases/seed-phrase?from=route");
});

test("selects contextual follow-up sections", () => {
  assert.equal(contextualFollowUp("crypto-intro"), "/market");
  assert.equal(contextualFollowUp("finance-risk-return"), "/practice");
  assert.equal(contextualFollowUp("law-status"), "/security");
});

test("uses parent fallback unless the flow came from the route", () => {
  assert.equal(backDestination({ fromRoute: true, parent: "/learn" }), "/route");
  assert.equal(backDestination({ fromRoute: false, parent: "/learn" }), "/learn");
});
