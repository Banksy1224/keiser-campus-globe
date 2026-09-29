/**
 * Address used for in-memory rate limits.
 * Railway publishes the connecting client on X-Real-IP. When that header is
 * absent (local dev), use the first X-Forwarded-For hop, then the socket.
 */
export function clientIp(req) {
  const real = req.headers["x-real-ip"];
  if (typeof real === "string") {
    const ip = real.split(",")[0].trim();
    if (ip) return ip;
  }
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    const ip = forwarded.split(",")[0].trim();
    if (ip) return ip;
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}
