# TROZBOT — Multi-Agent Reference (all lineages)

**Read this first.** Applies equally to Claude/Fable, Codex, Grok, Hermes, and any future gate-eligible lineage.

## What this is

**TROZBOT** is TROZLAN’s **robot voice support concierge** — a clearly non-human agent that:

1. Talks users through software issues  
2. Answers from a knowledge base  
3. Creates support tickets  
4. Later: safe confirm-to-act automations (not Phase 1)

It is a **standalone public repo** and an **agentic product**: multi-lineage build/review, Kubernetes from day one, **shared Postgres with TROZLANIO**.

| | |
|--|--|
| **Local** | `/Users/chrisozsvath/Projects/TROZLAN/TROZLANIO/trozbot` |
| **GitHub** | https://github.com/MegaPhoenix92/trozbot (public) |
| **Blueprint** | `docs/PHASE1_BLUEPRINT.md` |
| **DO NOTs** | `docs/DO_NOT.md` |
| **Operating model** | `docs/AGENTIC_OPERATING_MODEL.md` |

## Phase 1 success (definition of done)

User can: open robot → speak issue → get KB-grounded answer → create ticket if needed → all in one session → on thin K8s with security baseline.

## Stack (locked)

| Layer | Choice |
|-------|--------|
| Runtime | Kubernetes (GKE-class), thin services |
| Data | **Shared TROZLANIO Postgres** + managed Redis |
| Services (cap) | `web` (or embed), `voice-gateway`, `orchestrator` |
| Phase 1 tools | KB retrieve, `create_ticket` only |
| Supply chain | Image scan, SBOM, dep/secrets/Dockerfile scan, sign, admission verify |

## Repo layout

```text
trozbot/
  AGENTS.md                 # this file — all agents
  CLAUDE.md / GEMINI.md     # thin lineage entrypoints → AGENTS.md
  docs/
    PHASE1_BLUEPRINT.md
    DO_NOT.md
    AGENTIC_OPERATING_MODEL.md
    adr/
  apps/
    web/                    # robot UI (avatar states)
    voice-gateway/          # live audio
    orchestrator/           # AI tools + policy
  packages/
    core/                   # shared types / contracts
  deploy/
    k8s/                    # manifests / helm later
  .github/workflows/        # CI + security scans
```

## Shared DB rules

- Use TROZLANIO connection / branch conventions; prefer schema `trozbot`.
- Do **not** create a second production database.
- Do **not** re-implement users/tenants; reference TROZLANIO identity.
- Migrations owned by this repo; apply carefully to shared DB (ADR required before first migration).

## Multi-agent rules (non-negotiable)

1. **All lineages** may build, review, or orchestrate — not Fable-only.  
2. **Builder ≠ reviewer** on the same PR.  
3. **Security-shape** (auth, tickets, shared DB, secrets, K8s RBAC, signing, admission): ≥2 non-builder lineage APPROVEs + primary-source verify of the load-bearing change.  
4. Gate-eligible lineages: **claude, codex, grok, hermes** (per house rules).  
5. Before sustained work: pre-flight; lock scope to blueprint + DO_NOT.  
6. Prefer **one vertical slice** over parallel thrash; if parallel, claim paths in `docs/lanes/`.

## Commands (as they land)

```bash
# Local (Wave 1+)
pnpm install          # when workspace exists
pnpm dev              # orchestrator + stubs
pnpm test
pnpm lint

# Deploy (Wave 4+)
kubectl apply -k deploy/k8s/
```

Until workspace exists, prefer docs + ADRs + scaffolds over inventing stack thrash.

## Related systems

| System | Relation |
|--------|----------|
| **TROZLANIO** | Platform core; **shared Postgres** |
| **TROZLANCOM** | Legacy embedded TROZBOT UI/API — reference, do not assume this repo re-exports it |
| **botsentinel** | Sibling security/auth product — do not merge codebases |

## When unsure

1. Re-read `docs/PHASE1_BLUEPRINT.md` success criteria  
2. Check `docs/DO_NOT.md`  
3. Prefer the smaller change that completes the vertical slice  
4. Ask owner only for irreversible / prod DB / public deploy decisions  
