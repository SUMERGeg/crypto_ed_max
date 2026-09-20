import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;

export interface SecurityRepository {
  getCompletedCaseIds(userId: string): Promise<string[]>;
  recordAttempt(userId: string, caseId: string, optionId: string, safetyLevel: "SAFE" | "RISKY", completedAt: string): Promise<void>;
}

class MemorySecurityRepository implements SecurityRepository {
  private readonly attempts = new Map<string, Set<string>>();

  async getCompletedCaseIds(userId: string) {
    return [...(this.attempts.get(userId) ?? new Set<string>())];
  }

  async recordAttempt(userId: string, caseId: string) {
    const completed = this.attempts.get(userId) ?? new Set<string>();
    completed.add(caseId);
    this.attempts.set(userId, completed);
  }
}

class PostgresSecurityRepository implements SecurityRepository {
  constructor(private readonly pool: InstanceType<typeof Pool>) {}

  async migrate() {
    const migration = await readFile(new URL("../migrations/0004_security_progress.sql", import.meta.url), "utf8");
    await this.pool.query(migration);
  }

  async getCompletedCaseIds(userId: string) {
    const result = await this.pool.query<{ case_id: string }>(
      "SELECT DISTINCT case_id FROM security_case_attempts WHERE user_id = $1 ORDER BY case_id",
      [userId],
    );
    return result.rows.map((row) => row.case_id);
  }

  async recordAttempt(userId: string, caseId: string, optionId: string, safetyLevel: "SAFE" | "RISKY", completedAt: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO users (id, display_name) VALUES ($1, 'Алексей')
         ON CONFLICT (id) DO UPDATE SET last_seen_at = NOW()`,
        [userId],
      );
      await client.query(
        `INSERT INTO security_case_attempts (user_id, case_id, option_id, safety_level, completed_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, caseId, optionId, safetyLevel, completedAt],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export async function createSecurityRepository(): Promise<SecurityRepository> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[api] DATABASE_URL is not set; security progress uses memory and resets on restart");
    return new MemorySecurityRepository();
  }
  const pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 5_000 });
  const repository = new PostgresSecurityRepository(pool);
  await repository.migrate();
  console.log("[api] PostgreSQL security progress is ready");
  return repository;
}
