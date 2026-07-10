# TROZBOT Phase 1 — Local demo script

Prove the robot concierge vertical slice on your laptop: **non-human robot UI**, **KB-grounded answer**, **create ticket**, with optional **stub voice** path.

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

**kb_retrieve** — `grounded: true` and non-empty `sources`:

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
    "grounded": true
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
| Auth | Local demo is unauthenticated (loopback only) |
| Images / K8s | Not required for this demo; see `deploy/k8s` and `docs/SUPPLY_CHAIN.md` for later |
| Tools | Only `kb_retrieve` + `create_ticket` (policy rejects e.g. `reset_password`) |

---

## Demo success checklist

- [ ] `pnpm test` green  
- [ ] All three `/health` endpoints return `"ok": true`  
- [ ] Session → grounded `kb_retrieve` → `create_ticket` with `status: "open"`  
- [ ] UI shows non-human robot + avatar state labels  
- [ ] (Optional) Voice stub turn returns grounded answer  

**STOP here for demo day** — do not require Wave 6, Phase 2, live GKE, or owner registry/cosign keys.
