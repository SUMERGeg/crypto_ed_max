import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { getHome, getLesson, getQuizByLesson, initializeLearningState, lessons, openLesson } from "./data.js";
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

test("crypto and blockchain courses use the first five source lessons in order", () => {
  const titlesFor = (courseId: string) => lessons
    .filter((lesson) => lesson.courseId === courseId)
    .sort((left, right) => left.order - right.order)
    .map((lesson) => lesson.title);

  assert.deepEqual(titlesFor("crypto-basics"), [
    "Что такое криптовалюта",
    "Bitcoin",
    "Монеты и токены",
    "Ethereum и смарт-контракты",
    "Стейблкоины",
  ]);
  assert.deepEqual(titlesFor("blockchain"), [
    "Блокчейн и распределённый реестр",
    "Как создаётся транзакция",
    "Как транзакция попадает в блок",
    "Как сеть приходит к согласию",
    "Bitcoin: майнинг и Proof of Work",
  ]);
});

test("source lessons retain readable Markdown emphasis and source warnings", async () => {
  await initializeLearningState(new TestProgressRepository());
  const lesson = await getLesson("crypto-intro", { id: "max:source-format", displayName: "Ирина" });
  assert.ok(lesson);
  assert.match(lesson.pages[0]?.kind === "CONTENT" ? lesson.pages[0].body : "", /\*\*Криптовалюта\*\*/);
  const tokensLesson = await getLesson("crypto-tokens", { id: "max:source-format", displayName: "Ирина" });
  assert.match(tokensLesson?.pages.filter((page) => page.kind === "CONTENT").map((page) => page.body).join("\n") ?? "", /> \*\*Важно:\*\*/);
});

test("finance lessons preserve seven source screens, six illustrations and no intermediate checks", async () => {
  await initializeLearningState(new TestProgressRepository());
  const learner = { id: "max:finance", displayName: "Ирина" };

  for (const lessonId of ["finance-risk-return", "finance-diversification", "finance-volatility", "finance-cap-fees", "finance-risk-plan"]) {
    const lesson = await getLesson(lessonId, learner);
    assert.ok(lesson);
    assert.equal(lesson.pages.length, 7);
    assert.ok(lesson.pages.every((page) => page.kind === "CONTENT"));
    assert.equal(lesson.pages.filter((page) => page.kind === "CONTENT" && page.illustration?.src.startsWith("/assets/lessons/financial-basics/")).length, 6);
  }

  const firstLesson = await getLesson("finance-risk-return", learner);
  assert.equal(firstLesson?.pages[0]?.kind, "CONTENT");
  assert.match(firstLesson?.pages[0]?.body ?? "", /Доходность показывает, как изменилась стоимость актива за определённый период/);
});

test("finance quiz keeps full source text for every answer option", async () => {
  await initializeLearningState(new TestProgressRepository());
  const lesson = await getLesson("finance-volatility", { id: "max:quiz", displayName: "Ирина" });
  const quizQuestion = (await import("./data.js")).getQuizByLesson("finance-volatility")?.questions[1];
  assert.ok(lesson);
  assert.deepEqual(quizQuestion?.options.map((option) => option.text).sort(), [
    "цену актива практически невозможно изменить",
    "актив обязательно имеет низкий риск",
    "крупную сделку легче провести без сильного влияния на цену",
  ].sort());
});

test("Russia and law is five sequential lessons with full pages and six-question final quizzes", async () => {
  await initializeLearningState(new TestProgressRepository());
  const learner = { id: "max:law", displayName: "Ирина" };
  const ids = ["law-status", "law-taxes", "law-payments", "law-mining", "law-safe-check"];

  for (const [index, id] of ids.entries()) {
    const lesson = await getLesson(id, learner);
    const quiz = getQuizByLesson(id);
    assert.ok(lesson);
    assert.equal(lesson.order, index + 1);
    assert.ok(lesson.pages.length >= 7);
    assert.ok(lesson.pages.every((page) => page.kind === "CONTENT"));
    assert.ok(lesson.pages.every((page) => page.kind !== "CONTENT" || page.body.trim().split(/\n\s*\n/).length >= 2));
    assert.equal(quiz?.questions.length, 6);
    assert.ok(lessons.find((item) => item.id === id)?.quiz.questions.every((question) => question.options.filter((option) => option.isCorrect).length === 1));
  }
});

test("every Russia and law screen exposes its matching WebP illustration", async () => {
  await initializeLearningState(new TestProgressRepository());
  const learner = { id: "max:law-images", displayName: "Ирина" };
  const pageCounts = new Map([
    ["law-status", 7],
    ["law-taxes", 7],
    ["law-payments", 8],
    ["law-mining", 7],
    ["law-safe-check", 7],
  ]);

  for (const [id, count] of pageCounts) {
    const lesson = await getLesson(id, learner);
    assert.ok(lesson);
    assert.equal(lesson.pages.length, count);
    for (const [index, page] of lesson.pages.entries()) {
      assert.equal(page.kind, "CONTENT");
      if (page.kind !== "CONTENT") continue;
      const expected = "/assets/lessons/russia-law/" + id + "-step-" + String(index + 1).padStart(2, "0") + ".webp";
      assert.equal(page.illustration?.src, expected);
      assert.ok(page.illustration?.alt);
      assert.ok(existsSync(new URL("../../web/public" + expected, import.meta.url)));
    }
  }
});
