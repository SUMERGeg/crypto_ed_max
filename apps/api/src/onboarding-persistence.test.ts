import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryOnboardingRepository } from "./onboarding-persistence.js";

test("new users resume onboarding and keep the final state", async () => {
  const repository = new MemoryOnboardingRepository();

  assert.deepEqual(await repository.get("max:new-user"), {
    status: "NOT_STARTED",
    step: 1,
    version: 1,
    completedAt: null,
  });

  await repository.save("max:new-user", { status: "IN_PROGRESS", step: 3 });
  assert.equal((await repository.get("max:new-user")).step, 3);

  await repository.save("max:new-user", { status: "COMPLETED", step: 4 });
  const completed = await repository.get("max:new-user");
  assert.equal(completed.status, "COMPLETED");
  assert.ok(completed.completedAt);
});

test("existing demo user does not receive onboarding automatically", async () => {
  const repository = new MemoryOnboardingRepository();
  assert.equal((await repository.get("demo-user")).status, "COMPLETED");
});
