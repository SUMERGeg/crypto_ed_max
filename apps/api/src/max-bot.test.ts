import assert from "node:assert/strict";
import { test } from "node:test";
import { botCommands, buildBotReply, createBotHandler, validWebhookSecret, webhookSecret } from "./max-bot.js";
import { routeCatalog } from "./route-data.js";

const state = { completedLessonIds: [], completedCaseIds: [], completedScenarioIds: [], routeViewed: false };
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
