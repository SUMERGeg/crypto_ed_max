import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;

export type QuizAttemptRecord = {
  quizId: string;
  lessonId: string;
  correctAnswers: number;
  totalQuestions: number;
  scorePercent: number;
  answers: Array<{ questionId: string; optionIds: string[] }>;
  completedAt: string;
};

export type ProgressSnapshot = {
  completedLessonIds: string[];
  openedLessonIds: string[];
  lastOpenedLessonId: string | null;
  quizAttempts: QuizAttemptRecord[];
};

export interface ProgressRepository {
  getSnapshot(userId: string, displayName: string): Promise<ProgressSnapshot>;
  openLesson(userId: string, displayName: string, lessonId: string): Promise<void>;
  recordQuizAttempt(userId: string, displayName: string, attempt: QuizAttemptRecord, completedLesson: boolean): Promise<void>;
  hasViewedRoute(userId: string): Promise<boolean>;
  markRouteViewed(userId: string, displayName: string): Promise<void>;
}

export class MemoryProgressRepository implements ProgressRepository {
  private readonly progress = new Map<string, ProgressSnapshot>();
  private readonly viewedRoutes = new Set<string>();

  async hasViewedRoute(userId: string): Promise<boolean> {
    return this.viewedRoutes.has(userId);
  }

  async markRouteViewed(userId: string): Promise<void> {
    this.viewedRoutes.add(userId);
  }

  async getSnapshot(userId: string, _displayName: string): Promise<ProgressSnapshot> {
    const existing = this.progress.get(userId);
    if (existing) return structuredClone(existing);
    const seeded: ProgressSnapshot = {
      completedLessonIds: userId === "demo-user" ? ["crypto-intro"] : [],
      openedLessonIds: userId === "demo-user" ? ["blockchain-ledger"] : [],
      lastOpenedLessonId: userId === "demo-user" ? "blockchain-ledger" : null,
      quizAttempts: [],
    };
    this.progress.set(userId, seeded);
    return structuredClone(seeded);
  }

  async openLesson(userId: string, _displayName: string, lessonId: string): Promise<void> {
    const snapshot = await this.getSnapshot(userId, _displayName);
    snapshot.lastOpenedLessonId = lessonId;
    if (!snapshot.completedLessonIds.includes(lessonId) && !snapshot.openedLessonIds.includes(lessonId)) {
      snapshot.openedLessonIds.push(lessonId);
    }
    this.progress.set(userId, snapshot);
  }

  async recordQuizAttempt(userId: string, _displayName: string, attempt: QuizAttemptRecord, completedLesson: boolean): Promise<void> {
    const snapshot = await this.getSnapshot(userId, _displayName);
    if (completedLesson && !snapshot.completedLessonIds.includes(attempt.lessonId)) snapshot.completedLessonIds.push(attempt.lessonId);
    if (completedLesson) snapshot.openedLessonIds = snapshot.openedLessonIds.filter((id) => id !== attempt.lessonId);
    snapshot.quizAttempts.push(attempt);
    this.progress.set(userId, snapshot);
  }
}

class PostgresProgressRepository implements ProgressRepository {
  constructor(private readonly pool: InstanceType<typeof Pool>) {}

  async migrate() {
    const migration = await readFile(new URL("../migrations/0001_learning_progress.sql", import.meta.url), "utf8");
    await this.pool.query(migration);
    const routeMigration = await readFile(new URL("../migrations/0008_route_viewed.sql", import.meta.url), "utf8");
    await this.pool.query(routeMigration);
  }

  async hasViewedRoute(userId: string): Promise<boolean> {
    const result = await this.pool.query<{ route_viewed_at: Date | null }>("SELECT route_viewed_at FROM users WHERE id = $1", [userId]);
    return Boolean(result.rows[0]?.route_viewed_at);
  }

  async markRouteViewed(userId: string, displayName: string): Promise<void> {
    await this.ensureUser(userId, displayName);
    await this.pool.query("UPDATE users SET route_viewed_at = COALESCE(route_viewed_at, NOW()) WHERE id = $1", [userId]);
  }

  private async ensureUser(userId: string, displayName: string) {
    await this.pool.query(
      `INSERT INTO users (id, display_name)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE
       SET display_name = EXCLUDED.display_name, last_seen_at = NOW()`,
      [userId, displayName],
    );
  }

  async getSnapshot(userId: string, displayName: string): Promise<ProgressSnapshot> {
    await this.ensureUser(userId, displayName);
    const [progressResult, stateResult, attemptsResult] = await Promise.all([
      this.pool.query<{ lesson_id: string; status: "OPENED" | "COMPLETED" }>(
        "SELECT lesson_id, status FROM lesson_progress WHERE user_id = $1",
        [userId],
      ),
      this.pool.query<{ last_opened_lesson_id: string | null }>(
        "SELECT last_opened_lesson_id FROM user_learning_state WHERE user_id = $1",
        [userId],
      ),
      this.pool.query<{
        quiz_id: string;
        lesson_id: string;
        correct_answers: number;
        total_questions: number;
        score_percent: number;
        answers_json: QuizAttemptRecord["answers"];
        completed_at: Date;
      }>(
        `SELECT quiz_id, lesson_id, correct_answers, total_questions, score_percent, answers_json, completed_at
         FROM quiz_attempts WHERE user_id = $1 ORDER BY completed_at`,
        [userId],
      ),
    ]);

    return {
      completedLessonIds: progressResult.rows.filter((row) => row.status === "COMPLETED").map((row) => row.lesson_id),
      openedLessonIds: progressResult.rows.filter((row) => row.status === "OPENED").map((row) => row.lesson_id),
      lastOpenedLessonId: stateResult.rows[0]?.last_opened_lesson_id ?? null,
      quizAttempts: attemptsResult.rows.map((row) => ({
        quizId: row.quiz_id,
        lessonId: row.lesson_id,
        correctAnswers: row.correct_answers,
        totalQuestions: row.total_questions,
        scorePercent: row.score_percent,
        answers: row.answers_json,
        completedAt: row.completed_at.toISOString(),
      })),
    };
  }

  async openLesson(userId: string, displayName: string, lessonId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO users (id, display_name) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, last_seen_at = NOW()`,
        [userId, displayName],
      );
      await client.query(
        `INSERT INTO lesson_progress (user_id, lesson_id, status, first_opened_at)
         VALUES ($1, $2, 'OPENED', NOW())
         ON CONFLICT (user_id, lesson_id) DO UPDATE SET
           status = CASE WHEN lesson_progress.status = 'COMPLETED' THEN 'COMPLETED' ELSE 'OPENED' END,
           updated_at = NOW()`,
        [userId, lessonId],
      );
      await client.query(
        `INSERT INTO user_learning_state (user_id, last_opened_lesson_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET last_opened_lesson_id = EXCLUDED.last_opened_lesson_id, updated_at = NOW()`,
        [userId, lessonId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async recordQuizAttempt(userId: string, displayName: string, attempt: QuizAttemptRecord, completedLesson: boolean): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO users (id, display_name) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, last_seen_at = NOW()`,
        [userId, displayName],
      );
      if (completedLesson) {
        await client.query(
          `INSERT INTO lesson_progress (user_id, lesson_id, status, first_opened_at, completed_at)
           VALUES ($1, $2, 'COMPLETED', NOW(), $3)
           ON CONFLICT (user_id, lesson_id) DO UPDATE SET status = 'COMPLETED', completed_at = $3, updated_at = NOW()`,
          [userId, attempt.lessonId, attempt.completedAt],
        );
      }
      await client.query(
        `INSERT INTO quiz_attempts
          (user_id, quiz_id, lesson_id, correct_answers, total_questions, score_percent, answers_json, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        [userId, attempt.quizId, attempt.lessonId, attempt.correctAnswers, attempt.totalQuestions, attempt.scorePercent, JSON.stringify(attempt.answers), attempt.completedAt],
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

export async function createProgressRepository(): Promise<ProgressRepository> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[api] DATABASE_URL is not set; learning progress uses memory and resets on restart");
    return new MemoryProgressRepository();
  }

  const pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 5_000 });
  const repository = new PostgresProgressRepository(pool);
  await repository.migrate();
  console.log("[api] PostgreSQL learning progress is ready");
  return repository;
}
