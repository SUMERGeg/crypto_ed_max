import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Cpu,
  ExternalLink,
  FastForward,
  Globe2,
  Landmark,
  ListFilter,
  Pause,
  Play,
  RefreshCcw,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "./api";
import { robotAssets } from "./robot";
import { RouteNextStep } from "./RouteNextStep";
import { backDestination } from "./navigation";
import { scenarioArtFor } from "./scenario-art";
import type { ScenarioSummary, SimulationEvent, SimulationResult, SimulationState } from "./types";

const rubles = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const decimals = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 6 });
const replayDate = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("ru-RU", { month: "short", year: "numeric", timeZone: "UTC" });

const eventCategoryLabel: Record<SimulationEvent["category"], string> = {
  MARKET: "Рынок",
  WORLD: "Мировое событие",
  REGULATION: "Регулирование",
  TECHNOLOGY: "Технологии",
  SECURITY: "Безопасность",
  COMPANY: "Крупные компании",
};

function EventCategoryIcon({ category, size = 17 }: { category: SimulationEvent["category"]; size?: number }) {
  if (category === "WORLD") return <Globe2 size={size} />;
  if (category === "REGULATION") return <Landmark size={size} />;
  if (category === "TECHNOLOGY") return <Cpu size={size} />;
  if (category === "SECURITY") return <ShieldAlert size={size} />;
  if (category === "COMPANY") return <Building2 size={size} />;
  return <BarChart3 size={size} />;
}

function tradeWord(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "сделок";
  if (last === 1) return "сделка";
  if (last >= 2 && last <= 4) return "сделки";
  return "сделок";
}

function dayWord(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "дней";
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}

function SimulationListSkeleton() {
  return <div className="simulation-skeleton simulation-skeleton--list" role="status" aria-label="Загружаем сценарии">
    {Array.from({ length: 3 }, (_, index) => <article className="simulation-skeleton__scenario" key={index}><i/><span><b/><b/><b/></span></article>)}
  </div>;
}

function ScenarioIntroSkeleton() {
  return <div className="simulation-skeleton" role="status" aria-label="Загружаем описание сценария">
    <section className="simulation-skeleton__hero"><b/><b/><b/></section>
    <div className="simulation-skeleton__facts"><i/><i/></div>
    <section className="simulation-skeleton__panel"><b/><i/><i/><i/></section>
  </div>;
}

function ReplaySkeleton() {
  return <div className="simulation-skeleton simulation-skeleton--replay" role="status" aria-label="Загружаем Market Replay">
    <div className="simulation-skeleton__toolbar"><i/><span><b/><b/></span><i/></div>
    <section className="simulation-skeleton__balance"><span><b/><b/><b/></span><i/></section>
    <section className="simulation-skeleton__chart"><b/><i/></section>
    <section className="simulation-skeleton__panel"><b/><i/><i/><i/></section>
  </div>;
}

function ReplayResultSkeleton() {
  return <div className="simulation-skeleton" role="status" aria-label="Готовим итоговый разбор">
    <section className="simulation-skeleton__result"><i/><b/><b/></section>
    <div className="simulation-skeleton__facts"><i/><i/></div>
    <section className="simulation-skeleton__chart"><b/><i/></section>
    <section className="simulation-skeleton__panel"><b/><i/><i/></section>
  </div>;
}

export function PracticePage() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.scenarios(controller.signal).then(setScenarios).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(true);
    });
    return () => controller.abort();
  }, []);

  return (
    <div className="page page--light practice-page">
      <header className="practice-header">
        <div><span className="eyebrow">Исторический симулятор</span><h1>Практика без риска</h1><p>Принимай решения в прошлом, не зная будущих цен.</p></div>
        <img src={robotAssets.thinking} alt="Крипто-помощник размышляет" />
      </header>

      <div className="practice-rule"><ShieldCheck size={18} /><span><strong>Это учебная среда</strong><small>Только виртуальные деньги. Никаких реальных покупок.</small></span></div>
      <RouteNextStep />

      <div className="scenario-heading"><div><span>Доступные сценарии</span><h2>Выбери исторический период</h2></div><strong>{scenarios?.length ?? 1}</strong></div>
      {error ? <div className="flow-error"><strong>Не удалось загрузить сценарий</strong><span>Проверь локальный API.</span></div> : !scenarios ? (
        <SimulationListSkeleton />
      ) : scenarios.map((scenario) => <ScenarioCard key={scenario.id} scenario={scenario} />)}

      <aside className="robot-tip">
        <img src={robotAssets.teaching} alt="" aria-hidden="true" />
        <div><span>Как это работает</span><p>Исторические дни идут постепенно. Новости открываются только после своей даты, а будущее остаётся скрытым.</p></div>
      </aside>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: ScenarioSummary }) {
  return (
    <NavLink className="scenario-card" to={`/practice/${scenario.id}`}>
      <div className="scenario-card__art">
        <img src={scenarioArtFor(scenario.id)} alt="" aria-hidden="true" />
        <div className="scenario-card__badge"><Zap size={13} /> Демо за {scenario.estimatedMinutes} мин.</div>
      </div>
      <div className="scenario-card__body">
        <span className="section-kicker">Market Replay · версия {scenario.version}</span>
        <h3>{scenario.title}</h3>
        <p>{scenario.description}</p>
        <div className="scenario-meta">
          <span><CalendarDays size={14} /> {shortDate.format(new Date(scenario.startAt))} — {shortDate.format(new Date(scenario.endAt))}</span>
          <span><WalletCards size={14} /> {rubles.format(scenario.startingBalanceRub)} ₽</span>
          <span><BookOpenCheck size={14} /> {scenario.eventCount} событий</span>
          <span><Zap size={14} /> {scenario.difficulty === "BEGINNER" ? "Начальный" : scenario.difficulty === "INTERMEDIATE" ? "Средний" : "Сложный"}</span>
        </div>
        <strong className="scenario-card__action">Открыть сценарий <FastForward size={16} /></strong>
      </div>
    </NavLink>
  );
}

export function ScenarioIntroPage() {
  const { scenarioId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [scenario, setScenario] = useState<ScenarioSummary | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.scenarios().then((items) => setScenario(items.find((item) => item.id === scenarioId) ?? null)).catch(() => setError("Не удалось загрузить сценарий"));
  }, [scenarioId]);

  const start = async () => {
    if (!scenario || starting) return;
    setStarting(true);
    setError("");
    try {
      const state = await api.createSimulation(scenario.id);
      navigate(`/simulation/${state.sessionId}${location.search}`);
    } catch {
      setError("Не удалось начать. Проверь локальный API.");
      setStarting(false);
    }
  };

  if (!scenario) return <div className="page page--flow"><FlowBack /><ScenarioIntroSkeleton/>{error && <p className="form-error">{error}</p>}</div>;

  return (
    <div className="page page--flow scenario-intro">
      <FlowBack />
      <div className="scenario-intro__hero">
        <img src={robotAssets.teaching} alt="Крипто-помощник объясняет правила" />
        <span>Market Replay</span>
        <h1>{scenario.title}</h1>
        <p>{scenario.description}</p>
      </div>
      <div className="intro-facts">
        <div><Clock3 /><span><strong>{scenario.estimatedMinutes} минут</strong><small>исторические дни идут постепенно</small></span></div>
        <div><WalletCards /><span><strong>{rubles.format(scenario.startingBalanceRub)} ₽</strong><small>виртуальный стартовый баланс</small></span></div>
      </div>
      <section className="intro-rules">
        <span className="eyebrow">Три простых правила</span>
        <h2>Что тебя ждёт</h2>
        <div><i>1</i><span><strong>Будущее закрыто</strong><small>Ты увидишь только те цены и новости, которые уже наступили.</small></span></div>
        <div><i>2</i><span><strong>Можно остановить время</strong><small>Поставь период на паузу, чтобы решить без спешки.</small></span></div>
        <div><i>3</i><span><strong>В конце будет разбор</strong><small>Сравним итог с планом «{scenario.benchmark.label.toLowerCase()}».</small></span></div>
      </section>
      <section className="scenario-focus"><span className="eyebrow">Чему учит сценарий</span>{scenario.educationalFocus.map((focus) => <p key={focus}><CheckCircle2 size={14} /> {focus}</p>)}</section>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-cta" onClick={start} disabled={starting}>{starting ? "Запускаем…" : `Начать с ${replayDate.format(new Date(scenario.startAt))}`}<Play size={17} fill="currentColor" /></button>
      <p className="intro-disclaimer">Результаты прошлого не предсказывают будущие цены.</p>
    </div>
  );
}

function FlowBack() {
  const navigate = useNavigate();
  return <button className="flow-back replay-back" onClick={() => navigate(-1)} aria-label="Назад"><ArrowLeft size={19} /></button>;
}

export function ReplayPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<SimulationState | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [tradeMode, setTradeMode] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("10000");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showAllEvents, setShowAllEvents] = useState(false);

  const refresh = useCallback(async () => {
    try { setState(await api.simulationState(sessionId)); } catch { setMessage("Связь с симулятором прервалась"); }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 900);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const act = async (action: () => Promise<SimulationState>, success?: string) => {
    setBusy(true); setMessage("");
    try { setState(await action()); if (success) setMessage(success); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Действие не выполнено"); }
    finally { setBusy(false); }
  };

  const trade = async () => {
    if (!state) return;
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) { setMessage("Введи число больше нуля"); return; }
    if (tradeMode === "BUY") {
      await act(() => api.makeTrade(sessionId, { type: "BUY", symbol: selectedSymbol, amountRub: value }), `Покупка ${selectedSymbol} добавлена`);
    } else {
      await act(() => api.makeTrade(sessionId, { type: "SELL", symbol: selectedSymbol, quantity: value }), `Продажа ${selectedSymbol} добавлена`);
    }
  };

  const complete = async () => {
    setBusy(true); setMessage("");
    try { await api.completeSimulation(sessionId); navigate(`/simulation/${sessionId}/result${location.search}`); }
    catch { setMessage("Пока рано завершать период"); setBusy(false); }
  };

  if (!state) return <div className="page page--flow replay-page"><ReplaySkeleton/><p className="form-error">{message}</p></div>;

  const asset = state.assets.find((item) => item.symbol === selectedSymbol) ?? state.assets[0]!;
  const position = state.positions.find((item) => item.symbol === selectedSymbol);
  const latestEvent = state.events.at(-1);
  const visibleFeed = [...state.events].reverse().slice(0, showAllEvents ? state.events.length : 4);
  const firstPrice = asset.series[0]?.priceRub ?? asset.currentPriceRub;
  const priceChange = ((asset.currentPriceRub / firstPrice) - 1) * 100;

  return (
    <div className="replay-page">
      <header className="replay-top">
        <button onClick={() => navigate(backDestination({ fromRoute: new URLSearchParams(location.search).get("from") === "route", parent: "/practice" }))} aria-label="Выйти"><ArrowLeft size={19} /></button>
        <div><span>Историческое время</span><strong>{replayDate.format(new Date(state.scenarioAt))}</strong></div>
        <button onClick={() => state.status === "ACTIVE" ? void act(() => api.pauseSimulation(sessionId)) : void act(() => api.resumeSimulation(sessionId))} aria-label={state.status === "ACTIVE" ? "Пауза" : "Продолжить"}>
          {state.status === "ACTIVE" ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
      </header>
      <div className="replay-timebar"><i style={{ width: `${state.progressPercent}%` }} /><span>{Math.round(state.progressPercent)}%</span></div>

      <section className="replay-balance">
        <div><span>Весь портфель</span><strong>{rubles.format(state.totalValueRub)} ₽</strong><small>Свободно: {rubles.format(state.cashRub)} ₽</small></div>
        <img src={state.status === "PAUSED" ? robotAssets.thinking : robotAssets.waving} alt={state.status === "PAUSED" ? "Помощник размышляет" : "Помощник наблюдает за рынком"} />
      </section>

      <div className="asset-tabs">
        {state.assets.map((item) => <button key={item.symbol} className={item.symbol === asset.symbol ? "active" : ""} onClick={() => setSelectedSymbol(item.symbol)}><i style={{ background: item.color }}>{item.symbol[0]}</i><span>{item.name}<small>{item.symbol}</small></span></button>)}
      </div>

      <section className="replay-chart-card">
        <div className="chart-heading"><div><span>{asset.name} ({asset.symbol})</span><strong>{rubles.format(asset.currentPriceRub)} ₽</strong></div><b className={priceChange >= 0 ? "positive" : "negative"}>{priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}%</b></div>
        <PriceChart series={asset.series} color={asset.color} events={state.events.filter((event) => event.affectedAssets.includes(asset.symbol))} />
        <div className="chart-axis"><span>{shortDate.format(new Date(state.startAt))}</span><span>Будущее скрыто</span></div>
        <div className="chart-marker-note"><BookOpenCheck size={12} /> Метки показывают только уже открывшиеся события для {asset.symbol}</div>
      </section>

      {latestEvent && <article className="event-card" key={latestEvent.id}>
        <div className={`event-card__icon event-card__icon--${latestEvent.category.toLowerCase()}`}><EventCategoryIcon category={latestEvent.category} size={19} /></div>
        <div><span>Новость открылась · {replayDate.format(new Date(latestEvent.at))}</span><div className="event-card__meta"><b>{eventCategoryLabel[latestEvent.category]}</b>{latestEvent.affectedAssets.map((symbol) => <i key={symbol}>{symbol}</i>)}</div><h3>{latestEvent.title}</h3><p>{latestEvent.summary}</p><aside><strong>Почему это важно</strong>{latestEvent.context}</aside><a href={latestEvent.sourceUrl} target="_blank" rel="noreferrer">Первоисточник: {latestEvent.sourceName} <ExternalLink size={11} /></a></div>
      </article>}

      <section className="event-feed">
        <div className="event-feed__heading"><span><ListFilter size={16} /> Лента открывшихся новостей</span><strong>{state.events.length}</strong></div>
        {visibleFeed.length === 0 ? <p className="event-feed__empty"><Clock3 size={15} /> Пока новостей нет. Будущие события скрыты.</p> : visibleFeed.map((event) => (
          <article key={event.id}>
            <div className={`event-feed__icon event-feed__icon--${event.category.toLowerCase()}`}><EventCategoryIcon category={event.category} size={15} /></div>
            <div><span>{replayDate.format(new Date(event.at))} · {eventCategoryLabel[event.category]}</span><strong>{event.title}</strong><small>{event.summary}</small><div>{event.affectedAssets.map((symbol) => <i key={symbol}>{symbol}</i>)}</div></div>
          </article>
        ))}
        {state.events.length > 4 && <button type="button" onClick={() => setShowAllEvents((value) => !value)}>{showAllEvents ? "Свернуть ленту" : `Показать все (${state.events.length})`}</button>}
        <p className="event-feed__future"><ShieldCheck size={13} /> Следующие новости откроются только в свою историческую дату.</p>
      </section>

      <section className="trade-panel">
        <div className="trade-tabs"><button className={tradeMode === "BUY" ? "active" : ""} onClick={() => { setTradeMode("BUY"); setAmount("10000"); }}>Купить</button><button className={tradeMode === "SELL" ? "active" : ""} onClick={() => { setTradeMode("SELL"); setAmount(position ? String(position.quantity) : "0"); }}>Продать</button></div>
        <div className="trade-context"><span>{tradeMode === "BUY" ? "Сумма покупки" : `Количество ${selectedSymbol}`}</span><small>{tradeMode === "BUY" ? `Доступно ${rubles.format(state.cashRub)} ₽` : `В позиции ${decimals.format(position?.quantity ?? 0)} ${selectedSymbol}`}</small></div>
        <div className="trade-input"><input aria-label={tradeMode === "BUY" ? "Сумма покупки" : "Количество для продажи"} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><span>{tradeMode === "BUY" ? "₽" : selectedSymbol}</span></div>
        {tradeMode === "BUY" ? <div className="trade-presets">{[5000, 10000, 25000].map((value) => <button key={value} onClick={() => setAmount(String(value))}>+{rubles.format(value)}</button>)}<button onClick={() => setAmount(String(Math.floor(state.cashRub)))}>Все</button></div> : (
          <div className="trade-presets"><button onClick={() => setAmount(String((position?.quantity ?? 0) / 4))}>25%</button><button onClick={() => setAmount(String((position?.quantity ?? 0) / 2))}>50%</button><button onClick={() => setAmount(String(position?.quantity ?? 0))}>Всё</button></div>
        )}
        <button className={`trade-submit trade-submit--${tradeMode.toLowerCase()}`} onClick={() => void trade()} disabled={busy || (tradeMode === "SELL" && !position)}>{tradeMode === "BUY" ? "Купить" : "Продать"} {selectedSymbol}</button>
        {message && <p className={message.includes("добавлена") ? "form-success" : "form-error"}>{message}</p>}
      </section>

      <section className="replay-log"><div><span>Сделки</span><strong>{state.trades.length}</strong></div>{state.trades.slice(-3).reverse().map((item) => <p key={item.id}><i className={item.type === "BUY" ? "buy" : "sell"}>{item.type === "BUY" ? "К" : "П"}</i><span>{item.type === "BUY" ? "Куплено" : "Продано"} {item.symbol}<small>{replayDate.format(new Date(item.scenarioAt))}</small></span><strong>{rubles.format(item.amountRub)} ₽</strong></p>)}</section>

      {state.canComplete ? <button className="primary-cta replay-complete" onClick={() => void complete()} disabled={busy}>Завершить и посмотреть разбор <CheckCircle2 size={18} /></button> : <div className="replay-wait"><Clock3 size={15} /><span>{state.status === "PAUSED" ? "Время остановлено — продолжи, когда будешь готов" : "Историческое время идёт автоматически"}</span></div>}
      <p className="intro-disclaimer">Учебный сценарий. Не инвестиционная рекомендация.</p>
    </div>
  );
}

function PriceChart({ series, color, events }: { series: Array<{ at: string; priceRub: number }>; color: string; events: SimulationEvent[] }) {
  const geometry = useMemo(() => {
    if (series.length === 1) return { points: "0,58 300,58", markers: [] as Array<{ event: SimulationEvent; x: number; y: number }> };
    const values = series.map((item) => item.priceRub);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const coordinates = series.map((item, index) => ({ x: (index / (series.length - 1)) * 300, y: 108 - ((item.priceRub - min) / range) * 92 }));
    const markers = events.map((event) => {
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      series.forEach((point, index) => {
        const distance = Math.abs(Date.parse(point.at) - Date.parse(event.at));
        if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index; }
      });
      return { event, ...coordinates[nearestIndex]! };
    });
    return { points: coordinates.map(({ x, y }) => `${x},${y}`).join(" "), markers };
  }, [events, series]);
  const finalPoint = geometry.points.split(" ").at(-1)?.split(",");
  return <svg className="price-chart" viewBox="0 0 300 120" role="img" aria-label="Доступная часть исторического графика с метками открывшихся событий"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".25"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs><path d={`M ${geometry.points.replaceAll(" ", " L ")} L 300 120 L 0 120 Z`} fill="url(#chartFill)"/><polyline points={geometry.points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{geometry.markers.map(({ event, x, y }) => <g className={`chart-event chart-event--${event.category.toLowerCase()}`} key={event.id}><title>{replayDate.format(new Date(event.at))}: {event.title}</title><line x1={x} y1={Math.max(6, y - 15)} x2={x} y2={y} /><circle cx={x} cy={Math.max(6, y - 17)} r="5" /><circle cx={x} cy={y} r="3" /></g>)}<circle cx={finalPoint?.[0]} cy={finalPoint?.[1]} r="4" fill={color} stroke="white" strokeWidth="2"/></svg>;
}

export function ReplayResultPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const fromRoute = new URLSearchParams(useLocation().search).get("from") === "route";
  const [state, setState] = useState<SimulationState | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);

  useEffect(() => {
    api.simulationState(sessionId).then((item) => { setState(item); setResult(item.result); }).catch(() => undefined);
  }, [sessionId]);

  if (!state || !result) return <div className="page page--flow"><ReplayResultSkeleton/></div>;
  const positive = result.returnPercent >= 0;

  return (
    <div className="page page--flow replay-result">
      <div className="result-orbit replay-result__robot"><img src={robotAssets.celebrating} alt="Помощник празднует завершение сценария" /><span><CheckCircle2 size={27} /></span></div>
      <header><span className="result-eyebrow">Сценарий завершён</span><h1>Вот что получилось</h1><p>Это разбор твоих решений, а не оценка «правильно» или «неправильно».</p></header>
      <section className="result-total"><span>Итоговая стоимость</span><strong>{rubles.format(result.finalValueRub)} ₽</strong><b className={positive ? "positive" : "negative"}>{positive ? "+" : ""}{result.returnPercent.toFixed(2)}%</b></section>
      <div className="benchmark-grid">
        <div><span>Твой результат</span><strong>{result.returnPercent >= 0 ? "+" : ""}{result.returnPercent.toFixed(2)}%</strong><small>{result.tradeCount} {tradeWord(result.tradeCount)}</small></div>
        <div><span>{result.benchmarkLabel ?? state.benchmark.label}</span><strong>{result.benchmarkReturnPercent >= 0 ? "+" : ""}{result.benchmarkReturnPercent.toFixed(2)}%</strong><small>заранее заданный ориентир</small></div>
      </div>
      <div className={`benchmark-delta ${result.deltaPercent >= 0 ? "benchmark-delta--up" : ""}`}>{result.deltaPercent >= 0 ? <TrendingUp /> : <TrendingDown />}<span><strong>Разница: {result.deltaPercent >= 0 ? "+" : ""}{result.deltaPercent.toFixed(2)} п.п.</strong><small>Сравнение помогает увидеть цену решений, но не предсказывает будущее.</small></span></div>
      <PortfolioResultChart series={result.portfolioSeries} startingBalanceRub={state.startingBalanceRub} />
      <ResultComparison result={result} />
      <section className="analysis-list"><span className="eyebrow">Персональный разбор</span><h2>Что можно заметить</h2>{result.analysis.map((note, index) => <article key={note.kind}><i>{index + 1}</i><div><strong>{note.title}</strong><p>{note.text}</p></div></article>)}</section>
      <DecisionHistory decisions={result.decisions} />
      <aside className="result-learning"><Sparkles size={20} /><div><strong>Главная мысль</strong><p>Рост рынка сам по себе не делает каждую сделку удачной. Важно заранее понимать риск и не принимать прошлый результат за обещание.</p></div></aside>
      {fromRoute && <button className="primary-cta" onClick={() => navigate("/route")}><CheckCircle2 size={17}/> Остановка пройдена · к маршруту</button>}
      {!fromRoute && <NavLink className="primary-cta" to="/learn"><BookOpenCheck size={17}/> Продолжить обучение</NavLink>}
      <button className="primary-cta" onClick={() => navigate("/practice")}><RefreshCcw size={17} /> Пройти ещё раз</button>
      <NavLink className="result-home-link" to="/">Вернуться на главную</NavLink>
      <p className="intro-disclaimer">Учебный материал. Не инвестиционная рекомендация.</p>
    </div>
  );
}

function PortfolioResultChart({ series, startingBalanceRub }: { series: SimulationResult["portfolioSeries"]; startingBalanceRub: number }) {
  const chart = useMemo(() => {
    const width = 300;
    const height = 126;
    const padding = 10;
    const values = series.map((point) => point.totalValueRub);
    const min = Math.min(startingBalanceRub, ...values);
    const max = Math.max(startingBalanceRub, ...values);
    const range = Math.max(1, max - min);
    const points = series.map((point, index) => {
      const x = padding + index / Math.max(1, series.length - 1) * (width - padding * 2);
      const y = height - padding - (point.totalValueRub - min) / range * (height - padding * 2);
      return `${x},${y}`;
    }).join(" ");
    const baselineY = height - padding - (startingBalanceRub - min) / range * (height - padding * 2);
    return { points, baselineY, min, max, width, height, padding };
  }, [series, startingBalanceRub]);
  const rising = (series.at(-1)?.totalValueRub ?? startingBalanceRub) >= startingBalanceRub;
  const color = rising ? "#25b77a" : "#df5b64";
  const area = chart.points ? `${chart.padding},${chart.height - chart.padding} ${chart.points} ${chart.width - chart.padding},${chart.height - chart.padding}` : "";
  return (
    <section className="portfolio-result-card">
      <div className="result-section-heading"><div><span>Весь исторический период</span><h2>Стоимость портфеля</h2></div><BarChart3 size={18}/></div>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="График стоимости виртуального портфеля">
        <defs><linearGradient id="portfolio-result-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
        <line className="portfolio-baseline" x1={chart.padding} y1={chart.baselineY} x2={chart.width - chart.padding} y2={chart.baselineY}/>
        <polygon points={area} fill="url(#portfolio-result-area)"/>
        <polyline points={chart.points} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div className="portfolio-chart-meta"><span><small>Минимум</small><strong>{rubles.format(chart.min)} ₽</strong></span><span><small>Старт</small><strong>{rubles.format(startingBalanceRub)} ₽</strong></span><span><small>Максимум</small><strong>{rubles.format(chart.max)} ₽</strong></span></div>
      <p>Линия учитывает свободные деньги и стоимость всех активов на каждую историческую дату.</p>
    </section>
  );
}

function ResultComparison({ result }: { result: SimulationResult }) {
  const comparison = result.comparison;
  return (
    <section className="result-comparison">
      <div className="result-section-heading"><div><span>Прохождение {comparison.attemptNumber}</span><h2>Сравнение попыток</h2></div><RefreshCcw size={18}/></div>
      {comparison.previousAttempts === 0 ? (
        <div className="comparison-first"><Sparkles size={17}/><div><strong>Это первое прохождение сценария</strong><p>После следующей попытки здесь появится сравнение результатов.</p></div></div>
      ) : (
        <>
          <div className="comparison-grid">
            <div><span>Сейчас</span><strong>{result.returnPercent >= 0 ? "+" : ""}{result.returnPercent.toFixed(2)}%</strong></div>
            <div><span>Прошлый раз</span><strong>{comparison.previousReturnPercent !== null && comparison.previousReturnPercent >= 0 ? "+" : ""}{comparison.previousReturnPercent?.toFixed(2)}%</strong></div>
            <div><span>Лучший раньше</span><strong>{comparison.bestPreviousReturnPercent !== null && comparison.bestPreviousReturnPercent >= 0 ? "+" : ""}{comparison.bestPreviousReturnPercent?.toFixed(2)}%</strong></div>
          </div>
          <p className={comparison.deltaVsPreviousPercent !== null && comparison.deltaVsPreviousPercent >= 0 ? "positive" : "negative"}>К прошлому прохождению: {comparison.deltaVsPreviousPercent !== null && comparison.deltaVsPreviousPercent >= 0 ? "+" : ""}{comparison.deltaVsPreviousPercent?.toFixed(2)} п.п. · Среднее раньше: {comparison.averagePreviousReturnPercent?.toFixed(2)}%</p>
        </>
      )}
    </section>
  );
}

const decisionSignalLabels: Record<SimulationResult["decisions"][number]["signals"][number], string> = {
  FOMO: "Возможный FOMO",
  PANIC_SELL: "Возможная паника",
  DROP_REACTION: "Реакция на падение",
  NEWS_REACTION: "Рядом с новостью",
};

function DecisionHistory({ decisions }: { decisions: SimulationResult["decisions"] }) {
  return (
    <section className="decision-history">
      <div className="result-section-heading"><div><span>Без пропусков</span><h2>История решений</h2></div><b>{decisions.length}</b></div>
      {decisions.length === 0 ? <div className="decision-empty"><Clock3 size={18}/><div><strong>Сделок не было</strong><p>Бездействие тоже учтено в персональном разборе.</p></div></div> : decisions.map((decision, index) => (
        <article key={decision.tradeId}>
          <div className={`decision-number decision-number--${decision.type.toLowerCase()}`}>{index + 1}</div>
          <div className="decision-copy">
            <div className="decision-title"><span>{decision.type === "BUY" ? "Покупка" : "Продажа"} {decision.symbol}</span><strong>{rubles.format(decision.amountRub)} ₽</strong></div>
            <small><CalendarDays size={11}/> {replayDate.format(new Date(decision.scenarioAt))} · по {rubles.format(decision.priceRub)} ₽</small>
            <p>{decimals.format(decision.quantity)} {decision.symbol} · портфель после решения: {rubles.format(decision.portfolioValueAfterRub)} ₽</p>
            {decision.triggerEvent && <aside><Zap size={13}/><div><span>Последняя новость перед сделкой</span><strong>{decision.triggerEvent.title}</strong><small>{decision.daysAfterEvent === 0 ? "В тот же исторический день" : `Через ${decision.daysAfterEvent} ${dayWord(decision.daysAfterEvent ?? 0)} после новости`}</small></div></aside>}
            {decision.signals.length > 0 && <div className="decision-signals">{decision.signals.map((signal) => <i className={`decision-signal decision-signal--${signal.toLowerCase()}`} key={signal}>{decisionSignalLabels[signal]}</i>)}</div>}
            <div className="decision-market-context"><span>Цена за 14 дней: <b className={decision.marketMoveBeforePercent >= 0 ? "positive" : "negative"}>{decision.marketMoveBeforePercent >= 0 ? "+" : ""}{decision.marketMoveBeforePercent.toFixed(1)}%</b></span><span>От недавнего пика: <b className={decision.drawdownFromRecentPeakPercent >= 0 ? "positive" : "negative"}>{decision.drawdownFromRecentPeakPercent.toFixed(1)}%</b></span></div>
          </div>
        </article>
      ))}
    </section>
  );
}
