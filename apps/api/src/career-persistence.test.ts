import assert from "node:assert/strict";
import { test } from "node:test";
import type { CareerRepository } from "./career-persistence.js";

test("career answers survive a reload for the same user only", async () => {
  const career = await import("./career-data.js");
  assert.equal(typeof career.initializeCareerState, "function");
  const stored = new Map<string, Awaited<ReturnType<CareerRepository["loadAll"]>>[number]>();
  const repository: CareerRepository = {
    async loadAll() { return [...stored.values()].map((attempt) => structuredClone(attempt)); },
    async save(attempt) { stored.set(attempt.id, structuredClone(attempt)); },
  };
  await career.initializeCareerState(repository);
  const attempt = await career.createCareerAttempt("max:101");
  const first = attempt.questions[0]!;
  await career.saveCareerAnswer(attempt.id, "max:101", first.id, first.options[0]!.id);
  await career.initializeCareerState(repository);
  assert.equal(career.getCareerAttempt(attempt.id, "max:101")?.answers[first.id], first.options[0]!.id);
  assert.equal(career.getCareerAttempt(attempt.id, "max:202"), null);
});
