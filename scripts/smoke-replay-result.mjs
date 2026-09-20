import assert from "node:assert/strict";
import {
  completeSimulation,
  configureSimulationRepository,
  createSimulation,
  getSimulationState,
  listScenarios,
  makeTrade,
} from "../apps/api/dist/simulation.js";

const records = new Map();
const repository = {
  async load(sessionId, userId) {
    const session = records.get(sessionId);
    return session?.userId === userId ? structuredClone(session) : null;
  },
  async save(session) {
    records.set(session.id, structuredClone(session));
  },
  async listCompleted(userId) {
    return [...records.values()].filter((session) => session.userId === userId && session.status === "COMPLETED" && session.result).reverse()
      .map((session) => ({ sessionId: session.id, scenarioId: session.scenarioId, result: structuredClone(session.result), completedAt: null }));
  },
};

configureSimulationRepository(repository);
const realNow = Date.now;
let now = realNow();
Date.now = () => now;

try {
  const scenario = listScenarios()[0];
  assert.ok(scenario, "A replay scenario is required");

  const first = await createSimulation(scenario.id);
  assert.ok(first, "First session should be created");
  now += 90_000;
  const bought = await makeTrade(first.sessionId, { type: "BUY", symbol: first.assets[0].symbol, amountRub: 20_000 });
  assert.ok("data" in bought, "BUY should succeed");
  now += 120_000;
  const afterBuy = await getSimulationState(first.sessionId);
  const position = afterBuy?.positions[0];
  assert.ok(position, "Position should exist after BUY");
  const sold = await makeTrade(first.sessionId, { type: "SELL", symbol: position.symbol, quantity: position.quantity / 2 });
  assert.ok("data" in sold, "SELL should succeed");
  now += 3_600_000;
  const firstReady = await getSimulationState(first.sessionId);
  assert.equal(firstReady?.canComplete, true, "Session should reach its historical end");
  const firstCompletion = await completeSimulation(first.sessionId);
  assert.ok("data" in firstCompletion, "First completion should succeed");
  const firstResult = firstCompletion.data;
  assert.equal(firstResult.schemaVersion, 2);
  assert.equal(firstResult.decisions.length, 2);
  assert.ok(firstResult.portfolioSeries.length > 2);
  assert.equal(firstResult.portfolioSeries.at(-1)?.totalValueRub, firstResult.finalValueRub);
  assert.equal(firstResult.comparison.previousAttempts, 0);

  const second = await createSimulation(scenario.id);
  assert.ok(second, "Second session should be created");
  now += 3_600_000;
  await getSimulationState(second.sessionId);
  const secondCompletion = await completeSimulation(second.sessionId);
  assert.ok("data" in secondCompletion, "Second completion should succeed");
  assert.equal(secondCompletion.data.comparison.previousAttempts, 1);
  assert.equal(secondCompletion.data.comparison.previousReturnPercent, firstResult.returnPercent);

  console.log("Replay result smoke test passed");
} finally {
  Date.now = realNow;
}
