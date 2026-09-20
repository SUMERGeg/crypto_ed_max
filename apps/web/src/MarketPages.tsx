import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BookOpenCheck,
  ChevronRight,
  Clock3,
  ExternalLink,
  Info,
  Newspaper,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { api } from "./api";
import { robotAssets } from "./robot";
import type { MarketAsset, MarketAssetDetail, MarketAssetList, MarketNewsArticle, MarketNewsSummary, MarketPeriod } from "./types";

const rubles = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const marketDate = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });
const marketTime = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function useMarketRemote<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setData(null);
    loader(controller.signal).then(setData).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(true);
    });
    return () => controller.abort();
  }, [loader, version]);

  return { data, error, retry: () => setVersion((current) => current + 1) };
}

export function MarketPage() {
  const [tab, setTab] = useState<"quotes" | "news">("quotes");
  const loader = useCallback(async (signal: AbortSignal) => {
    const [market, news] = await Promise.all([api.marketAssets(signal), api.marketNews(signal)]);
    return { market, news };
  }, []);
  const { data, error, retry } = useMarketRemote(loader);

  return (
    <div className="market-page">
      <section className="market-hero">
        <div>
          <span>Наблюдаем и разбираемся</span>
          <h1>Крипторынок</h1>
          <p>Цены, графики и новости — простыми словами и без торговли.</p>
        </div>
        <img src={robotAssets.thinking} alt="Крипто-помощник изучает рынок" />
      </section>

      <div className="market-tabs" role="tablist" aria-label="Разделы рынка">
        <button className={tab === "quotes" ? "active" : ""} onClick={() => setTab("quotes")} role="tab" aria-selected={tab === "quotes"}>
          <BarChart3 size={15} /> Котировки
        </button>
        <button className={tab === "news" ? "active" : ""} onClick={() => setTab("news")} role="tab" aria-selected={tab === "news"}>
          <Newspaper size={15} /> Новости
        </button>
      </div>

      {error ? <MarketError retry={retry} /> : !data ? <MarketSkeleton /> : tab === "quotes"
        ? <QuotesPanel market={data.market} />
        : <NewsPanel news={data.news} />}

      <p className="market-disclaimer">Материалы раздела предназначены для обучения и не являются инвестиционной рекомендацией.</p>
    </div>
  );
}

function QuotesPanel({ market }: { market: MarketAssetList }) {
  return (
    <section className="quotes-panel" aria-label="Котировки криптовалют">
      <div className="market-section-heading">
        <div><span>Сейчас на рынке</span><h2>5 основных активов</h2></div>
        <small className={market.isStale ? "stale" : ""}><Clock3 size={12} /> {formatTimestamp(market.updatedAt)}</small>
      </div>

      {market.notice && <div className="market-notice"><AlertTriangle size={16} /><span>{market.notice}</span></div>}

      <div className="quote-list">
        {market.assets.map((asset) => <QuoteRow key={asset.symbol} asset={asset} />)}
      </div>

      <a className="market-source" href={market.sourceUrl} target="_blank" rel="noreferrer">
        Источник: {market.source} <ExternalLink size={12} />
      </a>
      <aside className="market-helper">
        <img src={robotAssets.reading} alt="Помощник читает данные" />
        <div><strong>Смотри шире одной цифры</strong><p>Цена показывает только текущий момент. Открой актив и сравни период, максимум и минимум.</p></div>
      </aside>
    </section>
  );
}

function QuoteRow({ asset }: { asset: MarketAsset }) {
  const rising = asset.change24hPercent >= 0;
  return (
    <NavLink className="quote-row" to={`/market/${asset.symbol}`}>
      <span className="quote-coin" style={{ background: asset.accent }}>{asset.symbol.slice(0, 1)}</span>
      <span className="quote-name"><strong>{asset.name}</strong><small>{asset.symbol}</small></span>
      <MiniChart values={asset.sparklineRub} rising={rising} />
      <span className="quote-price">
        <strong>{rubles.format(asset.priceRub)} ₽</strong>
        <small className={rising ? "positive" : "negative"}>{signedPercent(asset.change24hPercent)}</small>
      </span>
      <ChevronRight className="quote-chevron" size={15} />
    </NavLink>
  );
}

function MiniChart({ values, rising }: { values: number[]; rising: boolean }) {
  const points = linePoints(values, 74, 30, 2);
  return (
    <svg className="mini-market-chart" viewBox="0 0 74 30" role="img" aria-label={rising ? "Цена за неделю росла" : "Цена за неделю снижалась"}>
      <polyline points={points} fill="none" stroke={rising ? "#20af72" : "#e25761"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NewsPanel({ news }: { news: MarketNewsSummary[] }) {
  return (
    <section className="news-panel">
      <div className="market-section-heading"><div><span>Проверенные источники</span><h2>Что важно знать</h2></div><strong>{news.length}</strong></div>
      <div className="market-news-list">
        {news.map((item) => (
          <NavLink className="market-news-card" to={`/market/news/${item.id}`} key={item.id}>
            <div className={`news-category news-category--${item.category.toLowerCase()}`}>{categoryIcon(item.category)} {categoryLabel(item.category)}</div>
            <time>{formatDate(item.publishedAt)}</time>
            <h3>{item.title}</h3>
            <p>{item.preview}</p>
            <div className="affected-assets">{item.affectedAssets.slice(0, 4).map((asset) => <i key={asset}>{asset}</i>)}</div>
            <span className="news-read">Разобрать новость <ChevronRight size={14} /></span>
          </NavLink>
        ))}
      </div>
    </section>
  );
}

export function MarketAssetPage() {
  const { symbol = "BTC" } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<MarketPeriod>("1W");
  const loader = useCallback((signal: AbortSignal) => api.marketAsset(symbol, period, signal), [symbol, period]);
  const { data, error, retry } = useMarketRemote(loader);

  return (
    <div className="market-detail-page">
      <MarketTopBar onBack={() => navigate("/market")} title="Котировка актива" />
      {error ? <MarketError retry={retry} /> : !data ? <MarketSkeleton rows={2} /> : (
        <AssetDetailContent asset={data} period={period} setPeriod={setPeriod} />
      )}
    </div>
  );
}

function AssetDetailContent({ asset, period, setPeriod }: { asset: MarketAssetDetail; period: MarketPeriod; setPeriod: (period: MarketPeriod) => void }) {
  const rising = asset.change24hPercent >= 0;
  return (
    <>
      <header className="asset-heading">
        <span className="quote-coin quote-coin--large" style={{ background: asset.accent }}>{asset.symbol.slice(0, 1)}</span>
        <div><h1>{asset.name}</h1><span>{asset.symbol} · {asset.source}</span></div>
      </header>
      <div className="asset-current">
        <span>Текущая цена</span>
        <strong>{rubles.format(asset.priceRub)} ₽</strong>
        <b className={rising ? "positive" : "negative"}>{signedPercent(asset.change24hPercent)} за 24 часа</b>
        <small>Обновлено {formatTimestamp(asset.updatedAt)}</small>
      </div>
      <p className="asset-description">{asset.description}</p>

      <section className="market-chart-card">
        <div className="period-tabs" aria-label="Период графика">
          {(["1D", "1W", "1M", "3M"] as MarketPeriod[]).map((item) => (
            <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{periodLabel(item)}</button>
          ))}
        </div>
        <MainChart series={asset.series} rising={(asset.series.at(-1)?.priceRub ?? asset.priceRub) >= (asset.series[0]?.priceRub ?? asset.priceRub)} />
        {asset.chartIsStale && <div className="chart-stale"><AlertTriangle size={13} /> График построен по сохранённым данным до {formatDate(asset.series.at(-1)?.at ?? asset.updatedAt)}.</div>}
        <div className="chart-extremes">
          <div><span>Минимум за период</span><strong>{rubles.format(asset.lowPeriodRub)} ₽</strong></div>
          <div><span>Максимум за период</span><strong>{rubles.format(asset.highPeriodRub)} ₽</strong></div>
        </div>
      </section>

      <section className="source-comparison">
        <div className="market-section-heading"><div><span>Почему цифры отличаются</span><h2>Сравнение источников</h2></div></div>
        {asset.sources.map((source) => (
          <article key={source.name}>
            <div><strong>{source.name}</strong><small>{source.note}</small></div>
            <span>{rubles.format(source.priceRub)} ₽</span>
          </article>
        ))}
        <div className="explain-note"><Info size={15} /><p>{asset.educationalNote}</p></div>
      </section>

      <a className="market-source" href={asset.sourceUrl} target="_blank" rel="noreferrer">Методика основного источника <ExternalLink size={12} /></a>
      <p className="market-disclaimer">Цена может измениться в любой момент. Экран помогает учиться читать рынок, а не подсказывает, что покупать.</p>
    </>
  );
}

function MainChart({ series, rising }: { series: Array<{ at: string; priceRub: number }>; rising: boolean }) {
  const width = 320;
  const height = 150;
  const points = linePoints(series.map((point) => point.priceRub), width, height, 10);
  const color = rising ? "#1fb477" : "#e15d67";
  const area = points ? `10,${height - 8} ${points} ${width - 10},${height - 8}` : "";
  const first = series[0];
  const last = series.at(-1);
  return (
    <>
      <svg className="main-market-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="График цены за выбранный период">
        <defs><linearGradient id="market-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".25"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
        <line x1="10" y1="45" x2="310" y2="45"/><line x1="10" y1="82" x2="310" y2="82"/><line x1="10" y1="119" x2="310" y2="119"/>
        <polygon points={area} fill="url(#market-area)" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="market-chart-axis"><span>{first ? shortDate(first.at) : ""}</span><span>{last ? shortDate(last.at) : ""}</span></div>
    </>
  );
}

export function MarketNewsPage() {
  const { newsId = "" } = useParams();
  const navigate = useNavigate();
  const loader = useCallback((signal: AbortSignal) => api.marketNewsArticle(newsId, signal), [newsId]);
  const { data, error, retry } = useMarketRemote(loader);

  return (
    <div className="market-detail-page news-detail-page">
      <MarketTopBar onBack={() => navigate("/market")} title="Разбор новости" />
      {error ? <MarketError retry={retry} /> : !data ? <MarketSkeleton rows={3} /> : <NewsArticle article={data} />}
    </div>
  );
}

function NewsArticle({ article }: { article: MarketNewsArticle }) {
  return (
    <article className="news-article">
      <div className="news-article__meta">
        <span className={`news-category news-category--${article.category.toLowerCase()}`}>{categoryIcon(article.category)} {categoryLabel(article.category)}</span>
        <time>{formatDate(article.publishedAt)}</time>
      </div>
      <h1>{article.title}</h1>
      <p className="news-article__lead">{article.preview}</p>
      <div className="affected-assets affected-assets--large">{article.affectedAssets.map((asset) => <i key={asset}>{asset}</i>)}</div>

      <ArticleSection number="01" title="Что произошло" text={article.whatHappened} />
      <ArticleSection number="02" title="Почему это важно" text={article.whyImportant} />
      <ArticleSection number="03" title="Как это понимать" text={article.analysis} />
      <section className="news-takeaway"><BookOpenCheck size={21}/><div><span>Главная мысль</span><p>{article.takeaway}</p></div></section>

      <a className="article-source" href={article.sourceUrl} target="_blank" rel="noreferrer">
        <div><span>Первоисточник</span><strong>{article.sourceName}</strong></div><ArrowUpRight size={18}/>
      </a>
      <div className="article-disclaimer"><ShieldAlert size={15}/><p>{article.disclaimer}</p></div>
    </article>
  );
}

function ArticleSection({ number, title, text }: { number: string; title: string; text: string }) {
  return <section className="article-section"><i>{number}</i><div><h2>{title}</h2><p>{text}</p></div></section>;
}

function MarketTopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return <header className="market-topbar"><button onClick={onBack} aria-label="Назад"><ArrowLeft size={19}/></button><strong>{title}</strong><span><Sparkles size={16}/></span></header>;
}

function MarketError({ retry }: { retry: () => void }) {
  return <div className="market-error"><AlertTriangle size={24}/><strong>Не удалось загрузить данные</strong><p>Проверь соединение и попробуй ещё раз.</p><button onClick={retry}><RefreshCw size={14}/> Повторить</button></div>;
}

function MarketSkeleton({ rows = 5 }: { rows?: number }) {
  return <div className="market-skeleton">{Array.from({ length: rows }, (_, index) => <i key={index}/>)}</div>;
}

function linePoints(values: number[], width: number, height: number, padding: number) {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  return values.map((value, index) => {
    const x = padding + index / (values.length - 1) * (width - padding * 2);
    const y = padding + (max - value) / range * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function signedPercent(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe >= 0 ? "+" : ""}${safe.toFixed(2).replace(".", ",")}%`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "время неизвестно" : marketTime.format(date);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Дата не указана" : marketDate.format(date);
}

function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date);
}

function periodLabel(period: MarketPeriod) {
  return ({ "1D": "1 день", "1W": "1 нед.", "1M": "1 мес.", "3M": "3 мес." } as const)[period];
}

function categoryLabel(category: MarketNewsSummary["category"]) {
  return ({ MARKET: "Рынок", LAW: "Правила", SECURITY: "Безопасность", TECHNOLOGY: "Технологии" } as const)[category];
}

function categoryIcon(category: MarketNewsSummary["category"]) {
  if (category === "LAW") return <Scale size={12}/>;
  if (category === "SECURITY") return <ShieldAlert size={12}/>;
  if (category === "TECHNOLOGY") return <Sparkles size={12}/>;
  return <BarChart3 size={12}/>;
}
