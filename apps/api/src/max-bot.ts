import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { Agent, request } from "node:https";
import { rootCertificates } from "node:tls";
import { buildRecommendedRoute } from "./route-data.js";
import type { AppUser } from "./max-auth.js";

export const botCommands = [
  { name: "start", description: "Открыть Finspace" },
  { name: "route", description: "Мой учебный маршрут" },
  { name: "progress", description: "Мой прогресс" },
  { name: "help", description: "Помощь и команды" },
];
type State = Parameters<typeof buildRecommendedRoute>[0] & { routeViewed: boolean };
type Button = { type: "open_app"; text: string; contact_id: number; web_app?: string; payload: string };
export type BotReply = { text: string; attachments: { type: "inline_keyboard"; payload: { buttons: Button[][] } }[] };

export function webhookSecret(token: string) {
  return createHmac("sha256", token).update("crypto-class-max-webhook-v1").digest("hex");
}
export function validWebhookSecret(actual: string | undefined, expected: string) {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function buildBotReply(command: string, state: State, botId: number, botUsername?: string): BotReply {
  const route = buildRecommendedRoute(state);
  const next = route.currentIndex === null ? undefined : route.stops[route.currentIndex];
  const button = (text: string, payload: string): Button[] => [{ type: "open_app", text, contact_id: botId, ...(botUsername ? { web_app: botUsername } : {}), payload }];
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
    text = "Привет! Это Finspace — учимся понимать криптовалюты, распознавать мошенничество и принимать решения без риска для реальных денег.\n\nОткрой приложение или выбери свой маршрут.";
    buttons = [button("Открыть Finspace", "home"), button("Мой маршрут", "route"), button("Мой прогресс", "profile")];
  } else {
    text = "Команды Finspace\n\n/start — открыть приложение\n/route — маршрут и следующий шаг\n/progress — твой прогресс\n/help — эта справка\n\nОбучение и практика проходят в мини-приложении. Только виртуальные деньги, никаких реальных покупок.";
    buttons = [button("Открыть Finspace", "home"), button("Мой маршрут", "route")];
  }
  return { text, attachments: [{ type: "inline_keyboard", payload: { buttons } }] };
}

export function createBotHandler(loadState: (user: AppUser) => Promise<State>, send: (userId: number, reply: BotReply) => Promise<void>, getBotId: () => number | null, getBotUsername: () => string | undefined = () => undefined) {
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
      await send(sender.user_id, buildBotReply(command, await loadState(user), botId, getBotUsername()));
      processed.set(key, Date.now());
      if (processed.size > 5000) processed.delete(processed.keys().next().value!);
    })();
    pending.set(key, task);
    try { await task; } finally { pending.delete(key); }
  };
}

// Trust the official Russian CA only for this client's connections, not process-wide.
const maxAgent = new Agent({ keepAlive: true, ca: [...rootCertificates, readFileSync(new URL("../../../certificates/russian-trusted-root-ca.pem", import.meta.url), "utf8")] });

export class MaxApiError extends Error {
  constructor(public readonly operation: string, public readonly reason: string, public readonly status?: number) {
    super(`${operation}: ${reason}`);
  }
}
export function apiErrorCode(body: string) {
  try {
    const code: unknown = JSON.parse(body).code;
    return typeof code === "string" && /^[a-zA-Z0-9_.-]{1,100}$/.test(code) ? ` (${code})` : "";
  } catch { return ""; }
}
export function safeBotError(error: unknown) {
  return error instanceof MaxApiError ? error.message : "configuration or application error";
}

export function maxBotRequest(token: string, path: string, method = "GET", body?: unknown): Promise<any> {
  const operation = `${method} ${path.split("?")[0]}`;
  return new Promise((resolve, reject) => {
    const req = request(new URL(path, "https://platform-api2.max.ru"), {
      method, agent: maxAgent, headers: { Authorization: token, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
    }, response => {
      const chunks: Buffer[] = [];
      response.on("data", chunk => chunks.push(Buffer.from(chunk)));
      response.on("error", () => reject(new MaxApiError(operation, "response interrupted")));
      response.on("end", () => {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          const code = apiErrorCode(Buffer.concat(chunks).toString("utf8"));
          reject(new MaxApiError(operation, `HTTP ${response.statusCode ?? "unknown"}${code}`, response.statusCode));
          return;
        }
        try {
          const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (result.success === false) reject(new MaxApiError(operation, "API rejected request"));
          else resolve(result);
        } catch { reject(new MaxApiError(operation, "invalid JSON response")); }
      });
    });
    req.on("error", (error: NodeJS.ErrnoException) => {
      const code = /^[A-Z0-9_]+$/.test(error.code ?? "") ? error.code! : "CONNECTION_ERROR";
      reject(new MaxApiError(operation, code));
    });
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

export async function sendBotReply(token: string, userId: number, reply: BotReply, log: (message: string) => void, api = maxBotRequest) {
  const path = `/messages?user_id=${userId}`;
  try {
    await api(token, path, "POST", reply);
  } catch (error) {
    if (!(error instanceof MaxApiError) || error.status !== 400 || !reply.attachments.length) throw error;
    log(`[bot] reply with keyboard rejected: ${safeBotError(error)}; trying text only`);
    await api(token, path, "POST", { text: reply.text });
    log("[bot] text-only reply sent");
  }
}

export async function configureBot(token: string, publicUrl: string, secret: string, setBotId: (id: number, username?: string) => void, log: (message: string) => void, api = maxBotRequest) {
  const url = new URL("/api/v1/bot/webhook", publicUrl);
  if (url.protocol !== "https:") throw new MaxApiError("webhook URL", "HTTPS required");
  const me = await api(token, "/me");
  if (!Number.isSafeInteger(me.user_id)) throw new MaxApiError("GET /me", "invalid bot ID");
  const username = typeof me.username === "string" ? me.username.replace(/^@/, "").trim() : undefined;
  setBotId(me.user_id, username || undefined);
  await api(token, "/subscriptions", "POST", { url: url.href, update_types: ["message_created", "bot_started"], secret });
  log("[bot] webhook configured");
  try {
    await api(token, "/me/commands", "PATCH", { commands: botCommands });
    log("[bot] command menu configured");
  } catch (error) {
    log(`[bot] command menu unavailable; webhook remains active: ${safeBotError(error)}`);
  }
}
