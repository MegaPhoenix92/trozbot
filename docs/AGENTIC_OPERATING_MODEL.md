# TROZBOT — Agentic operating model (all lineages)

TROZBOT is built as **agentic software** by a **multi-lineage agent team**. This is not a Claude/Fable-only product loop.

## Lineages in rotation

| Lineage | Wrapper / surface | Default strengths |
|---------|-------------------|-------------------|
| **Claude / Fable** | Claude Code, subagents | Orchestration, product judgment, consult, review |
| **Codex** | `codex` CLI / tmux | Primary builder for services, K8s, CI |
| **Grok** | Grok Build / xAI | Builder + reviewer; security-gate eligible with primary-source verify |
| **Hermes** | hermes / GLM | Builder + reviewer; non-xAI security-gate eligible |

Retired lineages (agy, kimi-together, deepseek) stay out of merge gates.

## Equal-citizen rules

1. **One contract:** `AGENTS.md` + `docs/PHASE1_BLUEPRINT.md` + `docs/DO_NOT.md` apply to every lineage the same way.
2. **Any lineage may orchestrate** a wave (not only Fable) if it follows pre-flight, consult, and review gates.
3. **Builder ≠ reviewer.** Whoever authored the diff gets zero review votes on that PR.
4. **Security-shape gate:** auth, tickets, shared-DB access, secrets, K8s RBAC, image signing, admission policy → **≥2 non-builder lineages APPROVE** + primary-source verification of the load-bearing change.
5. **Convergence is a signal, not truth.** Spot-read the actual code either way.

## Recommended loops

### A. Short-form (Tier 1)

- ≤1 file, ≤30 lines, no contract/DB/K8s change  
- Any lineage implements + self-check; optional one other lineage skim

### B. Standard feature (Tier 2)

```
consult (codex + one of hermes/grok)
  → build (prefer codex for infra/API; any lineage OK if briefed)
  → cross-review (≥2 non-builder lineages)
  → CI green
  → merge
```

### C. Sustained `/goal` (multi-wave)

```
pre-flight
  → lock scope against PHASE1_BLUEPRINT + DO_NOT
  → parallel lanes OK only with non-overlapping paths
  → each lane: build → review → ship PR
  → orchestrator merges only when gates pass
  → STOP when vertical slice criteria met or blocked
```

Orchestrator may be **Fable, Codex, Grok, or Hermes**. The goal text must name:

- scope + wave
- DO-NOTs (or point to `docs/DO_NOT.md`)
- acceptance criteria (from blueprint success section)
- review gate
- STOP condition

## Lane ownership (Phase 1 waves)

| Wave | Suggested primary builder | Required reviewers |
|------|---------------------------|--------------------|
| Shared DB schema / tickets | Codex or Claude | ≥2 including one non-xAI on security-shape |
| Orchestrator + tools | Codex | Claude + Hermes or Grok |
| Voice gateway | Codex / Grok | Claude + Hermes |
| Robot UI | Claude / Grok | Codex skim + one other |
| K8s + supply chain | Codex | Hermes + Grok (security-shape) |

Reassign freely; update this table when a wave starts so parallel agents do not thrash the same paths.

## Coordination artifacts (this repo)

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Always-on contract for every agent |
| `docs/PHASE1_BLUEPRINT.md` | Product + architecture truth |
| `docs/DO_NOT.md` | Hard stops |
| `docs/AGENTIC_OPERATING_MODEL.md` | This file |
| `docs/lanes/` | Optional per-wave briefs (create when running parallel goals) |
| `docs/adr/` | Architecture decision records |

## Local + GitHub

- **Local:** `/Users/chrisozsvath/Projects/TROZLAN/TROZLANIO/trozbot`
- **Remote:** `https://github.com/MegaPhoenix92/trozbot` (public)
- **Sibling products:** TROZLANIO (shared DB), TROZLANCOM (legacy embedded TROZBOT surfaces), botsentinel (related security lane)

## Anti-patterns

- “Only Fable can run the goal” → false; any lineage can orchestrate under this model  
- Three builders editing the same service without a lane brief → thrash  
- Shipping K8s without probes/limits/logging → fails Phase 1 ops bar  
- Separate prod DB “for simplicity” → violates shared-DB decision  
- Approving security PRs by vibe without reading the diff → fails house rule  
