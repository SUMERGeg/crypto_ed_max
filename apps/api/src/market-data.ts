type MarketPeriod = "1D" | "1W" | "1M" | "3M";
type PricePoint = { at: string; priceRub: number };

type AssetConfig = {
  symbol: string;
  name: string;
  coinGeckoId: string;
  binanceSymbol: string;
  okxSymbol: string;
  accent: string;
  description: string;
  fallbackPriceRub: number;
  fallbackChange: number;
};

export type CurrentMarketAsset = {
  symbol: string;
  name: string;
  priceRub: number;
  change24hPercent: number;
  sourceTimestamp: string;
  isStale: boolean;
  sparklineRub: number[];
  accent: string;
};

export type MarketAssetList = {
  assets: CurrentMarketAsset[];
  isStale: boolean;
  source: string;
  sourceUrl: string;
  updatedAt: string;
  notice?: string;
};

const assets: AssetConfig[] = [
  { symbol: "BTC", name: "Bitcoin", coinGeckoId: "bitcoin", binanceSymbol: "BTCUSDT", okxSymbol: "BTC-USDT", accent: "#f5a13a", description: "Первая и крупнейшая по капитализации криптовалюта с заранее ограниченным выпуском.", fallbackPriceRub: 8_432_000, fallbackChange: 2.4 },
  { symbol: "ETH", name: "Ethereum", coinGeckoId: "ethereum", binanceSymbol: "ETHUSDT", okxSymbol: "ETH-USDT", accent: "#718bd5", description: "Актив сети Ethereum, в которой работают смарт-контракты и децентрализованные приложения.", fallbackPriceRub: 312_000, fallbackChange: 1.8 },
  { symbol: "SOL", name: "Solana", coinGeckoId: "solana", binanceSymbol: "SOLUSDT", okxSymbol: "SOL-USDT", accent: "#7354e8", description: "Актив сети Solana, рассчитанной на большое число быстрых и недорогих операций.", fallbackPriceRub: 14_800, fallbackChange: -0.6 },
  { symbol: "TON", name: "Toncoin", coinGeckoId: "the-open-network", binanceSymbol: "TONUSDT", okxSymbol: "TON-USDT", accent: "#2f9bea", description: "Основной актив сети TON, используемый для комиссий и работы приложений внутри экосистемы.", fallbackPriceRub: 520, fallbackChange: 3.1 },
  { symbol: "LTC", name: "Litecoin", coinGeckoId: "litecoin", binanceSymbol: "LTCUSDT", okxSymbol: "LTC-USDT", accent: "#608bd3", description: "Криптовалюта для переводов, созданная на основе идей Bitcoin с более коротким временем блока.", fallbackPriceRub: 7_210, fallbackChange: 0.7 },
];

const periodDays: Record<MarketPeriod, number> = { "1D": 1, "1W": 7, "1M": 30, "3M": 90 };
const FALLBACK_AT = "2025-07-01T00:00:00Z";
const CACHE_MS = 5 * 60_000;
let listCache: { value: MarketAssetList; savedAt: number } | null = null;
const detailCache = new Map<string, { value: unknown; savedAt: number }>();

async function fetchJson<T>(url: string, timeoutMs = 7_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json", "User-Agent": "CryptoEducation/0.1" } });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

type JsonFetcher = <T>(url: string, timeoutMs?: number) => Promise<T>;

function fallbackSparkline(price: number, seed: number) {
  const shape = [0.97, 0.985, 0.978, 1.004, 0.994, 1.012, 1.006, 1.023, 1.016, 1.031, 1.018, 1.04];
  return shape.map((factor, index) => Math.round(price * (factor + Math.sin(index + seed) * 0.006) * 100) / 100);
}

function fallbackList(): MarketAssetList {
  return {
    assets: assets.map((item, index) => ({
      symbol: item.symbol,
      name: item.name,
      priceRub: item.fallbackPriceRub,
      change24hPercent: item.fallbackChange,
      sourceTimestamp: FALLBACK_AT,
      isStale: true,
      sparklineRub: fallbackSparkline(item.fallbackPriceRub, index),
      accent: item.accent,
    })),
    isStale: true,
    source: "Последний локальный снимок",
    sourceUrl: "https://docs.coingecko.com/reference/coins-markets",
    updatedAt: FALLBACK_AT,
    notice: "Свежие котировки временно недоступны. Показан старый снимок — не используйте его как текущую цену.",
  };
}

function staleCopy(value: MarketAssetList): MarketAssetList {
  return {
    ...value,
    isStale: true,
    assets: value.assets.map((item) => ({ ...item, isStale: true })),
    notice: "Источник временно недоступен. Показаны последние успешно полученные данные.",
  };
}

async function loadCoinGeckoMarket(request: JsonFetcher): Promise<MarketAssetList> {
  type CoinGeckoMarket = {
    id: string;
    current_price: number;
    price_change_percentage_24h: number | null;
    last_updated: string;
    sparkline_in_7d?: { price?: number[] };
  };
  const ids = assets.map((item) => item.coinGeckoId).join(",");
  const rows = await request<CoinGeckoMarket[]>(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=rub&ids=${ids}&sparkline=true&price_change_percentage=24h`);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const liveAssets = assets.map((item) => {
    const row = byId.get(item.coinGeckoId);
    if (!row || !Number.isFinite(row.current_price)) throw new Error(`Missing ${item.symbol}`);
    const rawSparkline = row.sparkline_in_7d?.price?.filter(Number.isFinite) ?? [];
    const lastSparklinePrice = rawSparkline.at(-1);
    const sparklineScale = lastSparklinePrice && lastSparklinePrice > 0 ? row.current_price / lastSparklinePrice : 1;
    const step = Math.max(1, Math.floor(rawSparkline.length / 24));
    return {
      symbol: item.symbol,
      name: item.name,
      priceRub: row.current_price,
      change24hPercent: row.price_change_percentage_24h ?? 0,
      sourceTimestamp: row.last_updated,
      isStale: false,
      sparklineRub: rawSparkline.filter((_value, index) => index % step === 0).slice(-24).map((price) => price * sparklineScale),
      accent: item.accent,
    };
  });
  const updatedAt = liveAssets.map((item) => item.sourceTimestamp).sort().at(-1) ?? new Date().toISOString();
  return { assets: liveAssets, isStale: false, source: "CoinGecko", sourceUrl: "https://docs.coingecko.com/reference/coins-markets", updatedAt };
}

async function loadExchangeMarket(request: JsonFetcher, provider: "Binance" | "OKX"): Promise<MarketAssetList> {
  type RubRate = { Valute?: { USD?: { Value?: number } } };
  const rubRate = await request<RubRate>("https://www.cbr-xml-daily.ru/daily_json.js", 3_000);
  const usdRub = rubRate.Valute?.USD?.Value;
  if (!Number.isFinite(usdRub) || !usdRub || usdRub <= 0) throw new Error("USD/RUB is unavailable");
  const rows = await Promise.all(assets.map(async (asset) => {
    if (provider === "Binance") {
      const quote = await request<{ lastPrice?: string; priceChangePercent?: string }>(`https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${asset.binanceSymbol}`, 3_000);
      return { asset, priceUsd: Number(quote.lastPrice), change24hPercent: Number(quote.priceChangePercent), updatedAt: new Date().toISOString() };
    }
    const quote = await request<{ data?: Array<{ last?: string; sodUtc8?: string; ts?: string }> }>(`https://www.okx.com/api/v5/market/ticker?instId=${asset.okxSymbol}`, 3_000);
    const item = quote.data?.[0];
    const priceUsd = Number(item?.last);
    const dayStart = Number(item?.sodUtc8);
    const change24hPercent = Number.isFinite(dayStart) && dayStart > 0 ? ((priceUsd / dayStart) - 1) * 100 : 0;
    return { asset, priceUsd, change24hPercent, updatedAt: item?.ts ? new Date(Number(item.ts)).toISOString() : new Date().toISOString() };
  }));
  if (rows.some((row) => !Number.isFinite(row.priceUsd) || row.priceUsd <= 0)) throw new Error(`${provider} quote unavailable`);
  const liveAssets = rows.map(({ asset, priceUsd, change24hPercent, updatedAt }) => ({
    symbol: asset.symbol,
    name: asset.name,
    priceRub: Math.round(priceUsd * usdRub * 100) / 100,
    change24hPercent: Number.isFinite(change24hPercent) ? change24hPercent : 0,
    sourceTimestamp: updatedAt,
    isStale: false,
    sparklineRub: fallbackSparkline(priceUsd * usdRub, asset.symbol.length),
    accent: asset.accent,
  }));
  const updatedAt = liveAssets.map((item) => item.sourceTimestamp).sort().at(-1) ?? new Date().toISOString();
  return {
    assets: liveAssets,
    isStale: false,
    source: `${provider} + USD/RUB`,
    sourceUrl: provider === "Binance" ? "https://www.binance.com/en/price" : "https://www.okx.com/prices",
    updatedAt,
    notice: `Котировки получены с ${provider}; пары USDT пересчитаны в рубли по USD/RUB. Это ориентир, а не курс покупки.`,
  };
}

export async function getMarketAssetsFromProviders(request: JsonFetcher = fetchJson): Promise<MarketAssetList> {
  try {
    return await loadCoinGeckoMarket(request);
  } catch {
    try {
      return await loadExchangeMarket(request, "Binance");
    } catch {
      return await loadExchangeMarket(request, "OKX");
    }
  }
}

export async function getMarketAssets(): Promise<MarketAssetList> {
  if (listCache && Date.now() - listCache.savedAt < CACHE_MS) return listCache.value;
  try {
    const value = await getMarketAssetsFromProviders();
    listCache = { value, savedAt: Date.now() };
    return value;
  } catch {
    return listCache ? staleCopy(listCache.value) : fallbackList();
  }
}

function sampleSeries(points: PricePoint[], limit = 80) {
  if (points.length <= limit) return points;
  const step = Math.ceil(points.length / limit);
  const sampled = points.filter((_point, index) => index % step === 0);
  const last = points.at(-1);
  if (last && sampled.at(-1)?.at !== last.at) sampled.push(last);
  return sampled;
}

function fallbackSeries(config: AssetConfig, period: MarketPeriod): PricePoint[] {
  const count = period === "1D" ? 24 : period === "1W" ? 28 : period === "1M" ? 30 : 45;
  const duration = periodDays[period] * 86_400_000;
  const end = Date.parse(FALLBACK_AT);
  return Array.from({ length: count }, (_item, index) => {
    const progress = index / Math.max(1, count - 1);
    const factor = 0.94 + progress * 0.06 + Math.sin(index * 0.9 + config.symbol.length) * 0.018;
    return { at: new Date(end - duration + duration * progress).toISOString(), priceRub: Math.round(config.fallbackPriceRub * factor * 100) / 100 };
  });
}

async function comparisonSources(config: AssetConfig, primaryPriceRub: number, primaryAt: string) {
  const sources: Array<{ name: string; priceRub: number; updatedAt: string; note: string }> = [{
    name: "CoinGecko",
    priceRub: primaryPriceRub,
    updatedAt: primaryAt,
    note: "Прямая рыночная оценка CoinGecko в рублях",
  }];
  try {
    const [coinGeckoUsd, binance, okx] = await Promise.allSettled([
      fetchJson<Record<string, { usd?: number }>>(`https://api.coingecko.com/api/v3/simple/price?ids=${config.coinGeckoId}&vs_currencies=usd`, 2_500),
      fetchJson<{ price: string }>(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${config.binanceSymbol}`, 2_500),
      fetchJson<{ data?: Array<{ last?: string; ts?: string }> }>(`https://www.okx.com/api/v5/market/ticker?instId=${config.okxSymbol}`, 2_500),
    ]);
    const primaryPriceUsd = coinGeckoUsd.status === "fulfilled" ? coinGeckoUsd.value[config.coinGeckoId]?.usd : undefined;
    if (!primaryPriceUsd || !Number.isFinite(primaryPriceUsd) || primaryPriceUsd <= 0) return sources;
    const marketRubPerUsd = primaryPriceRub / primaryPriceUsd;
    if (binance.status === "fulfilled" && Number.isFinite(Number(binance.value.price))) {
      sources.push({ name: "Binance", priceRub: Number(binance.value.price) * marketRubPerUsd, updatedAt: new Date().toISOString(), note: "Пара с USDT, пересчитана по рыночному кросс-курсу CoinGecko RUB/USD" });
    }
    const okxRow = okx.status === "fulfilled" ? okx.value.data?.[0] : undefined;
    if (okxRow && Number.isFinite(Number(okxRow.last))) {
      sources.push({ name: "OKX", priceRub: Number(okxRow.last) * marketRubPerUsd, updatedAt: okxRow.ts ? new Date(Number(okxRow.ts)).toISOString() : new Date().toISOString(), note: "Пара с USDT, пересчитана по рыночному кросс-курсу CoinGecko RUB/USD" });
    }
  } catch {
    // The primary quote is enough; comparison is an optional enhancement.
  }
  return sources;
}

export async function getMarketAssetDetail(symbol: string, requestedPeriod: string) {
  const config = assets.find((item) => item.symbol === symbol.toUpperCase());
  if (!config) return null;
  const period: MarketPeriod = ["1D", "1W", "1M", "3M"].includes(requestedPeriod) ? requestedPeriod as MarketPeriod : "1W";
  const cacheKey = `${config.symbol}:${period}`;
  const cached = detailCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < CACHE_MS) return cached.value;

  const list = await getMarketAssets();
  const current = list.assets.find((item) => item.symbol === config.symbol)!;
  const sourcesPromise = comparisonSources(config, current.priceRub, current.sourceTimestamp);
  let series: PricePoint[];
  let chartIsStale = current.isStale;
  try {
    type MarketChart = { prices?: Array<[number, number]> };
    const chart = await fetchJson<MarketChart>(`https://api.coingecko.com/api/v3/coins/${config.coinGeckoId}/market_chart?vs_currency=rub&days=${periodDays[period]}`);
    series = sampleSeries((chart.prices ?? []).filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1])).map(([at, priceRub]) => ({ at: new Date(at).toISOString(), priceRub })));
    if (series.length < 2) throw new Error("Chart unavailable");
    const lastChartAt = Date.parse(series.at(-1)!.at);
    const currentQuoteAt = Date.parse(current.sourceTimestamp);
    if (Number.isFinite(lastChartAt) && Number.isFinite(currentQuoteAt) && currentQuoteAt - lastChartAt > 48 * 60 * 60_000) chartIsStale = true;
  } catch {
    series = period === "1W" && current.sparklineRub.length > 1
      ? current.sparklineRub.map((priceRub, index) => ({ at: new Date(Date.parse(current.sourceTimestamp) - (current.sparklineRub.length - 1 - index) * 6 * 60 * 60_000).toISOString(), priceRub }))
      : fallbackSeries(config, period);
    chartIsStale = true;
  }
  const prices = series.map((point) => point.priceRub);
  const value = {
    ...current,
    description: config.description,
    period,
    series,
    highPeriodRub: Math.max(...prices),
    lowPeriodRub: Math.min(...prices),
    chartIsStale,
    sources: await sourcesPromise,
    source: list.source,
    sourceUrl: list.sourceUrl,
    updatedAt: list.updatedAt,
    educationalNote: "Основная цена — прямая оценка CoinGecko в рублях. Доступные пары с USDT на Binance и OKX пересчитаны по рыночному кросс-курсу CoinGecko RUB/USD, а не по официальному курсу Банка России. Небольшая разница остаётся из-за разных площадок, USDT и времени обновления. Это не сигнал к сделке.",
  };
  detailCache.set(cacheKey, { value, savedAt: Date.now() });
  return value;
}
