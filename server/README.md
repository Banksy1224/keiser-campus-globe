# Keiser Campus Globe — AI concierge backend

A tiny Express proxy that powers the globe's **AI concierge** via the Claude API,
keeping your `ANTHROPIC_API_KEY` server-side (never in the browser).

It exposes:

```
POST /api/chat
  body: { messages: [{role, content}], campuses: [{id, name, city, region, programs}] }
  →     { reply: string, campusIds: string[] }
  Abuse controls (in-memory, one Railway instance):
    - When ALLOWED_ORIGIN is a specific origin (or a comma-separated list),
      a missing Origin is 401 and any other Origin is 403. Claude is not called.
      "*" or unset leaves the origin gate open (local dev).
    - 30 requests / 10 minutes per client IP (Railway `X-Real-IP`, else the
      first `X-Forwarded-For` hop)
    - 300 requests / 10 minutes per Origin
    - JSON body capped at 64kb (413 `payload_too_large`)

POST /api/rfi
  body: two-step TCPA campus-tour inquiry (zod-validated)
  →     { ok, partial, id, emailed, emailSkipped, webhooked, smtpConfigured,
          persisted, durable, message, warnings }
```

`POST /api/rfi` is the Keiser Globe lead path. It does **not** write SEC Genie
tables (there are none here). Inquiries persist to `rfi_inquiries` when
`DATABASE_URL` is set; otherwise they stay in process memory so a missing
database never 500s a prospect. Destination: SMTP to the campus admissions
inbox (`campus.email`, with corridor fallbacks) and/or `RFI_WEBHOOK_URL`.

## Operator note: SMTP is required for RFI email

Email is sent only when **both** of these are set:

| Variable | Role |
| --- | --- |
| `SMTP_HOST` | Required. SMTP relay hostname. |
| `SMTP_FROM` | Required. From address. |
| `SMTP_PORT` | Optional. Defaults to `587` (`465` turns on TLS). |
| `SMTP_USER` | Optional. Relay username when the server requires auth. |
| `SMTP_PASS` | Optional. Relay password when the server requires auth. |

`SMTP_HOST` and `SMTP_FROM` are the pair the server checks (`isSmtpReady` in
`rfi-dispatch.js`). Do not invent or commit credentials. If either required
variable is missing, the inquiry is still validated and saved (`DATABASE_URL`
→ Postgres, otherwise process memory) and the API returns a **partial**
success. `emailed` is `false`, `emailSkipped` is `true`, and `message` does
not claim that email was sent:

```json
{
  "ok": true,
  "partial": true,
  "emailed": false,
  "emailSkipped": true,
  "smtpConfigured": false,
  "persisted": true,
  "message": "Inquiry saved. Email was not sent because SMTP is not configured."
}
```

The request-info sheet uses that flag. It tells the visitor the request was
saved and was not emailed, and points them at phone or apply. It does not say
admissions was already notified.

The frontend sends the conversation + campus roster; the server asks **Claude
Opus 4.8** (with a structured-output schema) for a short reply and the campus IDs
the globe should fly to.

## Deploy to Railway

1. Create a new Railway project from this GitHub repo.
2. **Set the service Root Directory to `server`** (Settings → Root Directory).
   Railway then builds/runs this folder via Nixpacks (`npm install` → `npm start`).
3. Add variables (Settings → Variables):
   - `ANTHROPIC_API_KEY` — your Claude API key (only required for `/api/chat`)
   - `ALLOWED_ORIGIN` — `https://banksy1224.github.io` (locks CORS and
     `POST /api/chat` to the live site; other origins get 403, missing Origin
     gets 401). Comma-separate extra origins if you need them. `*` or unset
     skips that gate.
   - `SMTP_HOST`, `SMTP_FROM` — **required for RFI email**. Without them the
     inquiry is still saved and `/api/rfi` returns a partial success
     (`emailed: false`). See the operator note above. `SMTP_PORT`,
     `SMTP_USER`, and `SMTP_PASS` as needed by the relay.
   - `DEFAULT_RFI_EMAIL` — last-resort / Shanghai inbox
   - `RFI_WEBHOOK_URL` — optional CRM webhook
   - `RFI_DESTINATION` — `auto` (default), `email`, `webhook`, or `both`
   - `DATABASE_URL` — optional Postgres; creates `rfi_inquiries` on first write
4. Deploy. Railway gives you a public URL like `https://<name>.up.railway.app`.
5. Health check: open that URL — it returns `{"ok":true,...}`.

## Point the frontend at it

In the **frontend** repo settings (GitHub → Settings → Secrets and variables →
Actions → **Variables**), add:

- `VITE_AI_ENDPOINT` = your Railway URL (e.g. `https://<name>.up.railway.app`)

Re-run the Pages deploy. The "Ask the guide" button appears once the endpoint is
set; without it, the concierge stays hidden and nothing else is affected.

## Run locally

```bash
cd server
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY
npm start              # http://localhost:8787
```

Then run the frontend with `VITE_AI_ENDPOINT=http://localhost:8787` in `.env.local`.

## Cost

Each concierge message is one Claude Opus 4.8 call (usage-based). Swap the model
in `index.js` (e.g. `claude-sonnet-4-6`) for lower cost/latency if desired.
