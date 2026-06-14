# Keiser Campus Globe — AI concierge backend

A tiny Express proxy that powers the globe's **AI concierge** via the Claude API,
keeping your `ANTHROPIC_API_KEY` server-side (never in the browser).

It exposes one endpoint:

```
POST /api/chat
  body: { messages: [{role, content}], campuses: [{id, name, city, region, programs}] }
  →     { reply: string, campusIds: string[] }
```

The frontend sends the conversation + campus roster; the server asks **Claude
Opus 4.8** (with a structured-output schema) for a short reply and the campus IDs
the globe should fly to.

## Deploy to Railway

1. Create a new Railway project from this GitHub repo.
2. **Set the service Root Directory to `server`** (Settings → Root Directory).
   Railway then builds/runs this folder via Nixpacks (`npm install` → `npm start`).
3. Add variables (Settings → Variables):
   - `ANTHROPIC_API_KEY` — your Claude API key (**required**)
   - `ALLOWED_ORIGIN` — `https://banksy1224.github.io` (locks CORS to the live site)
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
