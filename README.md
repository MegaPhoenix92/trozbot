# TROZBOT

**Robot support concierge** for TROZLANIO — clearly non-human, knowledge-base answers, ticket creation, and a thin Kubernetes target.

| | |
|--|--|
| **GitHub** | https://github.com/MegaPhoenix92/trozbot |
| **Local** | `TROZLAN/TROZLANIO/trozbot` |
| **DB target** | **Shared with TROZLANIO** (schema-isolated `trozbot`) |
| **Phase 1 blueprint** | [`docs/PHASE1_BLUEPRINT.md`](./docs/PHASE1_BLUEPRINT.md) |
| **Current truth** | [`docs/STATUS.md`](./docs/STATUS.md) |
| **Agent build loop** | [`docs/GOAL_LOOP.md`](./docs/GOAL_LOOP.md) |

## Phase 1 target

> Robot opens → user speaks → KB-grounded answer → create ticket if needed → one continuous session → thin K8s deploy + security baseline.

The **code spine** for Waves 1–5 exists. The full production acceptance target is **not complete**: real voice, Redis sessions, live shared-DB proof, live K8s deployment, image signing, and admission verification remain pending. See [`docs/STATUS.md`](./docs/STATUS.md).

## Demo (local code spine)

→ **[`docs/DEMO.md`](./docs/DEMO.md)** — three terminals, curl smoke, bind/DB notes, and known limitations.

## Embed in a host app

→ **[`docs/EMBED.md`](./docs/EMBED.md)** — `mountTrozbot` / `destroy`, exact origin allowlists, proxy contracts, and the TROZLANIO host path.

```bash
pnpm dev:orchestrator   # :8787
pnpm dev:embed          # :8791 fixture host → http://127.0.0.1:8791/
```

## Local development

Requires **Node ≥ 20** and **pnpm 9.x**.

```bash
# Install workspace
pnpm install

# Build + typecheck + unit tests
pnpm build
pnpm typecheck
pnpm test

# Migration dry-run (no DATABASE_URL required)
pnpm --filter @trozbot/orchestrator migrate:dry-run

# Terminal A — orchestrator
pnpm dev:orchestrator
# Health: curl -s http://127.0.0.1:8787/health

# Terminal B — robot UI (text path)
pnpm dev:web
# → http://127.0.0.1:5173

# Terminal C — voice gateway (stub STT/TTS without API keys)
pnpm dev:voice
# → http://127.0.0.1:8790/health
```

### Manual smoke

```bash
# Start session
curl -s -X POST http://127.0.0.1:8787/sessions \
  -H 'content-type: application/json' \
  -d '{"correlationId":"local"}' | jq .

# KB retrieve + create_ticket — use session id from above
# curl -s -X POST http://127.0.0.1:8787/sessions/<SESSION_ID>/tools ...
```

### Database behavior

Wave 1 ships **expand-only** SQL under `apps/orchestrator/migrations/` for schema `trozbot` (`tickets`, `tool_calls`). Apply guidance lives in [`apps/orchestrator/migrations/README.md`](./apps/orchestrator/migrations/README.md).

- `DATABASE_URL` **unset**: tickets and audit use in-memory stores; live migration apply is skipped.
- `DATABASE_URL` **set**: the orchestrator can use Postgres stores after migrations are applied.
- Sessions still use `InMemorySessionStore`; Redis is a target, not current behavior.
- Never invent or commit production credentials.

Copy [`.env.example`](./.env.example) for local environment variables only.

## Multi-agent operating contract

Claude/Fable, Codex, Grok, and Hermes may build or review under the same public contract:

| Document | Purpose |
|----------|---------|
| [`docs/GOAL_LOOP.md`](./docs/GOAL_LOOP.md) | Outer/inner goals, progress reports, review gates, self-chain, STOP |
| [`docs/AGENTIC_OPERATING_MODEL.md`](./docs/AGENTIC_OPERATING_MODEL.md) | Lineages, recommended loops, lane ownership |
| [`docs/PHASE1_BLUEPRINT.md`](./docs/PHASE1_BLUEPRINT.md) | Product and architecture target |
| [`docs/STATUS.md`](./docs/STATUS.md) | Evidence-backed implementation and acceptance state |
| [`docs/DO_NOT.md`](./docs/DO_NOT.md) | Hard constraints |

`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and similar agent entrypoint files may exist in local workspaces, but they are intentionally untracked in this public repository. They may add local execution detail; they may not contradict the tracked public contracts.

## Architecture

### Current local/host path

```text
TROZLANIO protected page or standalone UI
        │
        ▼
 authenticated host proxy / direct loopback
        │
        ▼
 AI Orchestrator ──▶ fixture KB + create_ticket
        │
        ├── in-memory sessions
        └── memory tickets/audit or optional Postgres
```

### Target Phase 1 path

```text
Robot UI + real voice
        │
        ▼
 Voice Gateway ──▶ AI Orchestrator ──▶ KB + create_ticket
                         │
                  Redis + shared TROZLANIO Postgres
                         │
                  thin K8s + signed/admitted images
```

## Layout

```text
apps/web            standalone robot UI (text path)
apps/voice-gateway  session pipeline; STT/TTS stub by default
apps/orchestrator   KB tools, ticket policy, stores
packages/core       shared contracts
packages/embed      host mount API
 deploy/k8s         thin cluster manifests
docs/               blueprint, status, goal loop, demo, embed, ADRs
```

## Delivery status

### Code spine shipped

- **Wave 1** — orchestrator, core contracts, migrations, fixture KB, `create_ticket`.
- **Wave 2** — non-human robot UI states and text session wiring.
- **Wave 3** — voice-gateway session path with stub STT/TTS.
- **Wave 4** — thin K8s manifests with probes, limits, and secret references.
- **Wave 5** — gitleaks, dependency audit, Hadolint, SBOM, image build, and Trivy.
- **Hardening** — loopback bind guard, optional Postgres stores, honest KB miss, UI error/no-hit states.
- **Embed** — `@trozbot/embed` mount/destroy, exact origin allowlists, local fixture host.
- **TROZLANIO host** — protected page and authenticated `/api/trozbot` proxy; live-wired through the active route registry by TROZLANIO PR #3480.

### Phase 1 acceptance still open

- real microphone + STT/TTS turn;
- Redis-backed sessions;
- trusted TROZLANIO identity propagation into standalone ticket context;
- live shared-Postgres migration and durability smoke;
- live K8s deployment/ingress smoke;
- registry push, image signing, and admission verification.

No Phase 2 confirm-to-act tools start automatically. The owner assigns each next bounded closure task.

## Related

- **TROZLANIO** — platform core, protected host page, shared DB target
- **TROZLANCOM** — legacy embedded TROZBOT surfaces; reference only
- **botsentinel** — sibling security product; not this codebase
