import { readFile } from "node:fs/promises";
import pg from "pg";
import type { CareerAttempt } from "./career-data.js";

const { Pool } = pg;

export interface CareerRepository {
  loadAll(): Promise<CareerAttempt[]>;
  save(attempt: CareerAttempt): Promise<void>;
}

class MemoryCareerRepository implements CareerRepository {
  private readonly attempts = new Map<string, CareerAttempt>();
  async loadAll() { return [...this.attempts.values()].map((attempt) => structuredClone(attempt)); }
  async save(attempt: CareerAttempt) { this.attempts.set(attempt.id, structuredClone(attempt)); }
}

class PostgresCareerRepository implements CareerRepository {
  constructor(private readonly pool: InstanceType<typeof Pool>) {}

  async migrate() {
    const migration = await readFile(new URL("../migrations/0005_career_attempts.sql", import.meta.url), "utf8");
    await this.pool.query(migration);
  }

  async loadAll() {
    const result = await this.pool.query<{ attempt_json: CareerAttempt }>("SELECT attempt_json FROM career_attempts");
    return result.rows.map((row) => row.attempt_json);
  }

  async save(attempt: CareerAttempt) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO users (id, display_name) VALUES ($1, 'Ученик') ON CONFLICT (id) DO NOTHING`,
        [attempt.userId],
      );
      await client.query(
        `INSERT INTO career_attempts (id, user_id, attempt_json)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (id) DO UPDATE SET attempt_json = EXCLUDED.attempt_json, updated_at = NOW()`,
        [attempt.id, attempt.userId, JSON.stringify(attempt)],
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

export async function createCareerRepository(): Promise<CareerRepository> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return new MemoryCareerRepository();
  const repository = new PostgresCareerRepository(new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5_000 }));
  await repository.migrate();
  return repository;
}
