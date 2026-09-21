import { useEffect, useState, type ReactNode } from "react";
import { api, setApiAccessToken } from "./api";
import { currentMaxLaunchData } from "./max-client";

export function MaxEntry({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ready" | "max-required" | "error">("loading");

  useEffect(() => {
    let active = true;
    const launchData = currentMaxLaunchData();
    if (launchData) document.documentElement.dataset.maxMiniapp = "true";
    async function connect() {
      try {
        const config = await api.maxConfig();
        if (!active) return;
        if (!config.maxRequired) {
          setState("ready");
          return;
        }
        if (!launchData) {
          setState("max-required");
          return;
        }
        const session = await api.signInMax(launchData);
        if (!active) return;
        setApiAccessToken(session.accessToken, session.user.id);
        setState("ready");
      } catch {
        if (active) setState("error");
      }
    }
    void connect();
    return () => { active = false; };
  }, []);

  if (state === "ready") return children;
  const message = state === "loading" ? "Открываем КриптоКласс…"
    : state === "max-required" ? "Открой КриптоКласс через бота в MAX, чтобы сохранить свой прогресс."
      : "Не удалось войти через MAX. Закрой мини-приложение и открой его из бота снова.";
  return <main className="max-entry"><div className="max-entry__card"><h1>КриптоКласс</h1><p>{message}</p></div></main>;
}
