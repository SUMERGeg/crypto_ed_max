import { ArrowLeft, ArrowRight, BookOpen, Check, Compass, RotateCcw, ShieldCheck, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "./api";
import { robotAssets } from "./robot";
import { routeStopPath } from "./navigation";
import type { RecommendedRoute } from "./types";

const chapters: Record<RecommendedRoute["stops"][number]["chapter"], string> = {
  "crypto-basics": "Криптовалюты",
  blockchain: "Blockchain",
  finance: "Финансовые основы",
  "law-russia": "Россия и право",
};

function stopLabel(type: RecommendedRoute["stops"][number]["type"]) {
  return type === "LESSON" ? "Урок" : type === "SECURITY_CASE" ? "Кейс" : "Практика";
}

function StopIcon({ type }: { type: RecommendedRoute["stops"][number]["type"] }) {
  return type === "LESSON" ? <BookOpen size={17}/> : type === "SECURITY_CASE" ? <ShieldCheck size={17}/> : <TrendingUp size={17}/>;
}

export function RecommendedRoutePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<RecommendedRoute | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const currentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api.route(controller.signal).then((route) => { setData(route); setError(false); }).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(true);
    });
    return () => controller.abort();
  }, [revision]);

  function scrollToCurrent(behavior: ScrollBehavior = "smooth") {
    const scroller = document.querySelector<HTMLElement>(".screen-scroll");
    const target = currentRef.current;
    if (!scroller || !target) return;
    const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 120;
    scroller.scrollTo({ top: Math.max(0, top), behavior });
  }

  useEffect(() => {
    if (!data || data.finished || (data.currentIndex ?? 0) < 4) return;
    const frame = requestAnimationFrame(() => scrollToCurrent("instant"));
    return () => cancelAnimationFrame(frame);
  }, [data]);

  useEffect(() => {
    if (!data || data.finished) return;
    const scroller = document.querySelector<HTMLElement>(".screen-scroll");
    if (!scroller) return;
    const update = () => {
      const current = currentRef.current?.getBoundingClientRect();
      const visible = scroller.getBoundingClientRect();
      setShowJump(scroller.scrollTop > 180 && Boolean(current && (current.bottom < visible.top + 40 || current.top > visible.bottom - 45)));
    };
    scroller.addEventListener("scroll", update, { passive: true });
    update();
    return () => scroller.removeEventListener("scroll", update);
  }, [data]);

  const total = data?.stops.length ?? 30;
  const roadHeight = total * 154;
  const points = Array.from({ length: total }, (_, index) => ({ x: index % 2 === 0 ? 23 : 77, y: 77 + index * 154 }));
  const path = points.map((point, index) => index === 0 ? `M ${point.x} ${point.y}` : `C ${points[index - 1]!.x} ${point.y - 77}, ${point.x} ${point.y - 77}, ${point.x} ${point.y}`).join(" ");
  const greenPath = points.slice(0, (data?.continuousCompletedCount ?? 0) + 1).map((point, index) => index === 0 ? `M ${point.x} ${point.y}` : `C ${points[index - 1]!.x} ${point.y - 77}, ${point.x} ${point.y - 77}, ${point.x} ${point.y}`).join(" ");

  return <div className="recommended-route-page">
    <header className="recommended-route-topbar"><button type="button" onClick={() => navigate("/profile")} aria-label="Назад в профиль"><ArrowLeft size={20}/></button><strong>Рекомендованный маршрут</strong><Compass size={21}/></header>
    <section className="recommended-route-intro"><div><span>Твой путь по сервису</span><h1>От первых понятий<br/>до уверенных решений</h1><p>Уроки, кейсы и практика чередуются. Главы открываются по порядку.</p></div><img src={robotAssets.waving} alt="Робот приглашает в маршрут"/></section>
    {error ? <div className="recommended-route-state" role="alert"><strong>Маршрут не загрузился</strong><p>Прогресс сохранён. Попробуй ещё раз.</p><button onClick={() => { setError(false); setRevision((value) => value + 1); }}><RotateCcw size={16}/> Повторить</button></div> : !data ? <div className="recommended-route-skeleton" role="status" aria-label="Загружаем маршрут"><i/><i/><i/><i/></div> : <>
      <div className="recommended-route-summary"><div><strong>{data.completedCount} из {data.total}</strong><span>остановок пройдено</span></div><div className="recommended-route-summary__track"><i style={{ width: `${data.continuousCompletedCount / data.total * 100}%` }}/></div></div>
      {data.completedCount !== data.continuousCompletedCount && <p className="recommended-route-hint">Некоторые остановки уже пройдены вне маршрута. Зелёная дорога дойдёт до них, когда ты закроешь пропуски.</p>}
      <div className="recommended-route-map" style={{ minHeight: roadHeight }}>
        <svg className="recommended-route-road" viewBox={`0 0 100 ${roadHeight}`} preserveAspectRatio="none" aria-hidden="true"><path d={path}/><path className="recommended-route-road__done" d={greenPath}/></svg>
        {data.stops.map((stop, index) => {
          const chapterStart = index === 0 || data.stops[index - 1]?.chapter !== stop.chapter;
          const current = index === data.currentIndex;
          return <section key={stop.id} ref={current ? currentRef : undefined} className={`recommended-route-stop recommended-route-stop--${index % 2 === 0 ? "left" : "right"} ${current ? "recommended-route-stop--current" : ""}`} style={{ top: index * 154 }}>
            {chapterStart && <div className="recommended-route-chapter">Глава {Object.keys(chapters).indexOf(stop.chapter) + 1} · {chapters[stop.chapter]}</div>}
            <button type="button" disabled={!stop.available} onClick={() => navigate(routeStopPath(stop))} aria-label={`Остановка ${stop.number} из ${data.total}, ${stopLabel(stop.type).toLowerCase()}, ${stop.title}, ${stop.completed ? "пройдено" : current ? "текущая" : "сначала предыдущая остановка"}`} className={`recommended-route-card recommended-route-card--${stop.type.toLowerCase()} ${stop.completed ? "recommended-route-card--done" : ""}`}>
              <span className="recommended-route-card__number">{stop.completed ? <Check size={16}/> : stop.number}</span>
              <span className="recommended-route-card__content"><small><StopIcon type={stop.type}/>{stopLabel(stop.type)} · {stop.number}/{data.total}</small><strong>{stop.title}</strong><em>{stop.completed ? "Пройдено" : current ? "Продолжить" : stop.available ? "Впереди" : "Сначала предыдущая остановка"}</em></span>
              {stop.available && <ArrowRight className="recommended-route-card__arrow" size={16}/>}
            </button>
          </section>;
        })}
      </div>
      {data.finished ? <div className="recommended-route-finish"><img src={robotAssets.celebrating} alt="Робот празднует завершение маршрута"/><h2>Весь путь пройден!</h2><p>20 уроков, 5 кейсов и 5 исторических сценариев теперь позади. К ним всегда можно вернуться.</p><Link to="/profile">Посмотреть профиль</Link><Link to="/practice">Повторить практику</Link></div> : showJump && <button className="recommended-route-jump" onClick={() => scrollToCurrent()}>К моему шагу <ArrowRight size={16}/></button>}
    </>}
  </div>;
}
