// Keiser Campus Globe — AI concierge backend.
//
// A tiny Express proxy so the Claude API key never ships to the browser. The
// frontend POSTs the conversation plus the campus roster; we ask Claude (with a
// structured-output schema) for a short reply and the campus IDs the globe
// should fly to, then return that JSON.
//
// Env:
//   ANTHROPIC_API_KEY  (required) — your Claude API key
//   ALLOWED_ORIGIN     (optional) — e.g. https://banksy1224.github.io
//                      Comma-separated origins are allowed. "*" or unset
//                      skips the origin gate (local dev). When an allowlist
//                      is set, POST /api/chat returns 401 (no Origin) or 403
//                      (Origin not listed) and does not call Claude.
//   PORT               (optional) — defaults to 8787 (Railway sets this)
//
// Abuse controls on POST /api/chat (single Railway instance, in-memory):
//   - 30 requests / 10 min per client IP
//   - 300 requests / 10 min per Origin
//   - JSON body capped at 64kb (413)

import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { registerRfiRoutes } from "./rfi-routes.js";
import { clientIp } from "./client-ip.js";
import {
  CHAT_BODY_LIMIT,
  CHAT_IP_LIMIT,
  CHAT_IP_WINDOW_MS,
  CHAT_ORIGIN_LIMIT,
  CHAT_ORIGIN_WINDOW_MS,
  allowedOriginList,
  classifyChatAccess,
  createRateLimiter,
  normalizeOrigin,
} from "./chat-guard.js";

let anthropic;
function anthropicClient() {
  if (!anthropic) anthropic = new Anthropic();
  return anthropic;
}

function corsOrigin(origin, callback) {
  const list = allowedOriginList();
  const normalized = origin ? normalizeOrigin(origin) : origin;
  if (!list || !normalized || list.includes(normalized)) return callback(null, true);
  return callback(null, false);
}

function jsonErrorHandler(err, _req, res, next) {
  if (res.headersSent) return next(err);
  const status = Number(err.status || err.statusCode || 0);
  if (status === 413 || err.type === "entity.too.large") {
    return res.status(413).json({ error: "payload_too_large" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "invalid_json" });
  }
  console.error("request error:", err);
  return res.status(500).json({ error: "server_error" });
}

async function handleChat(req, res) {
  try {
    const { messages, campuses } = req.body ?? {};
    if (!Array.isArray(messages) || !Array.isArray(campuses)) {
      return res
        .status(400)
        .json({ error: "Request must include `messages` and `campuses` arrays." });
    }

    const roster = campuses
      .slice(0, 40)
      .map((c) => {
        const programs = Array.isArray(c.programs) ? c.programs.slice(0, 12) : [];
        return (
          `- ${c.id} | ${c.name} (${c.city}) | ${c.region}` +
          (programs.length ? ` | programs: ${programs.join(", ")}` : "")
        );
      })
      .join("\n");

    const system =
      "You are the Keiser University admissions concierge, guiding a prospective " +
      "student across an interactive 3D globe of Keiser's campuses. Be warm, " +
      "encouraging, and concise (2–4 sentences). When the student expresses an " +
      "interest — a program, a location, online vs. residential, athletics, " +
      "graduate study, etc. — recommend the most relevant campus(es) by id so the " +
      "globe can fly there. Only recommend campuses from the list. If nothing " +
      "matches, still reply helpfully with an empty campus list.\n\n" +
      `Campuses:\n${roster}\n\n` +
      "Respond as JSON: `reply` is your message to the student; `campusIds` is the " +
      "list of campus ids the globe should fly to/highlight, most relevant first " +
      "(empty array if none).";

    // Trim history and coerce to the API's role/content shape.
    const convo = messages.slice(-12).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 2000),
    }));

    const response = await anthropicClient().messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system,
      messages: convo,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              campusIds: { type: "array", items: { type: "string" } },
            },
            required: ["reply", "campusIds"],
            additionalProperties: false,
          },
        },
      },
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { reply: text, campusIds: [] };
    }

    // Only return ids that actually exist in the roster the client sent.
    const validIds = new Set(campuses.map((c) => c.id));
    parsed.campusIds = (parsed.campusIds || []).filter((id) => validIds.has(id));
    parsed.reply = parsed.reply || "Sorry, I didn't catch that — could you rephrase?";

    res.json(parsed);
  } catch (err) {
    console.error("concierge error:", err);
    res.status(500).json({ error: "concierge_unavailable" });
  }
}

export function createApp(options = {}) {
  const chatIpLimit = options.chatIpLimit ?? CHAT_IP_LIMIT;
  const chatIpWindowMs = options.chatIpWindowMs ?? CHAT_IP_WINDOW_MS;
  const chatOriginLimit = options.chatOriginLimit ?? CHAT_ORIGIN_LIMIT;
  const chatOriginWindowMs = options.chatOriginWindowMs ?? CHAT_ORIGIN_WINDOW_MS;
  const chatBodyLimit = options.chatBodyLimit ?? CHAT_BODY_LIMIT;

  const allowIp = createRateLimiter(chatIpLimit, chatIpWindowMs);
  const allowOrigin = createRateLimiter(chatOriginLimit, chatOriginWindowMs);
  const defaultJson = express.json({ limit: "1mb" });
  const chatJson = express.json({ limit: chatBodyLimit });

  const app = express();
  app.disable("x-powered-by");
  // Chat uses a tighter parser registered on the route. Skipping it here
  // keeps the 64kb cap from being overridden by this 1mb parser.
  app.use((req, res, next) => {
    if (req.method === "POST" && req.path === "/api/chat") return next();
    return defaultJson(req, res, next);
  });
  app.use(cors({ origin: corsOrigin }));

  app.get("/", (_req, res) => res.json({ ok: true, service: "keiser-campus-globe" }));

  registerRfiRoutes(app);

  app.post(
    "/api/chat",
    (req, res, next) => {
      const access = classifyChatAccess(req);
      if (access === "unauthorized") {
        return res.status(401).json({ error: "unauthorized" });
      }
      if (access === "forbidden") {
        return res.status(403).json({ error: "origin_not_allowed" });
      }
      const ip = clientIp(req);
      const origin = req.get("origin") || "none";
      if (!allowIp(ip) || !allowOrigin(origin)) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }
      return next();
    },
    chatJson,
    handleChat,
  );

  app.use(jsonErrorHandler);
  return app;
}

const app = createApp();

function runningAsCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === fileURLToPath(import.meta.url);
}

if (runningAsCli()) {
  const port = process.env.PORT || 8787;
  app.listen(port, () => console.log(`Keiser concierge listening on :${port}`));
}
