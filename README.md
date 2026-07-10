# TROZBOT

**Robot voice support concierge** for TROZLANIO — clearly non-human, knowledge-base answers, ticket creation, Kubernetes from day one.

| | |
|--|--|
| **GitHub** | https://github.com/MegaPhoenix92/trozbot |
| **Local** | `TROZLAN/TROZLANIO/trozbot` |
| **DB** | **Shared with TROZLANIO** (schema-isolated `trozbot`) |
| **Phase 1 blueprint** | [`docs/PHASE1_BLUEPRINT.md`](./docs/PHASE1_BLUEPRINT.md) |

## Phase 1 in one line

> Robot pops up → user speaks → KB-grounded answer → create ticket if needed → one session → thin K8s + security baseline.

## Demo (Phase 1 local)

Copy-paste walkthrough for orchestrator + robot UI + stub voice:

→ **[`docs/DEMO.md`](./docs/DEMO.md)**

Quick start: three terminals (`pnpm dev:orchestrator`, `pnpm dev:web`, `pnpm dev:voice`) then open http://127.0.0.1:5173 or run the curl smoke in the demo doc.

## Local development (Waves 1–3)

Requires **Node ≥ 20** and **pnpm** (9.x).

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

# Terminal B — robot UI (Wave 2)
pnpm dev:web
# → http://127.0.0.1:5173  (clearly non-human robot avatar + session wire)

# Terminal C — voice gateway (Wave 3; stub STT/TTS without API keys)
pnpm dev:voice
# → http://127.0.0.1:8790/health
```

### Manual smoke (optional)

```bash
# Start session
curl -s -X POST http://127.0.0.1:8787/sessions \
  -H 'content-type: application/json' \
  -d '{"correlationId":"local"}' | jq .

# KB retrieve + create_ticket — use session id from above
# curl -s -X POST http://127.0.0.1:8787/sessions/<SESSION_ID>/tools ...
```

### Database

Wave 1 ships **expand-only** SQL under `apps/orchestrator/migrations/` for schema `trozbot` (`tickets`, `tool_calls`). Apply path is documented in [`apps/orchestrator/migrations/README.md`](./apps/orchestrator/migrations/README.md).

- If `DATABASE_URL` is **unset** (default for local/CI): tickets + audit use **in-memory** stores; live migration apply is **skipped** and reported by `migrate:dry-run`.
- Do **not** invent or commit production credentials.

Copy [`.env.example`](./.env.example) for local env vars only.

## Multi-agent (all lineages)

This is **not** a Fable-only loop. Claude/Fable, Codex, Grok, and Hermes all build and review under one contract:

| Doc | Purpose |
|-----|---------|
| [`AGENTS.md`](./AGENTS.md) | **Start here** — every agent |
| [`docs/AGENTIC_OPERATING_MODEL.md`](./docs/AGENTIC_OPERATING_MODEL.md) | Consult → build → cross-review; `/goal` lanes |
| [`docs/DO_NOT.md`](./docs/DO_NOT.md) | Hard constraints |
| [`CLAUDE.md`](./CLAUDE.md) / [`GEMINI.md`](./GEMINI.md) | Lineage entrypoints → AGENTS.md |

## Architecture (thin)

```text
Robot UI (idle|listening|thinking|speaking)
        │
        ▼
 Voice Gateway  ──▶  AI Orchestrator  ──▶  KB + create_ticket
                            │
                     Redis + shared Postgres (TROZLANIO)
```

Security day one path: image scan · SBOM · deps · secrets · Dockerfile · **sign images** · **admission verify**.

## Layout

```text
apps/web            robot UI (scaffold)
apps/voice-gateway  live audio (scaffold)
apps/orchestrator   AI tools + policy ← Wave 1
packages/core       shared contracts ← Wave 1
deploy/k8s          thin cluster manifests (later)
docs/               blueprint, ADRs, lanes
```

## Status

**Wave 1** — orchestrator + core contracts + migrations (shipped).  
**Wave 2** — robot UI (`apps/web`) avatar states + session wire (text path).  
**Wave 3** — voice gateway stub STT/TTS + session tools (keys optional; interim stub documented).  
**Wave 4** — thin K8s manifests (`deploy/k8s`, client kustomize validate).  
**Wave 5** — supply chain CI (gitleaks, audit, hadolint, SBOM, trivy); cosign/registry owner-gated — see [`docs/SUPPLY_CHAIN.md`](./docs/SUPPLY_CHAIN.md).

## Related

- **TROZLANIO** — platform core + shared DB  
- **TROZLANCOM** — legacy embedded TROZBOT surfaces (reference only)  
- **botsentinel** — sibling product; not this codebase  
