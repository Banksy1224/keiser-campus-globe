// Keiser Campus Globe — AI concierge backend.
//
// A tiny Express proxy so the Claude API key never ships to the browser. The
// frontend POSTs the conversation plus the campus roster; we ask Claude (with a
// structured-output schema) for a short reply and the campus IDs the globe
// should fly to, then return that JSON.
//
// Env:
//   ANTHROPIC_API_KEY  (required) — your Claude API key
//   ALLOWED_ORIGIN     (optional) — e.g. https://banksy1224.github.io  (default: *)
//   PORT               (optional) — defaults to 8787 (Railway sets this)

import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// Health check (Railway pings this).
app.get("/", (_req, res) =>
  res.json({ ok: true, service: "keiser-campus-globe concierge" }),
);

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, campuses } = req.body ?? {};
    if (!Array.isArray(messages) || !Array.isArray(campuses)) {
      return res
        .status(400)
        .json({ error: "Request must include `messages` and `campuses` arrays." });
    }

    const roster = campuses
      .map(
        (c) =>
          `- ${c.id} | ${c.name} (${c.city}) | ${c.region}` +
          (c.programs?.length ? ` | programs: ${c.programs.join(", ")}` : ""),
      )
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

    const response = await client.messages.create({
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
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Keiser concierge listening on :${port}`));
