import { createHmac, timingSafeEqual } from "node:crypto";
import { buildRecommendedRoute } from "./route-data.js";
import type { AppUser } from "./max-auth.js";

export const botCommands = [
  { name: "start", description: "Открыть КриптоКласс" },
  { name: "route", description: "Мой учебный маршрут" },
  { name: "progress", description: "Мой прогресс" },
  { name: "help", description: "Помощь и команды" },
];
type State = Parameters<typeof buildRecommendedRoute>[0] & { routeViewed: boolean };
type Button = { type: "open_app"; text: string; contact_id: number; payload: string };
export type BotReply = { text: string; attachments: { type: "inline_keyboard"; payload: { buttons: Button[][] } }[] };

export function webhookSecret(token: string) {
  return createHmac("sha256", token).update("crypto-class-max-webhook-v1").digest("hex");
}
export function validWebhookSecret(actual: string | undefined, expected: string) {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function buildBotReply(command: string, state: State, botId: number): BotReply {
  const route = buildRecommendedRoute(state);
  const next = route.currentIndex === null ? undefined : route.stops[route.currentIndex];
  const button = (text: string, payload: string): Button[] => [{ type: "open_app", text, contact_id: botId, payload }];
  const nextPayload = next ? `${next.type === "LESSON" ? "lesson" : next.type === "SECURITY_CASE" ? "case" : "replay"}:${next.contentId}` : "route";
  let text: string;
  let buttons: Button[][];
  if (command === "/route") {
    text = !state.routeViewed ? "Твой учебный маршрут: уроки, кейсы безопасности и практика по порядку. Открой маршрут и посмотри, что тебя ждёт." : next ? `Следующий шаг маршрута: ${next.title}\nОстановка ${next.number} из ${route.total}.` : "Маршрут пройден! Можно повторить уроки и практику.";
    buttons = !state.routeViewed || !next ? [button("Открыть маршрут", "route")] : [button("Следующий шаг", nextPayload), button("Весь маршрут", "route")];
  } else if (command === "/progress") {
    const count = (type: string) => route.stops.filter(stop => stop.type === type && stop.completed).length;
    text = `Твой прогресс\n\nУроки: ${count("LESSON")} из 20\nКейсы безопасности: ${count("SECURITY_CASE")} из 5\nИсторические сценарии: ${count("REPLAY")} из 5\nМаршрут: ${route.completedCount} из ${route.total} остановок.`;
    buttons = [button("Мой профиль", "profile"), button("Продолжить маршрут", state.routeViewed ? nextPayload : "route")];
  } else if (command === "/start") {
    text = "Привет! Это КриптоКласс — учимся понимать криптовалюты, распознавать мошенничество и принимать решения без риска для реальных денег.\n\nОткрой приложение или выбери свой маршрут.";
    buttons = [button("Открыть КриптоКласс", "home"), button("Мой маршрут", "route"), button("Мой прогресс", "profile")];
  } else {
    text = "Команды КриптоКласса\n\n/start — открыть приложение\n/route — маршрут и следующий шаг\n/progress — твой прогресс\n/help — эта справка\n\nОбучение и практика проходят в мини-приложении. Только виртуальные деньги, никаких реальных покупок.";
    buttons = [button("Открыть КриптоКласс", "home"), button("Мой маршрут", "route")];
  }
  return { text, attachments: [{ type: "inline_keyboard", payload: { buttons } }] };
}

export function createBotHandler(loadState: (user: AppUser) => Promise<State>, send: (userId: number, reply: BotReply) => Promise<void>, getBotId: () => number | null) {
  const processed = new Map<string, number>();
  const pending = new Map<string, Promise<void>>();
  return async (update: any) => {
    const started = update?.update_type === "bot_started";
    if (!started && update?.update_type !== "message_created") return;
    const sender = started ? update.user : update.message?.sender;
    if (!Number.isSafeInteger(sender?.user_id) || sender.user_id <= 0 || sender.is_bot) return;
    if (!started && update.message?.recipient?.chat_type !== "dialog") return;
    const botId = getBotId();
    if (botId === null) throw new Error("Bot is not ready");
    const key = started ? `start:${sender.user_id}:${update.timestamp}` : update.message?.body?.mid;
    if (typeof key !== "string" || !key) return;
    const now = Date.now();
    for (const [id, time] of processed) if (now - time > 300_000) processed.delete(id);
    if (processed.has(key)) return;
    if (pending.has(key)) return pending.get(key);
    const task = (async () => {
      const user = { id: `max:${sender.user_id}`, displayName: typeof sender.first_name === "string" ? sender.first_name : "Ученик" };
      const text = started ? "/start" : update.message?.body?.text;
      const command = typeof text === "string" ? text.trim().split(/\s+/)[0]!.toLowerCase().replace(/@[^\s]+$/, "") : "/help";
      await send(sender.user_id, buildBotReply(command, await loadState(user), botId));
      processed.set(key, Date.now());
      if (processed.size > 5000) processed.delete(processed.keys().next().value!);
    })();
    pending.set(key, task);
    try { await task; } finally { pending.delete(key); }
  };
}

export async function maxBotRequest(token: string, path: string, method = "GET", body?: unknown) {
  const response = await fetch(`https://platform-api2.max.ru${path}`, {
    method, headers: { Authorization: token, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`MAX API status ${response.status}`);
  const result = await response.json();
  if (result.success === false) throw new Error("MAX API rejected request");
  return result;
}
