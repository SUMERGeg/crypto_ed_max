import { ArrowRight, BookOpen, ShieldCheck, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "./api";
import { routeStopPath } from "./navigation";
import type { RecommendedRoute } from "./types";

export function RouteNextStep({ dark = false }: { dark?: boolean }) {
  const [route, setRoute] = useState<RecommendedRoute | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api.route(controller.signal).then(setRoute).catch(() => setRoute(null));
    return () => controller.abort();
  }, []);
  const stop = route?.currentIndex === null ? null : route?.stops[route.currentIndex];
  if (!route || !stop) return null;
  const Icon = stop.type === "LESSON" ? BookOpen : stop.type === "SECURITY_CASE" ? ShieldCheck : TrendingUp;
  return <NavLink className={`route-next-step ${dark ? "route-next-step--dark" : ""}`} to={routeStopPath(stop)}>
    <Icon size={18}/><span><small>Следующий шаг маршрута</small><strong>{stop.title}</strong><em>{stop.type === "LESSON" ? "Урок" : stop.type === "SECURITY_CASE" ? "Учебный кейс" : "Market Replay"} · {stop.number}/{route.total}</em></span><ArrowRight size={18}/>
  </NavLink>;
}
