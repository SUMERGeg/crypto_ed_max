import assert from "node:assert/strict";
import { test } from "node:test";
import { configureSimulationRepository, createSimulation, getSimulationState, listScenarios } from "./simulation.js";
import type { PersistedSimulation, SimulationRepository } from "./simulation-persistence.js";

test("another MAX user cannot read a cached Market Replay session", async () => {
  const sessions = new Map<string, PersistedSimulation>();
  const repository: SimulationRepository = {
    async load(id, userId) { const session = sessions.get(id); return session?.userId === userId ? structuredClone(session) : null; },
    async save(session) { sessions.set(session.id, structuredClone(session)); },
    async listCompleted() { return []; },
  };
  configureSimulationRepository(repository);
  const scenarioId = listScenarios()[0]!.id;
  const created = await createSimulation(scenarioId, "max:101");
  assert.ok(created);
  assert.equal(await getSimulationState(created.sessionId, "max:202"), null);
  assert.ok(await getSimulationState(created.sessionId, "max:101"));
});
