import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;

export type OnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export type OnboardingState = {
  status: OnboardingStatus;
  step: number;
  version: number;
  completedAt: string | null;
};

export type OnboardingUpdate = {
  status: Exclude<OnboardingStatus, "NOT_STARTED">;
  step: number;
};

export interface OnboardingRepository {
  get(userId: string): Promise<OnboardingState>;
  save(userId: string, update: OnboardingUpdate): Promise<OnboardingState>;
}

function initialState(status: OnboardingStatus = "NOT_STARTED"): OnboardingState {
  return { status, step: status === "COMPLETED" ? 4 : 1, version: 1, completedAt: null };
}

export class MemoryOnboardingRepository implements OnboardingRepository {
  private readonly states = new Map<string, OnboardingState>();

  async get(userId: string) {
    const state = this.states.get(userId) ?? initialState();
    return structuredClone(state);
  }

  async save(userId: string, update: OnboardingUpdate) {
    const final = update.status === "COMPLETED" || update.status === "SKIPPED";
    const state: OnboardingState = {
      status: update.status,
      step: update.step,
      version: 1,
      completedAt: final ? new Date().toISOString() : null,
    };
    this.states.set(userId, state);
    return structuredClone(state);
  }
}

class PostgresOnboardingRepository implements OnboardingRepository {
  constructor(private readonly pool: InstanceType<typeof Pool>) {}

  async migrate() {
    const schemaMigration = await readFile(new URL("../migrations/0006_onboarding.sql", import.meta.url), "utf8");
    const resetMigration = await readFile(new URL("../migrations/0007_reset_onboarding_for_all_users.sql", import.meta.url), "utf8");
    await this.pool.query(schemaMigration);
    await this.pool.query(resetMigration);
  }

  async get(userId: string): Promise<OnboardingState> {
    const result = await this.pool.query<{
      onboarding_eligible: boolean;
      status: Exclude<OnboardingStatus, "NOT_STARTED"> | null;
      step: number | null;
      version: number | null;
      completed_at: Date | null;
    }>(
      `SELECT u.onboarding_eligible, s.status, s.step, s.version, s.completed_at
       FROM users u
       LEFT JOIN onboarding_state s ON s.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) return initialState();
    if (!row.status) return initialState(row.onboarding_eligible ? "NOT_STARTED" : "COMPLETED");
    return {
      status: row.status,
      step: row.step ?? 1,
      version: row.version ?? 1,
      completedAt: row.completed_at?.toISOString() ?? null,
    };
  }

  async save(userId: string, update: OnboardingUpdate): Promise<OnboardingState> {
    const final = update.status === "COMPLETED" || update.status === "SKIPPED";
    await this.pool.query(
      `INSERT INTO onboarding_state (user_id, status, step, version, completed_at)
       VALUES ($1, $2, $3, 1, CASE WHEN $4 THEN NOW() ELSE NULL END)
       ON CONFLICT (user_id) DO UPDATE SET
         status = EXCLUDED.status,
         step = EXCLUDED.step,
         completed_at = EXCLUDED.completed_at,
         updated_at = NOW()`,
      [userId, update.status, update.step, final],
    );
    return this.get(userId);
  }
}

export async function createOnboardingRepository(): Promise<OnboardingRepository> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[api] DATABASE_URL is not set; onboarding state uses memory and resets on restart");
    return new MemoryOnboardingRepository();
  }
  const pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 5_000 });
  const repository = new PostgresOnboardingRepository(pool);
  await repository.migrate();
  console.log("[api] PostgreSQL onboarding state is ready");
  return repository;
}
