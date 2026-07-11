# TROZBOT

**Robot support concierge** for TROZLANIO — clearly **non-human**, knowledge-base answers, ticket creation, Kubernetes-from-day-one **discipline**.

| | |
|--|--|
| **GitHub** | https://github.com/MegaPhoenix92/trozbot |
| **Local** | `TROZLAN/TROZLANIO/trozbot` |
| **DB** | Shared with TROZLANIO (schema-isolated `trozbot`) when `DATABASE_URL` is set |
| **Current evidence** | [`docs/PHASE1_STATUS.md`](./docs/PHASE1_STATUS.md) |
| **Phase 1 blueprint** | [`docs/PHASE1_BLUEPRINT.md`](./docs/PHASE1_BLUEPRINT.md) |
| **Production handoff** | `https://github.com/MegaPhoenix92/trozlanio/blob/main/docs/TROZBOT_PRODUCTION_RUNBOOK.md` |

## Status (honest)

**Phase 1 code spine shipped** — local vertical slice, embed package, thin K8s manifests, supply-chain CI path, and hardened TROZLANIO host integration.

The host path now includes active bootstrap registration, rollout gating, trusted ticket identity, canonical embed error codes, and production-middleware compatibility tests through TROZLANIO PRs #3479, #3480, #3483, #3485, #3489, and #3490.

**Production execution still has explicit owner-operated gates:** real STT/TTS, live standalone cluster apply, production shared-DB migration/smoke, immutable registry push, cosign signing, admission verification, and rollout-cohort approval. See the evidence ledger and production handoff.

## Phase 1 in one line (target)

> Robot appears -> user describes a support issue -> KB-grounded answer -> create a ticket when needed -> one session -> thin K8s and security baseline.

**Voice note:** current media path is a **stub**; real STT/TTS is **not shipped**.

## Public docs

| Doc | Purpose |
|---|---|
| [`docs/PHASE1_STATUS.md`](./docs/PHASE1_STATUS.md) | Evidence ledger — shipped vs proven vs blocked |
| [`docs/PHASE1_BLUEPRINT.md`](./docs/PHASE1_BLUEPRINT.md) | Mission, architecture, planned success criteria |
| [`docs/GOAL_LOOP.md`](./docs/GOAL_LOOP.md) | `/goal` outer/inner loop, STOP, self-chain |
| [`docs/AGENTIC_OPERATING_MODEL.md`](./docs/AGENTIC_OPERATING_MODEL.md) | Multi-lineage rules and review gates |
| [`docs/DO_NOT.md`](./docs/DO_NOT.md) | Hard constraints |
| [`docs/DEMO.md`](./docs/DEMO.md) | Local three-terminal demo |
| [`docs/EMBED.md`](./docs/EMBED.md) | Embed package and current TROZLANIO host contract |
| [`docs/SUPPLY_CHAIN.md`](./docs/SUPPLY_CHAIN.md) | Scans, SBOM, owner-gated sign/registry |
| [TROZLANIO production runbook](https://github.com/MegaPhoenix92/trozlanio/blob/main/docs/TROZBOT_PRODUCTION_RUNBOOK.md) | Step-by-step DB, K8s, host rollout, smoke, monitoring, and rollback |

Local agent entrypoint files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and `.clinerules*` may exist in a developer checkout but are not published. Public operating contracts live under `docs/`.

## Local demo

See [`docs/DEMO.md`](./docs/DEMO.md).

Local demo is unauthenticated and loopback-only. The TROZLANIO host is authenticated and rollout-gated; see [`docs/EMBED.md`](./docs/EMBED.md).

## Embed and TROZLANIO host

See [`docs/EMBED.md`](./docs/EMBED.md) for `mountTrozbot`, fixture-host behavior, the live host proxy contract, trusted attribution, and bounded production tool-error handling.

```bash
pnpm dev:orchestrator   # :8787
pnpm dev:embed          # :8791 fixture host -> http://127.0.0.1:8791/
```

## Production handoff

The canonical production operator path lives with the host platform:

`https://github.com/MegaPhoenix92/trozlanio/blob/main/docs/TROZBOT_PRODUCTION_RUNBOOK.md`

It covers:

- release identity and non-builder gates;
- standalone topology and internal health;
- shared Postgres backup/migrations/verification;
- secrets and host environment configuration;
- image scan/SBOM/registry/signing/admission evidence;
- standalone deployment;
- embed provenance;
- TROZLANIO canary -> production deployment;
- staged alpha/beta/GA access;
- authenticated KB/ticket/security smoke;
- observability, go/no-go, rollback, and release reporting.

The document is an executable operator plan, not evidence that owner-blocked production steps have already run.

## Local development

Requires **Node >= 20** and **pnpm 9.x**.

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

Expand-only SQL is under `apps/orchestrator/migrations/` for schema `trozbot`.

- `DATABASE_URL` unset: in-memory tickets/audit; live apply skipped by dry-run.
- `DATABASE_URL` set: optional shared TROZLANIO Postgres path.
- Never commit production credentials.

Copy [`.env.example`](./.env.example) for local variables only.

## Architecture

```text
Robot UI (idle|listening|thinking|speaking)
        |
        v
 Voice Gateway (stub) -> AI Orchestrator -> KB + create_ticket
                                  |
                       optional shared Postgres
```

Phase 1 tools: **`kb_retrieve`** (read) and **`create_ticket`** (only write).

Supply-chain CI covers image/dependency/secret/Dockerfile scans and SBOM. Registry push, cosign signing, and admission verification remain owner-blocked until real release evidence exists.

## Layout

```text
apps/web            robot UI
apps/voice-gateway  stub STT/TTS + session tools
apps/orchestrator   AI tools + policy
packages/core       shared contracts
packages/embed      host mount API
deploy/k8s          thin cluster manifests
docs/               blueprint, status, goal loop, demo, embed, ADRs
```

## Wave summary

| Wave | Outcome |
|---|---|
| 1 | Orchestrator, core contracts, migrations |
| 2 | Robot UI avatar states and session wire |
| 3 | Voice gateway **stub** |
| 4 | Thin K8s manifests, client validation |
| 5 | Supply-chain CI; registry/signing owner-gated |
| Hardening | Bind guard, DB-optional path, honest KB miss |
| Embed + host | Package plus hardened TROZLANIO host path |

Details: [`docs/PHASE1_STATUS.md`](./docs/PHASE1_STATUS.md).

## Related

- **TROZLANIO** — platform core, shared DB, host page, production runbook
- **TROZLANCOM** — legacy embedded TROZBOT references
- **botsentinel** — sibling security product; not this codebase
