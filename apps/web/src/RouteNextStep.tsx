import { ArrowRight, BookOpen, ShieldCheck, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "./api";
import { routeStopPath } from "./navigation";
import { robotAssets } from "./robot";
import type { HomeData, RecommendedRoute } from "./types";

type RouteNextStepProps = {
  dashboardLesson?: HomeData["continueLesson"];
};

export function RouteNextStep({ dashboardLesson }: RouteNextStepProps) {
  const [route, setRoute] = useState<RecommendedRoute | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api.route(controller.signal).then(setRoute).catch(() => setRoute(null));
    return () => controller.abort();
  }, []);
  const stop = route?.currentIndex === null ? null : route?.stops[route.currentIndex];
  if (dashboardLesson) {
    const nextStop = stop;
    const Icon = !nextStop || nextStop.type === "LESSON" ? BookOpen : nextStop.type === "SECURITY_CASE" ? ShieldCheck : TrendingUp;
    const nextLabel = nextStop ? (nextStop.type === "LESSON" ? "Урок" : nextStop.type === "SECURITY_CASE" ? "Учебный кейс" : "Market Replay") : "Продолжить обучение";
    const target = nextStop ? routeStopPath(nextStop) : `/lessons/${dashboardLesson.id}`;
    const title = nextStop?.title ?? dashboardLesson.title;
    const number = nextStop ? `${nextStop.number}/${route?.total ?? ""}` : `${dashboardLesson.lessonNumber}/${dashboardLesson.totalCourseLessons}`;

    return <NavLink className="dashboard-route-card" to={target}>
      <div className="dashboard-route-card__current">
        <span className="dashboard-route-card__kicker">Твой учебный маршрут</span>
        <strong>{dashboardLesson.courseTitle}</strong>
        <span className="dashboard-route-card__lesson">Урок {dashboardLesson.lessonNumber} из {dashboardLesson.totalCourseLessons}</span>
        <span className="dashboard-route-card__progress"><i style={{ width: `${dashboardLesson.progressPercent}%` }} /></span>
      </div>
      <span className="dashboard-route-card__spark dashboard-route-card__spark--one" aria-hidden="true">✦</span>
      <span className="dashboard-route-card__spark dashboard-route-card__spark--two" aria-hidden="true">✦</span>
      <span className="dashboard-route-card__spark dashboard-route-card__spark--three" aria-hidden="true">✦</span>
      <img className="dashboard-route-card__robot" src={robotAssets.route} alt="Крипто-помощник показывает маршрут" loading="eager" />
      <span className="dashboard-route-card__coin dashboard-route-card__coin--bitcoin" aria-hidden="true">₿</span>
      <span className="dashboard-route-card__coin dashboard-route-card__coin--ethereum" aria-hidden="true">◆</span>
      <span className="dashboard-route-card__next">
        <span className="dashboard-route-card__icon"><Icon size={22} /></span>
        <span className="dashboard-route-card__details"><small>Следующий шаг маршрута</small><strong>{title}</strong><em>{nextLabel} · {number}</em></span>
        <span className="dashboard-route-card__action">Следующий шаг маршрута <ArrowRight size={19} /></span>
      </span>
    </NavLink>;
  }

  if (!route || !stop) return null;
  const Icon = stop.type === "LESSON" ? BookOpen : stop.type === "SECURITY_CASE" ? ShieldCheck : TrendingUp;
  return <NavLink className="route-next-step" to={routeStopPath(stop)}>
    <Icon size={18}/><span><small>Следующий шаг маршрута</small><strong>{stop.title}</strong><em>{stop.type === "LESSON" ? "Урок" : stop.type === "SECURITY_CASE" ? "Учебный кейс" : "Market Replay"} · {stop.number}/{route.total}</em></span><ArrowRight size={18}/>
  </NavLink>;
}
