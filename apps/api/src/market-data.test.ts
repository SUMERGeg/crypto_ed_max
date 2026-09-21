import assert from "node:assert/strict";
import test from "node:test";
import { getMarketAssetsFromProviders, getMarketHistoryFromProviders } from "./market-data.js";

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

test("uses real CoinGecko history without generating synthetic points", async () => {
  const request = async <T>(url: string): Promise<T> => {
    assert.match(url, /coins\/bitcoin\/market_chart/);
    return { prices: [[1_700_000_000_000, 6_000_000], [1_700_003_600_000, 6_100_000]] } as T;
  };

  const history = await getMarketHistoryFromProviders("BTC", "1D", request);

  assert.equal(history?.source, "CoinGecko");
  assert.deepEqual(history?.series.map((point) => point.priceRub), [6_000_000, 6_100_000]);
});

test("falls back to real Binance candles converted to rubles", async () => {
  const request = async <T>(url: string): Promise<T> => {
    if (url.includes("coingecko")) throw new Error("CoinGecko unavailable");
    if (url.includes("cbr-xml-daily")) return { Valute: { USD: { Value: 100 } } } as T;
    if (url.includes("binance.vision")) return [
      [1_700_000_000_000, "0", "0", "0", "60000"],
      [1_700_003_600_000, "0", "0", "0", "61000"],
    ] as T;
    throw new Error("Unexpected provider");
  };

  const history = await getMarketHistoryFromProviders("BTC", "1D", request);

  assert.equal(history?.source, "Binance + USD/RUB");
  assert.deepEqual(history?.series.map((point) => point.priceRub), [6_000_000, 6_100_000]);
});

test("returns no history when all live providers are unavailable", async () => {
  const request = async <T>(): Promise<T> => { throw new Error("offline"); };

  const history = await getMarketHistoryFromProviders("BTC", "3M", request);

  assert.equal(history, null);
});
