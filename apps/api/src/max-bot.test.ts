import assert from "node:assert/strict";
import { test } from "node:test";
import { apiErrorCode, botCommands, buildBotReply, configureBot, createBotHandler, MaxApiError, safeBotError, sendBotReply, validWebhookSecret, webhookSecret } from "./max-bot.js";
import { routeCatalog } from "./route-data.js";

const state = { completedLessonIds: [], completedCaseIds: [], completedScenarioIds: [], routeViewed: false };
test("app buttons include the real bot username and retain launch destinations", async () => {
  let username: string | undefined;
  await configureBot("test", "https://example.com", "secret", (_id, value) => { username = value; }, () => {}, async (_token, path) => path === "/me" ? { user_id: 7, username: "@crypto_test_bot" } : { success: true });
  assert.equal(username, "crypto_test_bot");
  const reply = buildBotReply("/start", state, 7, username);
  const buttons = reply.attachments[0]!.payload.buttons.flat();
  assert.deepEqual(buttons.map(button => button.payload), ["home", "route", "profile"]);
  assert.ok(buttons.every(button => button.web_app === "crypto_test_bot" && button.contact_id === 7));
});
test("rejected keyboard falls back to text, without repeating successful messages", async () => {
  const bodies: unknown[] = [];
  const reply = buildBotReply("/start", state, 7);
  await sendBotReply("test", 42, reply, () => {}, async (_token, _path, _method, body) => {
    bodies.push(body);
    if (bodies.length === 1) throw new MaxApiError("POST /messages", "HTTP 400", 400);
    return {};
  });
  assert.deepEqual(bodies, [reply, { text: reply.text }]);
  let calls = 0;
  await sendBotReply("test", 42, reply, () => {}, async () => { calls++; return {}; });
  assert.equal(calls, 1);
  await assert.rejects(sendBotReply("test", 42, reply, () => {}, async () => {
    throw new MaxApiError("POST /messages", "HTTP 401", 401);
  }), /HTTP 401/);
});
test("API diagnostics show machine codes, never raw response text", () => {
  assert.equal(apiErrorCode('{"code":"proto.payload","message":"secret-token"}'), " (proto.payload)");
  assert.equal(apiErrorCode('{"code":"Authorization: secret-token"}'), "");
  assert.equal(apiErrorCode("invalid body with secrets"), "");
});
test("command menu failure does not prevent webhook registration", async () => {
  const calls: string[] = [];
  const logs: string[] = [];
  let id: number | null = null;
  await configureBot("test-token", "https://example.com", "test-secret", value => { id = value; }, message => logs.push(message), async (_token, path) => {
    calls.push(path);
    if (path === "/me") return { user_id: 7 };
    if (path === "/me/commands") throw new MaxApiError("PATCH /me/commands", "HTTP 403");
    return { success: true };
  });
  assert.equal(id, 7);
  assert.deepEqual(calls, ["/me", "/subscriptions", "/me/commands"]);
  assert.ok(logs.some(message => message.includes("webhook remains active")));
});
test("webhook errors stay visible; arbitrary errors never expose secrets", async () => {
  await assert.rejects(configureBot("token", "https://example.com", "secret", () => {}, () => {}, async (_token, path) => {
    if (path === "/me") return { user_id: 7 };
    throw new MaxApiError("POST /subscriptions", "HTTP 401");
  }), /POST \/subscriptions: HTTP 401/);
  assert.equal(safeBotError(new Error("Authorization: secret-token")), "configuration or application error");
  assert.equal(safeBotError(new MaxApiError("GET /me", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY")), "GET /me: UNABLE_TO_GET_ISSUER_CERT_LOCALLY");
});
test("four commands, no check; webhook authentication", () => {
  assert.deepEqual(botCommands.map(c => c.name), ["start", "route", "progress", "help"]);
  const secret = webhookSecret("test-token");
  assert.ok(validWebhookSecret(secret, secret));
  assert.ok(!validWebhookSecret(undefined, secret));
  assert.ok(!validWebhookSecret("wrong", secret));
  assert.ok(!validWebhookSecret(webhookSecret("other"), secret));
});
test("newcomer opens route; returning learner follows next ordered stop", () => {
  assert.equal(buildBotReply("/route", state, 1).attachments[0]!.payload.buttons[0]![0]!.payload, "route");
  const reply = buildBotReply("/route", { ...state, routeViewed: true, completedLessonIds: ["crypto-intro"] }, 1);
  assert.equal(reply.attachments[0]!.payload.buttons[0]![0]!.payload, "case:fake-support-seed");
});
test("progress counts unique known completions, finished route stays accessible", () => {
  const completed = { routeViewed: true, completedLessonIds: routeCatalog.filter(s => s.type === "LESSON").map(s => s.contentId), completedCaseIds: routeCatalog.filter(s => s.type === "SECURITY_CASE").map(s => s.contentId), completedScenarioIds: routeCatalog.filter(s => s.type === "REPLAY").flatMap(s => [s.contentId, s.contentId]) };
  const reply = buildBotReply("/progress", completed, 1);
  assert.match(reply.text, /Уроки: 20 из 20/);
  assert.match(reply.text, /Исторические сценарии: 5 из 5/);
  assert.match(reply.text, /30 из 30/);
  assert.match(buildBotReply("/route", completed, 1).text, /Маршрут пройден/);
  assert.match(buildBotReply("/unknown", state, 1).text, /\/help/);
});
test("private updates use same MAX identity, ignore groups/bots and deduplicate delivery", async () => {
  let sent = 0;
  const handler = createBotHandler(async user => { assert.equal(user.id, "max:42"); return state; }, async () => { sent++; }, () => 7);
  const update = { update_type: "message_created", message: { sender: { user_id: 42, first_name: "Тест" }, recipient: { chat_type: "dialog" }, body: { mid: "1", text: "/start" } } };
  await Promise.all([handler(update), handler(update)]);
  await handler(update);
  assert.equal(sent, 1);
  await handler({ ...update, message: { ...update.message, recipient: { chat_type: "chat" }, body: { mid: "2", text: "/progress" } } });
  await handler({ ...update, message: { ...update.message, sender: { user_id: 42, is_bot: true } } });
  assert.equal(sent, 1);
  await handler({ update_type: "bot_started", timestamp: 1, user: { user_id: 42 } });
  assert.equal(sent, 2);
});
