import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { sourceBlockchainLessonSpecs, sourceCryptoLessonSpecs } from "./source-lessons.js";

test("every source lesson page points to an existing, distinct illustration", () => {
  for (const [folder, lessons] of [
    ["source-crypto", sourceCryptoLessonSpecs],
    ["source-blockchain", sourceBlockchainLessonSpecs],
  ] as const) {
    const seen = new Set<string>();
    for (const lesson of lessons) {
      for (const page of lesson.pages) {
        const src = page.illustration?.src;
        assert.ok(src, `Missing illustration for ${lesson.id}`);
        assert.ok(src.startsWith(`/assets/lessons/${folder}/`), `Wrong illustration folder: ${src}`);
        assert.ok(!seen.has(src), `Duplicate illustration: ${src}`);
        seen.add(src);
        assert.ok(existsSync(new URL(`../../web/public${src}`, import.meta.url)), `Missing image file: ${src}`);
      }
    }
  }
});
