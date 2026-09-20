import assert from "node:assert/strict";
import { test } from "node:test";
import { getHome, getLesson, initializeLearningState, openLesson } from "./data.js";
import type { ProgressRepository, ProgressSnapshot, QuizAttemptRecord } from "./persistence.js";

class TestProgressRepository implements ProgressRepository {
  private readonly snapshots = new Map<string, ProgressSnapshot>();
  async getSnapshot(userId: string) {
    const snapshot = this.snapshots.get(userId) ?? { completedLessonIds: [], openedLessonIds: [], lastOpenedLessonId: null, quizAttempts: [] };
    return structuredClone(snapshot);
  }
  async openLesson(userId: string, _displayName: string, lessonId: string) {
    const snapshot = await this.getSnapshot(userId);
    snapshot.openedLessonIds.push(lessonId);
    snapshot.lastOpenedLessonId = lessonId;
    this.snapshots.set(userId, snapshot);
  }
  async recordQuizAttempt(userId: string, _displayName: string, attempt: QuizAttemptRecord, completed: boolean) {
    const snapshot = await this.getSnapshot(userId);
    snapshot.quizAttempts.push(attempt);
    if (completed) snapshot.completedLessonIds.push(attempt.lessonId);
    this.snapshots.set(userId, snapshot);
  }
}

test("MAX learners see their own names and lesson progress", async () => {
  await initializeLearningState(new TestProgressRepository());
  const anna = { id: "max:101", displayName: "Анна" };
  const boris = { id: "max:202", displayName: "Борис" };
  assert.equal((await getHome(anna)).user.displayName, "Анна");
  assert.equal((await getHome(boris)).user.displayName, "Борис");
  await openLesson("crypto-intro", anna);
  assert.equal((await getLesson("crypto-intro", anna))?.status, "OPENED");
  assert.equal((await getLesson("crypto-intro", boris))?.status, "NOT_STARTED");
});
