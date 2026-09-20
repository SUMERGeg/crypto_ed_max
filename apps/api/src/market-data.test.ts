import assert from "node:assert/strict";
import test from "node:test";
import { getMarketAssetsFromProviders } from "./market-data.js";

test("uses Binance quotes for all five assets when CoinGecko is unavailable", async () => {
  const prices: Record<string, [string, string]> = {
    BTCUSDT: ["80000", "1.25"],
    ETHUSDT: ["3000", "-0.5"],
    SOLUSDT: ["150", "2.1"],
    TONUSDT: ["2", "0.4"],
    LTCUSDT: ["80", "-1.2"],
  };
  const request = async <T>(url: string): Promise<T> => {
    if (url.includes("coingecko")) throw new Error("CoinGecko unavailable");
    if (url.includes("cbr-xml-daily")) return { Valute: { USD: { Value: 100 } } } as T;
    const symbol = new URL(url).searchParams.get("symbol")!;
    const [lastPrice, priceChangePercent] = prices[symbol]!;
    return { lastPrice, priceChangePercent } as T;
  };

  const market = await getMarketAssetsFromProviders(request);

  assert.equal(market.source, "Binance + USD/RUB");
  assert.equal(market.isStale, false);
  assert.deepEqual(market.assets.map((asset) => asset.symbol), ["BTC", "ETH", "SOL", "TON", "LTC"]);
  assert.equal(market.assets[0]!.priceRub, 8_000_000);
  assert.equal(market.assets[1]!.change24hPercent, -0.5);
});
