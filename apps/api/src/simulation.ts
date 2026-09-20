import { randomUUID } from "node:crypto";
import { historicalScenarios, type HistoricalAsset, type HistoricalScenario } from "./scenario-data.js";
import type { PersistedSimulation, SimulationRepository } from "./simulation-persistence.js";

type SessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED";
type TradeType = "BUY" | "SELL";

type Trade = {
  id: string;
  type: TradeType;
  symbol: string;
  quantity: number;
  amountRub: number;
  priceRub: number;
  scenarioAt: string;
  triggerEventId: string | null;
};

type Session = {
  id: string;
  userId: string;
  scenario: HistoricalScenario;
  status: SessionStatus;
  cashRub: number;
  positions: Map<string, number>;
  trades: Trade[];
  elapsedMs: number;
  resumedAt: number | null;
  result: SimulationResult | null;
  idempotencyKeys: Set<string>;
  lastCheckpointAt: number;
};

export type SimulationResult = {
  schemaVersion: 2;
  sessionId: string;
  finalValueRub: number;
  returnPercent: number;
  benchmarkReturnPercent: number;
  benchmarkLabel: string;
  deltaPercent: number;
  tradeCount: number;
  analysis: Array<{ kind: string; title: string; text: string }>;
  portfolioSeries: Array<{ at: string; totalValueRub: number; cashRub: number }>;
  decisions: Array<{
    tradeId: string;
    type: TradeType;
    symbol: string;
    quantity: number;
    amountRub: number;
    priceRub: number;
    scenarioAt: string;
    portfolioValueAfterRub: number;
    triggerEvent: { id: string; title: string; at: string; category: HistoricalScenario["events"][number]["category"] } | null;
    daysAfterEvent: number | null;
    marketMoveBeforePercent: number;
    drawdownFromRecentPeakPercent: number;
    signals: Array<"FOMO" | "PANIC_SELL" | "DROP_REACTION" | "NEWS_REACTION">;
  }>;
  comparison: {
    attemptNumber: number;
    previousAttempts: number;
    previousReturnPercent: number | null;
    deltaVsPreviousPercent: number | null;
    bestPreviousReturnPercent: number | null;
    averagePreviousReturnPercent: number | null;
  };
};

const sessions = new Map<string, Session>();
const demoUserId = "demo-user";
let simulationRepository: SimulationRepository | null = null;
const roundMoney = (value: number) => Math.round(value * 100) / 100;
const roundQuantity = (value: number) => Math.round(value * 100_000_000) / 100_000_000;

function scenarioAt(session: Session) {
  const elapsed = session.elapsedMs + (session.status === "ACTIVE" && session.resumedAt ? Date.now() - session.resumedAt : 0);
  const progress = Math.min(1, elapsed / session.scenario.durationMs);
  const start = Date.parse(session.scenario.startAt);
  const end = Date.parse(session.scenario.endAt);
  return new Date(start + (end - start) * progress).toISOString();
}

function priceAt(asset: HistoricalAsset, at: string) {
  const target = Date.parse(at);
  const point = [...asset.points].reverse().find((item) => Date.parse(item.at) <= target);
  return point?.priceRub ?? asset.points[0]!.priceRub;
}

function priceChangeBefore(asset: HistoricalAsset, at: string, lookbackDays: number) {
  const current = priceAt(asset, at);
  const previous = priceAt(asset, new Date(Date.parse(at) - lookbackDays * 86_400_000).toISOString());
  return previous > 0 ? ((current / previous) - 1) * 100 : 0;
}

function drawdownFromRecentPeak(asset: HistoricalAsset, at: string, lookbackDays: number) {
  const end = Date.parse(at);
  const start = end - lookbackDays * 86_400_000;
  const recentPrices = asset.points.filter((point) => {
    const pointAt = Date.parse(point.at);
    return pointAt >= start && pointAt <= end;
  }).map((point) => point.priceRub);
  const peak = Math.max(priceAt(asset, at), ...recentPrices);
  return peak > 0 ? ((priceAt(asset, at) / peak) - 1) * 100 : 0;
}

export function visibleHistoricalEvents(scenario: HistoricalScenario, at: string) {
  const currentTime = Date.parse(at);
  return scenario.events.filter((event) => Date.parse(event.at) <= currentTime);
}

export function configureSimulationRepository(repository: SimulationRepository) {
  simulationRepository = repository;
}

function repository() {
  if (!simulationRepository) throw new Error("Simulation repository is not configured");
  return simulationRepository;
}

function checkpointClock(session: Session) {
  if (session.status === "ACTIVE" && session.resumedAt) {
    session.elapsedMs = Math.min(session.scenario.durationMs, session.elapsedMs + Date.now() - session.resumedAt);
    session.resumedAt = Date.now();
  }
}

function serializeSession(session: Session): PersistedSimulation {
  return {
    id: session.id,
    userId: session.userId,
    scenarioId: session.scenario.id,
    scenarioVersion: session.scenario.version,
    status: session.status,
    cashRub: session.cashRub,
    positions: [...session.positions.entries()],
    trades: session.trades,
    elapsedMs: session.elapsedMs,
    result: session.result,
    idempotencyKeys: [...session.idempotencyKeys],
  };
}

async function persistSession(session: Session, force = false) {
  checkpointClock(session);
  if (!force && Date.now() - session.lastCheckpointAt < 5_000) return;
  await repository().save(serializeSession(session));
  session.lastCheckpointAt = Date.now();
}

async function getSession(id: string, userId: string) {
  const cached = sessions.get(id);
  if (cached) return cached.userId === userId ? cached : null;
  const saved = await repository().load(id, userId);
  if (!saved) return null;
  const scenario = historicalScenarios.find((item) => item.id === saved.scenarioId);
  if (!scenario) return null;
  const session: Session = {
    id: saved.id,
    userId: saved.userId,
    scenario,
    status: saved.status === "ACTIVE" ? "PAUSED" : saved.status,
    cashRub: saved.cashRub,
    positions: new Map(saved.positions),
    trades: saved.trades,
    elapsedMs: Math.min(saved.elapsedMs, scenario.durationMs),
    resumedAt: null,
    result: saved.result as SimulationResult | null,
    idempotencyKeys: new Set(saved.idempotencyKeys),
    lastCheckpointAt: Date.now(),
  };
  sessions.set(id, session);
  if (saved.status === "ACTIVE") await persistSession(session, true);
  return session;
}

function publicState(session: Session) {
  const at = session.status === "COMPLETED" ? session.scenario.endAt : scenarioAt(session);
  const positions = session.scenario.assets.map((asset) => {
    const quantity = session.positions.get(asset.symbol) ?? 0;
    const currentPriceRub = priceAt(asset, at);
    return {
      symbol: asset.symbol,
      name: asset.name,
      quantity,
      currentPriceRub,
      valueRub: roundMoney(quantity * currentPriceRub),
    };
  }).filter((position) => position.quantity > 0);
  const holdingsValueRub = roundMoney(positions.reduce((sum, position) => sum + position.valueRub, 0));
  const totalValueRub = roundMoney(session.cashRub + holdingsValueRub);
  const progressPercent = Math.min(100, Math.max(0,
    ((Date.parse(at) - Date.parse(session.scenario.startAt)) / (Date.parse(session.scenario.endAt) - Date.parse(session.scenario.startAt))) * 100,
  ));

  return {
    sessionId: session.id,
    scenarioId: session.scenario.id,
    scenarioTitle: session.scenario.title,
    scenarioDifficulty: session.scenario.difficulty,
    educationalFocus: session.scenario.educationalFocus,
    benchmark: session.scenario.benchmark,
    status: session.status,
    scenarioAt: at,
    startAt: session.scenario.startAt,
    endAt: session.scenario.endAt,
    progressPercent,
    startingBalanceRub: session.scenario.startingBalanceRub,
    cashRub: roundMoney(session.cashRub),
    holdingsValueRub,
    totalValueRub,
    positions,
    assets: session.scenario.assets.map((asset) => ({
      symbol: asset.symbol,
      name: asset.name,
      color: asset.color,
      currentPriceRub: priceAt(asset, at),
      series: asset.points.filter((point) => Date.parse(point.at) <= Date.parse(at)),
    })),
    events: visibleHistoricalEvents(session.scenario, at),
    trades: session.trades,
    canComplete: progressPercent >= 99.9,
    result: session.result,
  };
}

export function listScenarios() {
  return historicalScenarios.map((scenario) => ({
    id: scenario.id,
    version: scenario.version,
    title: scenario.title,
    description: scenario.description,
    startAt: scenario.startAt,
    endAt: scenario.endAt,
    startingBalanceRub: scenario.startingBalanceRub,
    difficulty: scenario.difficulty,
    educationalFocus: scenario.educationalFocus,
    benchmark: scenario.benchmark,
    estimatedMinutes: Math.ceil(scenario.durationMs / 60_000),
    assetSymbols: scenario.assets.map((asset) => asset.symbol),
    eventCount: scenario.events.length,
    dataSource: scenario.dataSource,
  }));
}

export async function listCompletedSimulations(userId = demoUserId) {
  const completed = await repository().listCompleted(userId);
  return completed.map((item) => {
    const scenario = historicalScenarios.find((candidate) => candidate.id === item.scenarioId);
    const result = item.result as SimulationResult;
    return {
      sessionId: item.sessionId,
      scenarioId: item.scenarioId,
      scenarioTitle: scenario?.title ?? item.scenarioId,
      completedAt: item.completedAt,
      returnPercent: result.returnPercent,
      benchmarkReturnPercent: result.benchmarkReturnPercent,
      deltaPercent: result.deltaPercent,
      finalValueRub: result.finalValueRub,
      tradeCount: result.tradeCount,
    };
  });
}

export async function createSimulation(scenarioId: string, userId = demoUserId) {
  const scenario = historicalScenarios.find((item) => item.id === scenarioId);
  if (!scenario) return null;
  const session: Session = {
    id: randomUUID(), userId, scenario, status: "ACTIVE", cashRub: scenario.startingBalanceRub,
    positions: new Map(), trades: [], elapsedMs: 0, resumedAt: Date.now(), result: null,
    idempotencyKeys: new Set(), lastCheckpointAt: 0,
  };
  sessions.set(session.id, session);
  await persistSession(session, true);
  return publicState(session);
}

export async function getSimulationState(id: string, userId = demoUserId) {
  const session = await getSession(id, userId);
  if (!session) return null;
  if (session.status === "COMPLETED" && session.result?.schemaVersion !== 2) {
    session.result = await buildSimulationResult(session);
    await persistSession(session, true);
  }
  await persistSession(session);
  return publicState(session);
}

export async function pauseSimulation(id: string, userId = demoUserId) {
  const session = await getSession(id, userId);
  if (!session || session.status === "COMPLETED") return null;
  if (session.status === "ACTIVE" && session.resumedAt) {
    session.elapsedMs = Math.min(session.scenario.durationMs, session.elapsedMs + Date.now() - session.resumedAt);
    session.resumedAt = null;
    session.status = "PAUSED";
  }
  await persistSession(session, true);
  return publicState(session);
}

export async function resumeSimulation(id: string, userId = demoUserId) {
  const session = await getSession(id, userId);
  if (!session || session.status === "COMPLETED") return null;
  if (session.status === "PAUSED" && session.elapsedMs < session.scenario.durationMs) {
    session.status = "ACTIVE";
    session.resumedAt = Date.now();
  }
  await persistSession(session, true);
  return publicState(session);
}

export async function makeTrade(id: string, body: Record<string, unknown>, idempotencyKey?: string, userId = demoUserId) {
  const session = await getSession(id, userId);
  if (!session) return { error: "Сессия не найдена", status: 404 } as const;
  if (session.status === "COMPLETED") return { error: "Симуляция уже завершена", status: 409 } as const;
  if (idempotencyKey && session.idempotencyKeys.has(idempotencyKey)) return { data: publicState(session) } as const;

  const type = body.type;
  const symbol = String(body.symbol ?? "").toUpperCase();
  const asset = session.scenario.assets.find((item) => item.symbol === symbol);
  if ((type !== "BUY" && type !== "SELL") || !asset) return { error: "Проверь тип сделки и актив", status: 400 } as const;

  const at = scenarioAt(session);
  const priceRub = priceAt(asset, at);
  let quantity = 0;
  let amountRub = 0;

  if (type === "BUY") {
    amountRub = Number(body.amountRub);
    if (!Number.isFinite(amountRub) || amountRub <= 0 || amountRub > session.cashRub) {
      return { error: "Сумма покупки должна быть больше нуля и не больше свободных денег", status: 400 } as const;
    }
    quantity = amountRub / priceRub;
    session.cashRub -= amountRub;
    session.positions.set(symbol, (session.positions.get(symbol) ?? 0) + quantity);
  } else {
    quantity = Number(body.quantity);
    const available = session.positions.get(symbol) ?? 0;
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > available + 1e-10) {
      return { error: "Количество для продажи должно быть больше нуля и не больше позиции", status: 400 } as const;
    }
    amountRub = quantity * priceRub;
    session.cashRub += amountRub;
    session.positions.set(symbol, Math.max(0, available - quantity));
  }

  const trade: Trade = {
    id: randomUUID(), type, symbol, quantity: roundQuantity(quantity), amountRub: roundMoney(amountRub),
    priceRub,
    scenarioAt: at,
    triggerEventId: visibleHistoricalEvents(session.scenario, at).at(-1)?.id ?? null,
  };
  session.trades.push(trade);
  if (idempotencyKey) session.idempotencyKeys.add(idempotencyKey);
  await persistSession(session, true);
  return { data: publicState(session) } as const;
}

function portfolioValue(session: Session, cashRub: number, positions: Map<string, number>, at: string) {
  return roundMoney(cashRub + session.scenario.assets.reduce((sum, asset) => (
    sum + (positions.get(asset.symbol) ?? 0) * priceAt(asset, at)
  ), 0));
}

function applyTradeToPortfolio(trade: Trade, positions: Map<string, number>, cashRub: number) {
  if (trade.type === "BUY") {
    positions.set(trade.symbol, (positions.get(trade.symbol) ?? 0) + trade.quantity);
    return cashRub - trade.amountRub;
  }
  positions.set(trade.symbol, Math.max(0, (positions.get(trade.symbol) ?? 0) - trade.quantity));
  return cashRub + trade.amountRub;
}

function buildPortfolioSeries(session: Session) {
  const timelineAsset = session.scenario.assets.find((asset) => asset.symbol === session.scenario.benchmark.assetSymbol) ?? session.scenario.assets[0]!;
  const timeline = timelineAsset.points.filter((point) => (
    Date.parse(point.at) >= Date.parse(session.scenario.startAt) && Date.parse(point.at) <= Date.parse(session.scenario.endAt)
  ));
  const points = timeline.length > 0 ? timeline : [{ at: session.scenario.startAt, priceRub: priceAt(timelineAsset, session.scenario.startAt) }];
  const trades = [...session.trades].sort((left, right) => Date.parse(left.scenarioAt) - Date.parse(right.scenarioAt));
  const positions = new Map<string, number>();
  let cashRub = session.scenario.startingBalanceRub;
  let tradeIndex = 0;
  const series = points.map((point) => {
    while (tradeIndex < trades.length && Date.parse(trades[tradeIndex]!.scenarioAt) <= Date.parse(point.at)) {
      cashRub = applyTradeToPortfolio(trades[tradeIndex]!, positions, cashRub);
      tradeIndex += 1;
    }
    return { at: point.at, totalValueRub: portfolioValue(session, cashRub, positions, point.at), cashRub: roundMoney(cashRub) };
  });
  const lastPoint = series.at(-1);
  if (!lastPoint || lastPoint.at !== session.scenario.endAt) {
    while (tradeIndex < trades.length) {
      cashRub = applyTradeToPortfolio(trades[tradeIndex]!, positions, cashRub);
      tradeIndex += 1;
    }
    series.push({ at: session.scenario.endAt, totalValueRub: portfolioValue(session, cashRub, positions, session.scenario.endAt), cashRub: roundMoney(cashRub) });
  }
  const finalState = publicState(session);
  series[series.length - 1] = {
    at: session.scenario.endAt,
    totalValueRub: finalState.totalValueRub,
    cashRub: roundMoney(session.cashRub),
  };
  if (series.length <= 80) return series;
  const step = Math.ceil(series.length / 80);
  const sampled = series.filter((_point, index) => index % step === 0);
  if (sampled.at(-1)?.at !== series.at(-1)?.at) sampled.push(series.at(-1)!);
  return sampled;
}

function buildDecisions(session: Session): SimulationResult["decisions"] {
  const positions = new Map<string, number>();
  let cashRub = session.scenario.startingBalanceRub;
  return [...session.trades].sort((left, right) => Date.parse(left.scenarioAt) - Date.parse(right.scenarioAt)).map((trade) => {
    const asset = session.scenario.assets.find((item) => item.symbol === trade.symbol)!;
    const marketMoveBeforePercent = priceChangeBefore(asset, trade.scenarioAt, 14);
    const drawdownPercent = drawdownFromRecentPeak(asset, trade.scenarioAt, 14);
    const event = session.scenario.events.find((item) => item.id === trade.triggerEventId)
      ?? [...session.scenario.events].reverse().find((item) => Date.parse(item.at) <= Date.parse(trade.scenarioAt))
      ?? null;
    const daysAfterEvent = event ? Math.max(0, Math.floor((Date.parse(trade.scenarioAt) - Date.parse(event.at)) / 86_400_000)) : null;
    const signals: SimulationResult["decisions"][number]["signals"] = [];
    if (trade.type === "BUY" && marketMoveBeforePercent >= 10) signals.push("FOMO");
    if (drawdownPercent <= -10) signals.push("DROP_REACTION");
    if (trade.type === "SELL" && drawdownPercent <= -10) signals.push("PANIC_SELL");
    if (event && daysAfterEvent !== null && daysAfterEvent <= 7) signals.push("NEWS_REACTION");
    cashRub = applyTradeToPortfolio(trade, positions, cashRub);
    return {
      tradeId: trade.id,
      type: trade.type,
      symbol: trade.symbol,
      quantity: trade.quantity,
      amountRub: trade.amountRub,
      priceRub: trade.priceRub,
      scenarioAt: trade.scenarioAt,
      portfolioValueAfterRub: portfolioValue(session, cashRub, positions, trade.scenarioAt),
      triggerEvent: event ? { id: event.id, title: event.title, at: event.at, category: event.category } : null,
      daysAfterEvent,
      marketMoveBeforePercent: roundMoney(marketMoveBeforePercent),
      drawdownFromRecentPeakPercent: roundMoney(drawdownPercent),
      signals,
    };
  });
}

function buildAnalysis(session: Session, finalValueRub: number, decisions: SimulationResult["decisions"]) {
  const notes: SimulationResult["analysis"] = [];
  if (session.trades.length === 0) {
    notes.push({ kind: "INACTIVITY", title: "Ты наблюдал за рынком", text: "Это тоже решение. В следующем проходе попробуй одну небольшую сделку и сравни результат." });
  }
  if (session.trades.length >= 5) {
    notes.push({ kind: "FREQUENT_TRADING", title: "Много действий", text: "Частые сделки не гарантируют лучший итог. Иногда они лишь добавляют суету." });
  }
  const totalPositionValue = session.scenario.assets.reduce((sum, asset) => sum + (session.positions.get(asset.symbol) ?? 0) * priceAt(asset, session.scenario.endAt), 0);
  const biggestPosition = Math.max(0, ...session.scenario.assets.map((asset) => (session.positions.get(asset.symbol) ?? 0) * priceAt(asset, session.scenario.endAt)));
  if (totalPositionValue > 0 && biggestPosition / totalPositionValue > 0.7) {
    notes.push({ kind: "CONCENTRATION", title: "Большая доля в одном активе", text: "Результат сильно зависел от одной цены. Это повышает риск резких изменений портфеля." });
  }
  if (decisions.some((decision) => decision.signals.includes("FOMO"))) {
    notes.push({ kind: "FOMO", title: "Покупка после быстрого роста", text: "Перед одной из покупок цена заметно выросла за две недели. Это не доказывает эмоцию, но похоже на ситуацию, где легко поддаться страху упустить рост." });
  }
  if (decisions.some((decision) => decision.signals.includes("PANIC_SELL"))) {
    notes.push({ kind: "PANIC_SELL", title: "Продажа после сильного снижения", text: "Одна из продаж произошла, когда цена была более чем на 10% ниже недавнего максимума. Полезно заранее решить, при каком падении и почему ты меняешь план." });
  } else if (decisions.some((decision) => decision.signals.includes("DROP_REACTION"))) {
    notes.push({ kind: "DROP_REACTION", title: "Решение на сильном падении", text: "Ты совершил сделку во время заметного снижения. Сравни это решение с планом, который выбрал бы до движения цены." });
  }
  if (decisions.some((decision) => decision.signals.includes("NEWS_REACTION"))) {
    notes.push({ kind: "NEWS_REACTION", title: "Сделка рядом с новостью", text: "После громкой новости легко действовать на эмоциях. Полезно сначала проверить, что именно изменилось." });
  }
  if (notes.length === 0) {
    notes.push({ kind: "BALANCED", title: "Спокойный темп", text: "Ты не перегружал сценарий действиями. Сравни итог с обычной покупкой Bitcoin в начале периода." });
  }
  notes.push({ kind: "OUTCOME", title: finalValueRub >= session.scenario.startingBalanceRub ? "Портфель вырос" : "Портфель снизился", text: "Это результат одного прошлого периода, а не подсказка о будущем." });
  return notes;
}

async function buildComparison(session: Session, returnPercent: number): Promise<SimulationResult["comparison"]> {
  const completed = await repository().listCompleted(session.userId);
  const previous = completed.filter((item) => item.sessionId !== session.id && item.scenarioId === session.scenario.id)
    .map((item) => item.result as Partial<SimulationResult>)
    .filter((result) => Number.isFinite(result.returnPercent));
  const previousReturns = previous.map((result) => Number(result.returnPercent));
  const previousReturnPercent = previousReturns[0] ?? null;
  const averagePreviousReturnPercent = previousReturns.length
    ? roundMoney(previousReturns.reduce((sum, value) => sum + value, 0) / previousReturns.length)
    : null;
  return {
    attemptNumber: previousReturns.length + 1,
    previousAttempts: previousReturns.length,
    previousReturnPercent,
    deltaVsPreviousPercent: previousReturnPercent === null ? null : roundMoney(returnPercent - previousReturnPercent),
    bestPreviousReturnPercent: previousReturns.length ? Math.max(...previousReturns) : null,
    averagePreviousReturnPercent,
  };
}

async function buildSimulationResult(session: Session): Promise<SimulationResult> {
  const finalState = publicState(session);
  const finalValueRub = finalState.totalValueRub;
  const returnPercent = roundMoney(((finalValueRub - session.scenario.startingBalanceRub) / session.scenario.startingBalanceRub) * 100);
  const benchmark = session.scenario.assets.find((asset) => asset.symbol === session.scenario.benchmark.assetSymbol)!;
  const benchmarkReturnPercent = roundMoney(((priceAt(benchmark, session.scenario.endAt) / priceAt(benchmark, session.scenario.startAt)) - 1) * 100);
  const decisions = buildDecisions(session);
  return {
    schemaVersion: 2,
    sessionId: session.id,
    finalValueRub: roundMoney(finalValueRub),
    returnPercent,
    benchmarkReturnPercent,
    benchmarkLabel: session.scenario.benchmark.label,
    deltaPercent: roundMoney(returnPercent - benchmarkReturnPercent),
    tradeCount: session.trades.length,
    analysis: buildAnalysis(session, finalValueRub, decisions),
    portfolioSeries: buildPortfolioSeries(session),
    decisions,
    comparison: await buildComparison(session, returnPercent),
  };
}

export async function completeSimulation(id: string, userId = demoUserId) {
  const session = await getSession(id, userId);
  if (!session) return { error: "Сессия не найдена", status: 404 } as const;
  if (session.result?.schemaVersion === 2) return { data: session.result } as const;
  const state = publicState(session);
  if (!state.canComplete) return { error: "Дождись конца исторического периода", status: 409 } as const;

  session.elapsedMs = session.scenario.durationMs;
  session.resumedAt = null;
  session.status = "COMPLETED";
  session.result = await buildSimulationResult(session);
  await persistSession(session, true);
  return { data: session.result } as const;
}
