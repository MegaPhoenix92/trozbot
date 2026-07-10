# apps/voice-gateway — Live audio (Wave 3)

Duplex **session path** for the robot concierge: STT → orchestrator tools → TTS.

Phase 1 tools only (enforced by orchestrator): `kb_retrieve`, `create_ticket`.

## Media mode (stub vs live)

| Env | Behavior |
|-----|----------|
| `STT_API_KEY` **unset** (default) | **Stub STT** — request `text` field is the transcript |
| `TTS_API_KEY` **unset** (default) | **Stub TTS** — returns `audio/x-trozbot-stub` pseudo-audio |
| Key set | Wave 3 fails closed until a concrete vendor adapter is wired (no invented credentials / silent fake live path) |

**Interim path (Phase 1 without STT/TTS credentials):** use stub mode. The session still yields KB-grounded answers and can create tickets. Documented here intentionally — do not invent API keys.

## HTTP

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health + media mode |
| `POST` | `/v1/session` | Start orchestrator session |
| `POST` | `/v1/session/:id/turn` | `{ mode: "kb"\|"ticket", text, subject?, body? }` |

## Local run

```bash
# Terminal A
pnpm dev:orchestrator

# Terminal B
pnpm dev:voice
# → http://127.0.0.1:8790/health
```

Env: `PORT` (default 8790), `ORCHESTRATOR_URL` (default `http://127.0.0.1:8787`).

## Tests

```bash
pnpm --filter @trozbot/voice-gateway test
```

**Status:** Wave 3 stub-capable gateway with real session integration.
