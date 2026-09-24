import assert from "node:assert/strict";
import test from "node:test";
import { sourceBlockchainLessonSpecs, sourceCryptoLessonSpecs } from "./source-lessons.js";

function expectedImageSources(folder: "source-crypto" | "source-blockchain", specs: typeof sourceCryptoLessonSpecs) {
  return specs.flatMap((lesson, lessonIndex) => lesson.pages.map((_, pageIndex) =>
    `/assets/lessons/${folder}/lesson-${String(lessonIndex + 1).padStart(2, "0")}-screen-${String(pageIndex + 1).padStart(2, "0")}.webp`,
  ));
}

test("source lessons map every page to its generated illustration", () => {
  const cryptoImages = sourceCryptoLessonSpecs.flatMap((lesson) => lesson.pages.map((page) => page.illustration?.src));
  const blockchainImages = sourceBlockchainLessonSpecs.flatMap((lesson) => lesson.pages.map((page) => page.illustration?.src));

  assert.deepEqual(cryptoImages, expectedImageSources("source-crypto", sourceCryptoLessonSpecs));
  assert.deepEqual(blockchainImages, expectedImageSources("source-blockchain", sourceBlockchainLessonSpecs));
});
