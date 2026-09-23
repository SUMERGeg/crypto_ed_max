import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

const token = "test-bot-token-not-a-secret";
const now = 1_780_000_000;

function signedData(user: { id: number; first_name: string }, authDate = now) {
  const fields = new URLSearchParams({ auth_date: String(authDate), user: JSON.stringify(user) });
  const checked = [...fields].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  fields.set("hash", createHmac("sha256", secret).update(checked).digest("hex"));
  return fields.toString();
}

test("MAX launch data identifies only the signed user", async () => {
  const auth = await import("./max-auth.js").catch(() => null);
  const data = signedData({ id: 421, first_name: "Маша" });
  assert.deepEqual(auth?.verifyMaxInitData(data, token, now), { id: "max:421", displayName: "Маша" });
  assert.equal(auth?.verifyMaxInitData(data.replace("421", "422"), token, now), null);
});

test("MAX launch data rejects expired, duplicate and missing signatures", async () => {
  const auth = await import("./max-auth.js").catch(() => null);
  assert.equal(auth?.verifyMaxInitData(signedData({ id: 1, first_name: "Ира" }, now - 3601), token, now), null);
  assert.equal(auth?.verifyMaxInitData(`${signedData({ id: 1, first_name: "Ира" })}&hash=bad`, token, now), null);
  assert.equal(auth?.verifyMaxInitData("user=%7B%7D", token, now), null);
});

test("session token cannot be modified or used after expiry", async () => {
  const auth = await import("./max-auth.js").catch(() => null);
  const user = { id: "max:421", displayName: "Маша" };
  const session = auth?.createMaxSession(user, token, now);
  assert.equal(typeof session, "string");
  assert.deepEqual(auth?.verifyMaxSession(session!, token, now + 60), user);
  assert.equal(auth?.verifyMaxSession(`${session}changed`, token, now + 60), null);
  assert.equal(auth?.verifyMaxSession(session!, token, now + 86400), null);
});

test("API accepts only a valid bearer session in MAX mode", async () => {
  const auth = await import("./max-auth.js");
  const user = { id: "max:421", displayName: "Маша" };
  const session = auth.createMaxSession(user, token, now);
  assert.deepEqual(auth.resolveApiUser(`Bearer ${session}`, token, now + 60), user);
  assert.equal(auth.resolveApiUser(undefined, token, now + 60), null);
  assert.equal(auth.resolveApiUser("Bearer forged", token, now + 60), null);
});

test("guest sessions are isolated from MAX identities and reject tampering or expiry", async () => {
  const auth = await import("./max-auth.js");
  const guestId = "guest:00000000-0000-4000-8000-000000000001";
  const session = auth.createGuestSession(guestId, token, now);
  assert.deepEqual(auth.resolveApiUser(`Bearer ${session}`, token, now + 60), { id: guestId, displayName: "Гость" });
  assert.equal(auth.verifyMaxSession(session, token, now + 60), null);
  assert.equal(auth.resolveApiUser(`Bearer ${session}changed`, token, now + 60), null);
  assert.equal(auth.resolveApiUser(`Bearer ${session}`, token, now + 31 * 86400), null);
  assert.throws(() => auth.createGuestSession("max:421", token, now));
});
