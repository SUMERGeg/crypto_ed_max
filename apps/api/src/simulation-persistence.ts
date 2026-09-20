import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;

export type PersistedTrade = {
  id: string;
  type: "BUY" | "SELL";
  symbol: string;
  quantity: number;
  amountRub: number;
  priceRub: number;
  scenarioAt: string;
  triggerEventId: string | null;
};

export type PersistedSimulation = {
  id: string;
  userId: string;
  scenarioId: string;
  scenarioVersion: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  cashRub: number;
  positions: Array<[string, number]>;
  trades: PersistedTrade[];
  elapsedMs: number;
  result: unknown | null;
  idempotencyKeys: string[];
};

export type CompletedSimulationRecord = {
  sessionId: string;
  scenarioId: string;
  result: unknown;
  completedAt: string | null;
};

export interface SimulationRepository {
  load(sessionId: string, userId: string): Promise<PersistedSimulation | null>;
  save(session: PersistedSimulation): Promise<void>;
  listCompleted(userId: string): Promise<CompletedSimulationRecord[]>;
}

class MemorySimulationRepository implements SimulationRepository {
  private readonly sessions = new Map<string, PersistedSimulation>();

  async load(sessionId: string, userId: string) {
    const session = this.sessions.get(sessionId);
    return session?.userId === userId ? structuredClone(session) : null;
  }

  async save(session: PersistedSimulation) {
    this.sessions.set(session.id, structuredClone(session));
  }

  async listCompleted(userId: string) {
    return [...this.sessions.values()]
      .filter((session) => session.userId === userId && session.status === "COMPLETED" && session.result)
      .reverse()
      .map((session) => ({ sessionId: session.id, scenarioId: session.scenarioId, result: structuredClone(session.result), completedAt: null }));
  }
}

class PostgresSimulationRepository implements SimulationRepository {
  constructor(private readonly pool: InstanceType<typeof Pool>) {}

  async migrate() {
    const migration = await readFile(new URL("../migrations/0002_simulation_sessions.sql", import.meta.url), "utf8");
    await this.pool.query(migration);
    const eventsMigration = await readFile(new URL("../migrations/0003_simulation_trade_events.sql", import.meta.url), "utf8");
    await this.pool.query(eventsMigration);
  }

  async load(sessionId: string, userId: string): Promise<PersistedSimulation | null> {
    const sessionResult = await this.pool.query<{
      id: string;
      user_id: string;
      scenario_id: string;
      scenario_version: string;
      status: PersistedSimulation["status"];
      cash_rub: string;
      positions_json: Array<[string, number]>;
      elapsed_ms: string;
      result_json: unknown | null;
      idempotency_keys_json: string[];
    }>(
      `SELECT id, user_id, scenario_id, scenario_version, status, cash_rub, positions_json,
              elapsed_ms, result_json, idempotency_keys_json
       FROM simulation_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );
    const row = sessionResult.rows[0];
    if (!row) return null;

    const tradesResult = await this.pool.query<{
      id: string;
      type: "BUY" | "SELL";
      symbol: string;
      quantity: string;
      amount_rub: string;
      price_rub: string;
      scenario_at: Date;
      trigger_event_id: string | null;
    }>(
      `SELECT id, type, symbol, quantity, amount_rub, price_rub, scenario_at, trigger_event_id
       FROM simulation_transactions WHERE session_id = $1 ORDER BY scenario_at, created_at`,
      [sessionId],
    );

    return {
      id: row.id,
      userId: row.user_id,
      scenarioId: row.scenario_id,
      scenarioVersion: row.scenario_version,
      status: row.status,
      cashRub: Number(row.cash_rub),
      positions: row.positions_json,
      elapsedMs: Number(row.elapsed_ms),
      result: row.result_json,
      idempotencyKeys: row.idempotency_keys_json,
      trades: tradesResult.rows.map((trade) => ({
        id: trade.id,
        type: trade.type,
        symbol: trade.symbol,
        quantity: Number(trade.quantity),
        amountRub: Number(trade.amount_rub),
        priceRub: Number(trade.price_rub),
        scenarioAt: trade.scenario_at.toISOString(),
        triggerEventId: trade.trigger_event_id,
      })),
    };
  }

  async listCompleted(userId: string): Promise<CompletedSimulationRecord[]> {
    const result = await this.pool.query<{ id: string; scenario_id: string; result_json: unknown; updated_at: Date }>(
      `SELECT id, scenario_id, result_json, updated_at
       FROM simulation_sessions
       WHERE user_id = $1 AND status = 'COMPLETED' AND result_json IS NOT NULL
       ORDER BY updated_at DESC`,
      [userId],
    );
    return result.rows.map((row) => ({ sessionId: row.id, scenarioId: row.scenario_id, result: row.result_json, completedAt: row.updated_at.toISOString() }));
  }

  async save(session: PersistedSimulation) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO users (id, display_name) VALUES ($1, 'Алексей')
         ON CONFLICT (id) DO UPDATE SET last_seen_at = NOW()`,
        [session.userId],
      );
      await client.query(
        `INSERT INTO simulation_sessions
          (id, user_id, scenario_id, scenario_version, status, cash_rub, positions_json, elapsed_ms, result_json, idempotency_keys_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10::jsonb)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           cash_rub = EXCLUDED.cash_rub,
           positions_json = EXCLUDED.positions_json,
           elapsed_ms = EXCLUDED.elapsed_ms,
           result_json = EXCLUDED.result_json,
           idempotency_keys_json = EXCLUDED.idempotency_keys_json,
           updated_at = NOW()`,
        [
          session.id, session.userId, session.scenarioId, session.scenarioVersion, session.status,
          session.cashRub, JSON.stringify(session.positions), session.elapsedMs,
          session.result === null ? null : JSON.stringify(session.result), JSON.stringify(session.idempotencyKeys),
        ],
      );
      for (const trade of session.trades) {
        await client.query(
          `INSERT INTO simulation_transactions
            (id, session_id, type, symbol, quantity, amount_rub, price_rub, scenario_at, trigger_event_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [trade.id, session.id, trade.type, trade.symbol, trade.quantity, trade.amountRub, trade.priceRub, trade.scenarioAt, trade.triggerEventId],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export async function createSimulationRepository(): Promise<SimulationRepository> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[api] DATABASE_URL is not set; simulations use memory and reset on restart");
    return new MemorySimulationRepository();
  }
  const pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 5_000 });
  const repository = new PostgresSimulationRepository(pool);
  await repository.migrate();
  console.log("[api] PostgreSQL simulation persistence is ready");
  return repository;
}
