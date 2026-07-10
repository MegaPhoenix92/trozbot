# TROZBOT

**Robot voice support concierge** for TROZLANIO — clearly non-human, knowledge-base answers, ticket creation, Kubernetes from day one.

| | |
|--|--|
| **GitHub** | https://github.com/MegaPhoenix92/trozbot |
| **Local** | `TROZLAN/TROZLANIO/trozbot` |
| **DB** | **Shared with TROZLANIO** (schema-isolated) |
| **Phase 1 blueprint** | [`docs/PHASE1_BLUEPRINT.md`](./docs/PHASE1_BLUEPRINT.md) |

## Phase 1 in one line

> Robot pops up → user speaks → KB-grounded answer → create ticket if needed → one session → thin K8s + security baseline.

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
apps/web            robot UI
apps/voice-gateway  live audio
apps/orchestrator   AI tools + policy
packages/core       shared contracts
deploy/k8s          thin cluster manifests
docs/               blueprint, ADRs, lanes
```

## Status

**Wave 0 — repo spine:** blueprint, multi-agent contracts, scaffolds, CI security stub.  
Implementation waves are in the blueprint.

## Related

- **TROZLANIO** — platform core + shared DB  
- **TROZLANCOM** — legacy embedded TROZBOT surfaces (reference only)  
- **botsentinel** — sibling product; not this codebase  
