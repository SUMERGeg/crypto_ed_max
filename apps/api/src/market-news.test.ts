import assert from "node:assert/strict";
import test from "node:test";

import { getMarketNews, listMarketNews } from "./market-news.js";

test("recent market news includes six sourced stories from July to September 2026", () => {
  const newIds = [
    "sec-tokenized-stocks-2026",
    "russia-crypto-rules-effective-2026",
    "digital-ruble-start-2026",
    "ethereum-plataberget-testnet-2026",
    "ethereum-webcat-grant-2026",
    "fatf-defi-report-2026",
  ];
  const summaries = listMarketNews();

  for (const id of newIds) {
    const summary = summaries.find((item) => item.id === id);
    const article = getMarketNews(id);
    assert.ok(summary, `${id} must appear in the news list`);
    assert.ok(article, `${id} must open as a full article`);
    assert.ok(Date.parse(article.publishedAt) >= Date.parse("2026-07-21"));
    assert.ok(Date.parse(article.publishedAt) <= Date.parse("2026-09-28T23:59:59Z"));
    assert.match(article.sourceUrl, /^https:\/\//);
    assert.ok(article.whatHappened && article.whyImportant && article.analysis && article.takeaway);
  }

  assert.match(getMarketNews("russia-crypto-rules-effective-2026")!.whatHappened, /1 сентября/);
  assert.match(getMarketNews("digital-ruble-start-2026")!.takeaway, /не криптовалюта/);
  assert.deepEqual(summaries.map((item) => item.publishedAt),
    [...summaries.map((item) => item.publishedAt)].sort().reverse());
});
