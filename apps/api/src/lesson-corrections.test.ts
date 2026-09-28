import assert from "node:assert/strict";
import { test } from "node:test";
import { formatSourceLessonBody, lessons } from "./data.js";

test("emphasis preserves whole words, hyphenated terms, numbers and existing Markdown", () => {
  const body = formatSourceLessonBody("блокчейнах блокчейны блокчейне блокчейн-сетей транзакциями.\n\n0,1 BTC и 21 000 000 BTC\n\nBTC можно:\n\nпереводить\n\nхранить");
  for (const term of ["блокчейнах", "блокчейны", "блокчейне", "блокчейн-сетей", "транзакциями", "0,1 BTC", "21 000 000 BTC"]) assert.ok(body.includes(`**${term}**`), term);
  assert.ok(body.includes("**BTC можно:**"));
  assert.ok(!body.includes("***"));
  assert.equal(formatSourceLessonBody("**Bitcoin** и [ФНС](https://www.nalog.gov.ru/)"), "**Bitcoin** и [ФНС](https://www.nalog.gov.ru/)");
});
test("short diagrams are emphasized entirely, long diagrams have no partial emphasis", () => {
  assert.equal(formatSourceLessonBody("BTC → стейблкоин → ETH"), "> **BTC → стейблкоин → ETH**");
  const flow = "разработчик создаёт смарт-контракт → размещает его в Ethereum → пользователь отправляет транзакцию → программа выполняет заданное действие";
  assert.equal(formatSourceLessonBody(flow), `> ${flow}`);
});
test("Bitcoin repeated screen is removed without shifting artwork", () => {
  const pages = lessons.find(l => l.id === "crypto-bitcoin")!.detailedPages!;
  assert.equal(pages.length, 7);
  assert.equal(pages[6]!.eyebrow, "Шаг 7");
  assert.match(pages[6]!.illustration!.src, /screen-08.webp$/);
});
test("lesson quizzes distribute correct answers across positions", () => {
  for (const lesson of lessons) {
    const positions = lesson.quiz.questions.map(q => q.options.findIndex(o => o.isCorrect));
    assert.equal(new Set(positions).size, 3, lesson.id);
    for (const question of lesson.quiz.questions) {
      assert.equal(question.options.filter(o => o.isCorrect).length, 1);
    }
  }
});
test("crypto quiz options remain comparable in length", () => {
  for (const lesson of lessons.filter(l => l.courseId === "crypto-basics")) {
    for (const question of lesson.quiz.questions) {
      const lengths = question.options.map(o => o.text.length);
      assert.ok(Math.max(...lengths) / Math.min(...lengths) < 2, question.id);
    }
  }
});
test("law screens have emphasis, callouts and valid official inline links", () => {
  const law = lessons.filter(l => l.courseId === "law-russia");
  for (const lesson of law) {
    const text = lesson.detailedPages!.map(p => p.body).join("\n");
    assert.match(text, /\*\*[^*]+\*\*/);
    assert.match(text, /> /);
    assert.match(text, /\[[^\]]+\]\(https:\/\//);
    assert.ok(!text.includes("***"));
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const url = new URL(match[1]!);
      assert.ok(["www.cbr.ru", "www.nalog.gov.ru", "pravo.gov.ru", "publication.pravo.gov.ru"].includes(url.hostname));
    }
  }
  assert.deepEqual(lessons.filter(l => l.courseId === "finance").map(l => l.title), ["Риск и доходность", "Диверсификация", "Волатильность и ликвидность", "Капитализация, предложение и комиссии", "План управления риском"]);
});
