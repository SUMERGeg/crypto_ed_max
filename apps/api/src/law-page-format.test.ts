import assert from "node:assert/strict";
import { test } from "node:test";
import { lawLessonSpecs } from "./law-lessons.js";
import { structureLawPage } from "./law-page-format.js";
import { lessons } from "./data.js";

const plainText = (body: string) => body.replace(/^[->] /gm, "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();

test("law formatting preserves every word, punctuation and sequence on all screens", () => {
  for (const lesson of lawLessonSpecs) {
    lesson.pages.forEach((page, index) => {
      assert.equal(plainText(structureLawPage(page, lesson.id, index + 1)), plainText(page.body), `${lesson.id} screen ${index + 1}`);
    });
  }
});

test("each law lesson includes unordered lists and short emphasized quotes", () => {
  for (const lesson of lessons.filter(item => item.courseId === "law-russia")) {
    const body = lesson.detailedPages!.map(page => page.body).join("\n\n");
    assert.match(body, /^- /m, lesson.id);
    assert.match(body, /^> \*\*/m, lesson.id);
    assert.doesNotMatch(body, /^\d+\. /m, lesson.id);
    assert.equal(lesson.detailedPages!.length, lawLessonSpecs.find(item => item.id === lesson.id)!.pages.length);
  }
});
