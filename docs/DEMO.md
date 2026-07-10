# TROZBOT Phase 1 — Local demo script

Prove the robot concierge vertical slice on your laptop: **non-human robot UI**, **KB-grounded answer**, **create ticket**, with optional **stub voice** path.

> **Evidence context:** this is the **standalone local demo** (loopback, unauthenticated).  
> For what is HOST-INTEGRATION vs OWNER-BLOCKED, see [`PHASE1_STATUS.md`](./PHASE1_STATUS.md).  
> **Stub voice is not production voice.**

| Service | Command | URL |
|---------|---------|-----|
| Orchestrator | `pnpm dev:orchestrator` | http://127.0.0.1:8787 |
| Robot UI | `pnpm dev:web` | http://127.0.0.1:5173 |
| Voice gateway (stub) | `pnpm dev:voice` | http://127.0.0.1:8790 |

Phase 1 tools only: `kb_retrieve` (read) · `create_ticket` (write).

---

## Prerequisites

- **Node.js ≥ 20**
- **pnpm 9.x** (`corepack enable` or `npm i -g pnpm@9`)
- Repo on **latest `main`**

```bash
cd TROZLAN/TROZLANIO/trozbot   # or your clone path
git fetch origin main && git checkout main && git pull --ff-only
pnpm install
pnpm build
pnpm test     # must be green before demo
```

No `DATABASE_URL`, STT/TTS keys, or registry credentials are required for this demo.

### Bind safety (hardening)

| Env | Default | Purpose |
|-----|---------|---------|
| `HOST` / `BIND_HOST` | `127.0.0.1` | Listen address |
| `ALLOW_PUBLIC_BIND` | unset | Must be `true` to bind non-loopback (`0.0.0.0`, etc.) |

Local demo is **unauthenticated**. Services refuse open binds without `ALLOW_PUBLIC_BIND=true`. Do not invent OAuth for this path.

### Optional shared Postgres

| Env | Behavior |
|-----|----------|
| `DATABASE_URL` **unset** | In-memory tickets + tool audit (demo default) |
| `DATABASE_URL` **set** | Expand-only migrations applied on orchestrator start; tickets/`tool_calls` in schema `trozbot` |

```bash
pnpm --filter @trozbot/orchestrator migrate:dry-run   # always safe, no URL needed
# Live apply only when you have a real TROZLANIO URL (never commit it):
# export DATABASE_URL='postgresql://…'   # from secret store
# psql "$DATABASE_URL" -f apps/orchestrator/migrations/001_trozbot_schema.sql
```

---

## Start services (three terminals)

**Terminal A — orchestrator**

```bash
pnpm dev:orchestrator
# → http://127.0.0.1:8787/health
```

**Terminal B — robot UI**

```bash
pnpm dev:web
# → http://127.0.0.1:5173
```

**Terminal C — voice gateway (stub STT/TTS)**

```bash
pnpm dev:voice
# → http://127.0.0.1:8790/health
```

Optional port overrides: `PORT=8788 pnpm dev:orchestrator` (then set `ORCHESTRATOR_URL` for web/voice).

---

## Health checks (all three)

```bash
curl -s http://127.0.0.1:8787/health
curl -s http://127.0.0.1:5173/health
curl -s http://127.0.0.1:8790/health
```

### Expected shape

```json
{"ok":true,"service":"trozbot-orchestrator","wave":1}
```

```json
{"ok":true,"service":"trozbot-web","wave":2,"orchestratorUrl":"http://127.0.0.1:8787","apiProxy":"/api"}
```

```json
{"ok":true,"service":"trozbot-voice-gateway","wave":3,"orchestratorUrl":"http://127.0.0.1:8787","media":{"stt":"stub","tts":"stub","mode":"stub","interimDoc":"apps/voice-gateway/README.md"}}
```

---

## Curl smoke — session → KB → ticket

Copy-paste as a block (requires orchestrator on `:8787`):

```bash
# 1) Start session
SESS=$(curl -s -X POST http://127.0.0.1:8787/sessions \
  -H 'content-type: application/json' \
  -d '{"correlationId":"demo-day"}')
echo "$SESS"
SID=$(echo "$SESS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).session.id))")
echo "session=$SID"

# 2) Knowledge-base retrieve (grounded fixture answer)
curl -s -X POST "http://127.0.0.1:8787/sessions/$SID/tools" \
  -H 'content-type: application/json' \
  -d '{"tool":"kb_retrieve","input":{"query":"how do I restart the agent after config changes?"}}' | jq .

# 3) Create support ticket
curl -s -X POST "http://127.0.0.1:8787/sessions/$SID/tools" \
  -H 'content-type: application/json' \
  -d '{"tool":"create_ticket","input":{"subject":"Demo ticket: agent still failing","body":"Followed KB restart steps; still seeing 502 on agent endpoint."}}' | jq .
```

### Expected results (illustrative)

**Session** — `avatarState` starts at `idle`; `id` is a UUID:

```json
{
  "session": {
    "id": "1fa0b8b9-dde2-4e7f-a5a8-c2dede327b66",
    "avatarState": "idle",
    "correlationId": "demo-day"
  }
}
```

**kb_retrieve hit** — `hit: true`, `grounded: true`, non-empty `sources`:

```json
{
  "ok": true,
  "tool": "kb_retrieve",
  "result": {
    "answer": "After changing agent configuration, restart the agent service...",
    "sources": [
      {
        "id": "kb-restart-agent",
        "title": "Restart the agent service",
        "excerpt": "After changing agent configuration, restart the agent service..."
      }
    ],
    "grounded": true,
    "hit": true
  }
}
```

**kb_retrieve miss** — no invented sources:

```json
{
  "ok": true,
  "tool": "kb_retrieve",
  "result": {
    "answer": "I did not find a matching knowledge base article...",
    "sources": [],
    "grounded": false,
    "hit": false
  }
}
```

**create_ticket** — `status: "open"` and a UUID `ticketId`:

```json
{
  "ok": true,
  "tool": "create_ticket",
  "result": {
    "ticketId": "d6032371-d15f-4c7e-b545-29685e2354cf",
    "status": "open",
    "subject": "Demo ticket: agent still failing"
  }
}
```

Tickets are **in-memory** when `DATABASE_URL` is unset (expected for local demo).

---

## Robot UI walkthrough (avatar states)

1. Open **http://127.0.0.1:5173** in a browser.
2. Confirm badge: **“TROZBOT robot concierge”** (clearly non-human; geometric robot, not a human face).
3. Click **Start session** → avatar may flash **thinking**, then **idle**; session UUID appears.
4. Enter a KB question (e.g. *how do I restart the agent after config changes?*) → **Get KB answer**.
   - Avatar path: **listening** → **thinking** → **speaking**.
   - Answer should mention restart/agent and come from the fixture KB.
5. Optionally fill ticket subject/body → **Create ticket** → ticket id shown; avatar **thinking** → **speaking**.

States used: `idle` · `listening` · `thinking` · `speaking`  
Config proof: `curl -s http://127.0.0.1:5173/config.json` → `"avatarStates":["idle","listening","thinking","speaking"]`, `"isRobot":true`.

The UI calls orchestrator via same-origin **`/api`** proxy (no cross-origin ticket API).

---

## Voice gateway stub turn (optional Terminal C)

With orchestrator + voice running:

```bash
VS=$(curl -s -X POST http://127.0.0.1:8790/v1/session \
  -H 'content-type: application/json' \
  -d '{"correlationId":"demo-voice"}')
echo "$VS"
VSID=$(echo "$VS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).sessionId))")

curl -s -X POST "http://127.0.0.1:8790/v1/session/$VSID/turn" \
  -H 'content-type: application/json' \
  -d '{"mode":"kb","text":"how do I restart the agent after config changes?"}' | jq .
```

Expect `sttStubbed: true`, `ttsStubbed: true`, `grounded: true`, and `tts.contentType: "audio/x-trozbot-stub"`.

Ticket mode:

```bash
curl -s -X POST "http://127.0.0.1:8790/v1/session/$VSID/turn" \
  -H 'content-type: application/json' \
  -d '{"mode":"ticket","text":"Still broken after restart","subject":"Voice demo ticket","body":"Stub STT path; need human follow-up."}' | jq .
```

---

## Known limitations (Phase 1 local)

| Topic | Behavior |
|-------|----------|
| Voice media | **Stub STT/TTS** by default (no real mic/speakers; no STT/TTS API keys) |
| Tickets | **In-memory** unless shared TROZLANIO `DATABASE_URL` is set and migrations applied |
| Auth | **Unauthenticated** local demo; loopback bind only unless `ALLOW_PUBLIC_BIND=true` |
| Images / K8s | Not required for this demo; see `deploy/k8s` and `docs/SUPPLY_CHAIN.md` for later |
| Tools | Only `kb_retrieve` + `create_ticket` (policy rejects e.g. `reset_password`) |
| KB miss | Honest `hit: false` with empty `sources` (no hallucinated articles) |

---

## Demo success checklist

- [ ] `pnpm test` green  
- [ ] All three `/health` endpoints return `"ok": true`  
- [ ] Session → KB hit (`grounded`) → KB miss (empty sources) → `create_ticket` open  
- [ ] UI shows non-human robot + avatar state labels + empty/error/no-hit messaging  
- [ ] (Optional) Voice stub turn returns grounded answer  

---

## Optional — embed host fixture

Simulates a parent app mounting the robot via `mountTrozbot` (see `docs/EMBED.md`).

```bash
# With orchestrator already running on :8787
pnpm dev:embed
# → http://127.0.0.1:8791/
```

Use **Start session → Get KB answer → Create ticket** inside the embed shell.

---

## Standalone local demo vs TROZLANIO host

| | Local (`docs/DEMO.md`) | TROZLANIO host (`docs/EMBED.md`) |
|--|------------------------|----------------------------------|
| Auth | Unauthenticated | `isAuthenticated` + `requireTrozbotAccess` |
| Bind | Loopback-only by default | Behind platform app |
| Proxy | Direct to orchestrator or web `/api` | `/api/trozbot` in **server/routes.ts** |
| Ticket identity | Optional / demo | **Server-derived** tenant/user only |
| Voice | Stub only | Same orchestrator; not production STT/TTS |

Do not treat a green local demo as live production voice or cluster deploy.

---

**STOP** — do not require Phase 2, live GKE, or owner registry/cosign keys for this demo.
