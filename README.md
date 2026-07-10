# TROZBOT

**Robot support concierge** for TROZLANIO — clearly **non-human**, knowledge-base answers, ticket creation, Kubernetes-from-day-one **discipline**.

| | |
|--|--|
| **GitHub** | https://github.com/MegaPhoenix92/trozbot |
| **Local** | `TROZLAN/TROZLANIO/trozbot` |
| **DB** | **Shared with TROZLANIO** (schema-isolated `trozbot`) when `DATABASE_URL` is set |
| **Current evidence** | [`docs/PHASE1_STATUS.md`](./docs/PHASE1_STATUS.md) |
| **Phase 1 blueprint** | [`docs/PHASE1_BLUEPRINT.md`](./docs/PHASE1_BLUEPRINT.md) |

## Status (honest)

**Phase 1 code spine shipped** — local vertical slice, embed package, thin K8s manifests, supply-chain CI path, and TROZLANIO host integration (sibling monorepo).  

**Production completion still has explicit owner-operated blockers:** real STT/TTS vendor keys, live cluster apply, registry push, cosign signing, admission verify, and production shared-DB credentials. See the evidence ledger.

## Phase 1 in one line (target)

> Robot pops up → user speaks → KB-grounded answer → create ticket if needed → one session → thin K8s + security baseline.

**Voice note:** current media path is a **stub**; real STT/TTS is **not shipped**.

## Public docs (start here)

| Doc | Purpose |
|-----|---------|
| [`docs/PHASE1_STATUS.md`](./docs/PHASE1_STATUS.md) | **Evidence ledger** — shipped vs proven vs blocked |
| [`docs/PHASE1_BLUEPRINT.md`](./docs/PHASE1_BLUEPRINT.md) | Mission + architecture + planned success criteria |
| [`docs/GOAL_LOOP.md`](./docs/GOAL_LOOP.md) | `/goal` outer/inner loop, STOP, self-chain |
| [`docs/AGENTIC_OPERATING_MODEL.md`](./docs/AGENTIC_OPERATING_MODEL.md) | Multi-lineage rules + review gates |
| [`docs/DO_NOT.md`](./docs/DO_NOT.md) | Hard constraints |
| [`docs/DEMO.md`](./docs/DEMO.md) | Local three-terminal demo |
| [`docs/EMBED.md`](./docs/EMBED.md) | Embed package + TROZLANIO host mount |
| [`docs/SUPPLY_CHAIN.md`](./docs/SUPPLY_CHAIN.md) | Scans, SBOM, owner-gated sign/registry |

Local agent entrypoint files (for example `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.clinerules*`) may exist in a **developer checkout** but are **not published** in the public repository. Public operating contracts live under **`docs/`**.

## Demo (Phase 1 local)

→ **[`docs/DEMO.md`](./docs/DEMO.md)** — three terminals, curl smoke, bind/DB notes.  

Local demo is **unauthenticated** and **loopback-only**. TROZLANIO host smoke is **authenticated** and **rollout-gated** (see EMBED).

## Embed + TROZLANIO host

→ **[`docs/EMBED.md`](./docs/EMBED.md)** — `mountTrozbot` / `destroy`, fixture host, and live TROZLANIO page/proxy contract.

```bash
pnpm dev:orchestrator   # :8787
pnpm dev:embed          # :8791 fixture host → http://127.0.0.1:8791/
```

## Local development

Requires **Node ≥ 20** and **pnpm** (9.x).

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm --filter @trozbot/orchestrator migrate:dry-run

# Terminal A — orchestrator
pnpm dev:orchestrator   # http://127.0.0.1:8787/health

# Terminal B — robot UI
pnpm dev:web            # http://127.0.0.1:5173

# Terminal C — voice gateway (stub STT/TTS; not production voice)
pnpm dev:voice          # http://127.0.0.1:8790/health
```

### Database

Expand-only SQL under `apps/orchestrator/migrations/` for schema `trozbot`.

- **`DATABASE_URL` unset** (default local/CI): in-memory tickets + audit; live apply skipped (`migrate:dry-run` reports SKIP).
- **`DATABASE_URL` set**: optional shared TROZLANIO Postgres path. Never commit real credentials.

Copy [`.env.example`](./.env.example) for local env vars only.

## Architecture (thin)

```text
Robot UI (idle|listening|thinking|speaking)
        │
        ▼
 Voice Gateway (stub)  ──▶  AI Orchestrator  ──▶  KB + create_ticket
                                │
                     optional shared Postgres (TROZLANIO)
```

Phase 1 tools: **`kb_retrieve`** (read) · **`create_ticket`** (write only).

Supply chain path (CI): image scan · SBOM · deps · secrets · Dockerfile.  
**Image registry push, cosign signing, and admission verify remain owner-blocked** — not claimed green without keys/cluster.

## Layout

```text
apps/web            robot UI
apps/voice-gateway  stub STT/TTS + session tools
apps/orchestrator   AI tools + policy
packages/core       shared contracts
packages/embed      host mount API
deploy/k8s          thin cluster manifests
docs/               blueprint, status ledger, DEMO, EMBED, ADRs
```

## Wave summary (code spine)

| Wave | Outcome |
|------|---------|
| 1 | Orchestrator + core + migrations |
| 2 | Robot UI avatar states + session wire |
| 3 | Voice gateway **stub** |
| 4 | Thin K8s manifests (client validate) |
| 5 | Supply-chain CI; cosign/registry owner-gated |
| Hardening | Bind guard, DB-optional, honest KB miss |
| Embed + host | Package + TROZLANIO mount (sibling) |

Details and proof levels: [`docs/PHASE1_STATUS.md`](./docs/PHASE1_STATUS.md).

## Related

- **TROZLANIO** — platform core + shared DB + host page  
- **TROZLANCOM** — legacy embedded TROZBOT surfaces (reference only)  
- **botsentinel** — sibling product; not this codebase  
