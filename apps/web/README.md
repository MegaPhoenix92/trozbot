# apps/web — Robot UI (Wave 2)

Clearly **non-human** robot concierge surface with avatar states:

- `idle` · `listening` · `thinking` · `speaking`

Wires a text session to the Wave 1 orchestrator via **same-origin `/api` proxy**
(`POST /api/sessions`, tool invoke). Full voice media is Wave 3.

## Local run

From repo root (two terminals):

```bash
pnpm install
pnpm build

# Terminal A — orchestrator (CORS enabled for local UI)
pnpm dev:orchestrator

# Terminal B — robot UI
pnpm dev:web
# → http://127.0.0.1:5173  (health: /health)
```

Env:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `5173` | Web server port |
| `ORCHESTRATOR_URL` | `http://127.0.0.1:8787` | Orchestrator base URL |

## Tests

```bash
pnpm --filter @trozbot/web test
```

Tests drive the real `RobotController` + `OrchestratorClient` against a live in-process orchestrator (session → KB → ticket + policy deny).

**Status:** Wave 2 robot UI.
