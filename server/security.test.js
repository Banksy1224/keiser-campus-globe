import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "./index.js";
import { upcomingStartTerms } from "./rfi-schema.js";

const PAGES_ORIGIN = "https://banksy1224.github.io";

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

async function withServer(options, fn) {
  const app = createApp(options);
  const server = await listen(app);
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

async function postChat(base, { origin, body, headers } = {}) {
  const reqHeaders = { "content-type": "application/json", ...(headers ?? {}) };
  if (origin) reqHeaders.origin = origin;
  return fetch(`${base}/api/chat`, {
    method: "POST",
    headers: reqHeaders,
    body: body === undefined ? "{}" : body,
  });
}

test("chat: disallowed or missing Origin is 403/401 before body validation", async () => {
  const previous = process.env.ALLOWED_ORIGIN;
  process.env.ALLOWED_ORIGIN = PAGES_ORIGIN;
  try {
    await withServer({ chatIpLimit: 2 }, async (base) => {
      const forbidden = await postChat(base, { origin: "https://evil.example", body: "" });
      assert.equal(forbidden.status, 403);
      assert.equal((await forbidden.json()).error, "origin_not_allowed");

      const missing = await postChat(base, { body: "" });
      assert.equal(missing.status, 401);
      assert.equal((await missing.json()).error, "unauthorized");

      // Rejected callers do not consume the IP budget.
      const stillForbidden = await postChat(base, { origin: "https://evil.example", body: "" });
      assert.equal(stillForbidden.status, 403);

      const allowedEmpty = await postChat(base, { origin: PAGES_ORIGIN, body: "{}" });
      assert.equal(allowedEmpty.status, 400);

      const realIpHeaders = { "x-real-ip": "203.0.113.9" };
      const first = await postChat(base, { origin: PAGES_ORIGIN, body: "{}", headers: realIpHeaders });
      assert.equal(first.status, 400);
      const second = await postChat(base, { origin: PAGES_ORIGIN, body: "{}", headers: realIpHeaders });
      assert.equal(second.status, 400);
      const limited = await postChat(base, { origin: PAGES_ORIGIN, body: "{}", headers: realIpHeaders });
      assert.equal(limited.status, 429);
      // A different client IP is not blocked by the bucket above.
      const otherIp = await postChat(base, {
        origin: PAGES_ORIGIN,
        body: "{}",
        headers: { "x-real-ip": "203.0.113.10" },
      });
      assert.equal(otherIp.status, 400);
    });
  } finally {
    if (previous === undefined) delete process.env.ALLOWED_ORIGIN;
    else process.env.ALLOWED_ORIGIN = previous;
  }
});

test("chat: ALLOWED_ORIGIN trailing slash still matches the browser Origin", async () => {
  const previous = process.env.ALLOWED_ORIGIN;
  process.env.ALLOWED_ORIGIN = `${PAGES_ORIGIN}/`;
  try {
    await withServer({}, async (base) => {
      const res = await postChat(base, { origin: PAGES_ORIGIN, body: "{}" });
      assert.equal(res.status, 400);
    });
  } finally {
    if (previous === undefined) delete process.env.ALLOWED_ORIGIN;
    else process.env.ALLOWED_ORIGIN = previous;
  }
});

test("chat: oversized JSON is rejected and a normal roster-sized body is not", async () => {
  const previous = process.env.ALLOWED_ORIGIN;
  process.env.ALLOWED_ORIGIN = "*";
  try {
    await withServer({}, async (base) => {
      const oversized = await postChat(base, {
        origin: PAGES_ORIGIN,
        body: JSON.stringify({ messages: [{ role: "user", content: "x".repeat(70_000) }], campuses: [] }),
      });
      assert.equal(oversized.status, 413);
      assert.equal((await oversized.json()).error, "payload_too_large");

      const underLimit = await postChat(base, {
        origin: PAGES_ORIGIN,
        body: JSON.stringify({ messages: [{ role: "user", content: "x".repeat(20_000) }] }),
      });
      assert.equal(underLimit.status, 400);
      assert.match((await underLimit.json()).error, /messages/);
    });
  } finally {
    if (previous === undefined) delete process.env.ALLOWED_ORIGIN;
    else process.env.ALLOWED_ORIGIN = previous;
  }
});

test("rfi: missing SMTP still persists and does not claim email was sent", async () => {
  const keys = ["SMTP_HOST", "SMTP_FROM", "SMTP_USER", "SMTP_PASS", "SMTP_PORT", "RFI_WEBHOOK_URL", "DATABASE_URL"];
  const saved = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  const previousOrigin = process.env.ALLOWED_ORIGIN;
  process.env.ALLOWED_ORIGIN = PAGES_ORIGIN;
  try {
    await withServer({}, async (base) => {
      const res = await fetch(`${base}/api/rfi`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: PAGES_ORIGIN,
        },
        body: JSON.stringify({
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          phone: "305-555-1212",
          tcpaConsent: true,
          campusId: "miami",
          campusName: "Keiser University Miami",
          program: "Nursing, AS",
          startTerm: upcomingStartTerms()[0],
          educationLevel: "high-school",
          modality: "On-campus",
          language: "en",
          source: "campus-tour",
          utmSource: "campus-tour",
          submittedAt: new Date().toISOString(),
        }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.ok, true);
      assert.equal(body.partial, true);
      assert.equal(body.emailed, false);
      assert.equal(body.emailSkipped, true);
      assert.equal(body.smtpConfigured, false);
      assert.equal(body.persisted, true);
      assert.equal(body.durable, false);
      assert.match(body.message, /not sent/i);
      assert.match(body.message, /SMTP is not configured/);
      assert.doesNotMatch(body.message, /emailed to admissions/i);
      assert.ok(body.warnings.includes("smtp_not_configured"));
      assert.equal(typeof body.id, "number");
      assert.ok(body.id > 0);
    });
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (previousOrigin === undefined) delete process.env.ALLOWED_ORIGIN;
    else process.env.ALLOWED_ORIGIN = previousOrigin;
  }
});
