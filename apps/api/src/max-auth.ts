import { createHmac, timingSafeEqual } from "node:crypto";

export type AppUser = { id: string; displayName: string };

const LAUNCH_TTL_SECONDS = 3600;
const SESSION_TTL_SECONDS = 12 * 3600;
const GUEST_SESSION_TTL_SECONDS = 30 * 86400;
const GUEST_ID_PATTERN = /^guest:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

function equalHex(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function verifyMaxInitData(initData: string, botToken: string, nowSeconds = Math.floor(Date.now() / 1000)): AppUser | null {
  if (!initData || !botToken || initData.length > 8192) return null;
  try {
    const params = new URLSearchParams(initData);
    const keys = [...params.keys()];
    if (keys.length !== new Set(keys).size) return null;
    const hash = params.get("hash");
    const authDate = Number(params.get("auth_date"));
    if (!hash || !Number.isSafeInteger(authDate) || authDate > nowSeconds + 60 || nowSeconds - authDate > LAUNCH_TTL_SECONDS) return null;
    const checked = [...params.entries()]
      .filter(([key]) => key !== "hash")
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    const key = createHmac("sha256", "WebAppData").update(botToken).digest();
    const expected = createHmac("sha256", key).update(checked).digest("hex");
    if (!equalHex(hash, expected)) return null;

    const rawUser = JSON.parse(params.get("user") ?? "null") as Record<string, unknown> | null;
    if (!rawUser || typeof rawUser !== "object") return null;
    const id = rawUser.id;
    const validId = typeof id === "number" && Number.isSafeInteger(id) && id > 0
      ? String(id)
      : typeof id === "string" && /^[1-9]\d{0,18}$/.test(id) ? id : null;
    if (!validId) return null;
    const firstName = typeof rawUser.first_name === "string" ? rawUser.first_name.trim().slice(0, 80) : "";
    return { id: `max:${validId}`, displayName: firstName || "Ученик" };
  } catch {
    return null;
  }
}

function sessionSignature(payload: string, botToken: string, purpose = "CryptoEducationMaxSession") {
  const key = createHmac("sha256", purpose).update(botToken).digest();
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function createMaxSession(user: AppUser, botToken: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, displayName: user.displayName, exp: nowSeconds + SESSION_TTL_SECONDS })).toString("base64url");
  return `${payload}.${sessionSignature(payload, botToken)}`;
}

export function verifyMaxSession(session: string, botToken: string, nowSeconds = Math.floor(Date.now() / 1000)): AppUser | null {
  if (!session || !botToken || session.length > 2048) return null;
  const parts = session.split(".");
  if (parts.length !== 2 || !equalHex(parts[1]!, sessionSignature(parts[0]!, botToken))) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0]!, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof payload.id !== "string" || !/^max:[1-9]\d{0,18}$/.test(payload.id)) return null;
    if (typeof payload.displayName !== "string" || payload.displayName.length > 80) return null;
    if (typeof payload.exp !== "number" || !Number.isSafeInteger(payload.exp) || payload.exp <= nowSeconds || payload.exp > nowSeconds + SESSION_TTL_SECONDS) return null;
    return { id: payload.id, displayName: payload.displayName };
  } catch {
    return null;
  }
}

export function createGuestSession(guestId: string, botToken: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!GUEST_ID_PATTERN.test(guestId) || !botToken) throw new Error("Invalid guest session details");
  const payload = Buffer.from(JSON.stringify({ id: guestId, exp: nowSeconds + GUEST_SESSION_TTL_SECONDS })).toString("base64url");
  return `${payload}.${sessionSignature(payload, botToken, "CryptoEducationGuestSession")}`;
}

export function verifyGuestSession(session: string, botToken: string, nowSeconds = Math.floor(Date.now() / 1000)): AppUser | null {
  if (!session || !botToken || session.length > 2048) return null;
  const parts = session.split(".");
  if (parts.length !== 2 || !equalHex(parts[1]!, sessionSignature(parts[0]!, botToken, "CryptoEducationGuestSession"))) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0]!, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof payload.id !== "string" || !GUEST_ID_PATTERN.test(payload.id)) return null;
    if (typeof payload.exp !== "number" || !Number.isSafeInteger(payload.exp) || payload.exp <= nowSeconds || payload.exp > nowSeconds + GUEST_SESSION_TTL_SECONDS) return null;
    return { id: payload.id, displayName: "Гость" };
  } catch {
    return null;
  }
}

export function resolveApiUser(authorization: string | undefined, botToken: string, nowSeconds = Math.floor(Date.now() / 1000)): AppUser | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const session = authorization.slice(7);
  return verifyMaxSession(session, botToken, nowSeconds) ?? verifyGuestSession(session, botToken, nowSeconds);
}
