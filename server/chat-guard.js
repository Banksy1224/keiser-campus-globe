/** Sliding window used by POST /api/chat. Same shape as the RFI limiter. */
export function createRateLimiter(limit, windowMs) {
  const hits = new Map();
  return function allow(key) {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

/**
 * ALLOWED_ORIGIN is "*" / unset (any origin) or a comma-separated allowlist.
 * Returns null when every origin may call the concierge.
 */
export function normalizeOrigin(value) {
  return value.trim().replace(/\/+$/, "");
}

export function allowedOriginList() {
  const raw = (process.env.ALLOWED_ORIGIN ?? "").trim();
  if (!raw || raw === "*") return null;
  const list = raw
    .split(",")
    .map((part) => normalizeOrigin(part))
    .filter(Boolean);
  return list.length ? list : null;
}

/**
 * Access check for POST /api/chat. Runs before the body is parsed so a
 * missing or disallowed Origin is 401/403, not a 400 from an empty body
 * and not a Claude call.
 *
 * @returns {"allow" | "unauthorized" | "forbidden"}
 */
export function classifyChatAccess(req) {
  const list = allowedOriginList();
  if (!list) return "allow";
  const origin = req.get("origin");
  if (!origin) return "unauthorized";
  if (!list.includes(normalizeOrigin(origin))) return "forbidden";
  return "allow";
}

export const CHAT_IP_LIMIT = 30;
export const CHAT_IP_WINDOW_MS = 10 * 60 * 1000;
export const CHAT_ORIGIN_LIMIT = 300;
export const CHAT_ORIGIN_WINDOW_MS = 10 * 60 * 1000;
export const CHAT_BODY_LIMIT = "64kb";
