import assert from "node:assert/strict";
import test from "node:test";
import { scenarioArtFor } from "./scenario-art.js";

test("each Market Replay scenario has a dedicated card illustration", () => {
  const scenarioIds = [
    "global-shock-2020",
    "boom-2017-2018",
    "winter-2021-2022",
    "recovery-2023-2024",
    "modern-2024-2025",
  ];

  const illustrations = scenarioIds.map(scenarioArtFor);

  assert.equal(new Set(illustrations).size, scenarioIds.length);
  illustrations.forEach((src) => assert.match(src, /^\/assets\/scenarios\/.+\.webp$/));
});
