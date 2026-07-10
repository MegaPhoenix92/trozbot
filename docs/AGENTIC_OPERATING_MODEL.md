# TROZBOT — agentic operating model

TROZBOT is built as agentic software by a multi-lineage team. It is not a Claude/Fable-only loop, and no lineage receives privileged merge authority merely because it orchestrated or authored a change.

The detailed executable lifecycle lives in [`GOAL_LOOP.md`](./GOAL_LOOP.md). This document defines the team model, review expectations, and lane defaults.

## Lineages in rotation

| Lineage | Wrapper / surface | Default strengths |
|---------|-------------------|-------------------|
| **Claude / Fable** | Claude Code, subagents | Orchestration, product judgment, consult, review |
| **Codex** | `codex` CLI / tmux | Services, infrastructure, CI, focused implementation |
| **Grok** | Grok Build / xAI | Builder + reviewer; security-gate eligible with primary-source verification |
| **Hermes** | Hermes / GLM | Builder + reviewer; non-xAI security-gate eligible |

Retired lineages such as agy, kimi-together, and deepseek stay out of merge gates unless the owner explicitly changes the contract.

## Public contract

The tracked public contract is:

1. [`PHASE1_BLUEPRINT.md`](./PHASE1_BLUEPRINT.md) — product and architecture target;
2. [`STATUS.md`](./STATUS.md) — evidence-backed current implementation state;
3. [`DO_NOT.md`](./DO_NOT.md) — hard stops;
4. [`GOAL_LOOP.md`](./GOAL_LOOP.md) — issue → build → review → merge → STOP lifecycle;
5. this operating model — lineages, lanes, and review defaults.

Local workspaces may contain `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.clinerules*`, or other entrypoint files. They are intentionally untracked in this public repository. They may add local execution detail; they may not contradict the tracked public contract.

## Equal-citizen rules

1. **Any lineage may orchestrate** a wave if it follows pre-flight, scope, evidence, review, and STOP gates.
2. **Builder ≠ reviewer.** Whoever authored the diff gets zero review votes on that pull request.
3. **Security-shaped changes require at least two non-builder lineage approvals** plus primary-source verification of the load-bearing code.
4. **Convergence is a signal, not truth.** Read the code even when every model agrees.
5. **CI is evidence, not authority.** A green pipeline cannot prove a route is mounted, a production credential exists, or an acceptance path was exercised.
6. **One wave, one reviewable unit.** Do not mix unrelated services or owner-only operations into one hidden mega-task.

Security-shaped areas include auth, identity propagation, tickets and other writes, shared database access, secrets, origin allowlists, K8s RBAC, image signing, admission policy, and PII/audio handling.

## Recommended loops

### Tier 1 — short-form

Use only when all are true:

- one file or a very small local change;
- roughly 30 lines or fewer;
- no contract, auth, DB, K8s, supply-chain, or public API impact.

One lineage may implement and self-check; one independent skim is still useful.

### Tier 2 — standard feature

```text
consult
  → bounded issue / acceptance
  → build
  → cross-review by non-builders
  → CI green
  → merge
  → verify behavior
  → STOP
```

Prefer Codex for infrastructure/API work, but any lineage may build when the brief is explicit.

### Tier 3 — sustained `/goal`

```text
pre-flight
  → lock scope against blueprint + status + DO-NOT
  → assign non-overlapping lanes
  → each lane: build → prove → review → PR
  → orchestrator merges only when gates pass
  → STOP when the assigned vertical slice is accepted or owner-blocked
```

The outer goal must name:

- objective and wave;
- allowed paths and DO-NOTs;
- acceptance commands and observable behavior;
- required reviewers;
- merge authority;
- STOP condition;
- whether self-chaining is authorized.

Without explicit self-chain authority, a successful merge ends the goal.

## Outer and inner goals

### Outer goal

The orchestrator owns sequencing, issue creation, review gates, merge decisions, and whether another wave starts.

### Inner goal

The builder owns one bounded implementation, its tests, its pull request, and its report. It does not merge itself through a security gate and does not silently choose unrelated work.

See [`GOAL_LOOP.md`](./GOAL_LOOP.md) for the report and verdict formats.

## Lane ownership defaults

| Area | Suggested primary builder | Required review shape |
|------|---------------------------|-----------------------|
| Shared DB schema / tickets | Codex or Claude | ≥2 non-builder; include a non-xAI reviewer |
| Orchestrator + tools | Codex | Claude + Hermes or Grok |
| Voice gateway | Codex or Grok | Claude + Hermes |
| Robot UI / embed | Claude or Grok | Codex skim + one other lineage |
| Host auth / proxy / identity | Codex or Grok | ≥2 non-builder; primary-source route/auth review |
| K8s + supply chain | Codex | Hermes + Grok or Claude; security-shaped gate |
| Documentation-only reconciliation | Any lineage | One independent accuracy review; use security gate if docs change an operational security contract |

Reassign freely when a wave starts. Record the actual owner and paths so parallel agents do not thrash the same files.

## Coordination artifacts

| Path | Purpose |
|------|---------|
| `docs/PHASE1_BLUEPRINT.md` | Product and architecture target |
| `docs/STATUS.md` | Current implementation and acceptance truth |
| `docs/DO_NOT.md` | Hard constraints |
| `docs/GOAL_LOOP.md` | Persistent goal lifecycle and operator protocol |
| `docs/AGENTIC_OPERATING_MODEL.md` | Team model and lane defaults |
| `docs/lanes/` | Optional per-wave briefs for parallel work |
| `docs/adr/` | Architecture decisions |

## Current baseline

The Waves 1–5 code spine, hardening, embed package, and TROZLANIO host surface exist. TROZLANIO PR #3480 corrected the host proxy live-wire path through the active route registry.

That does **not** mean the full Phase 1 production acceptance target is complete. Real voice, Redis sessions, trusted identity propagation, live shared-DB evidence, live K8s, signing, and admission verification remain open or owner-gated. See [`STATUS.md`](./STATUS.md).

## Local + GitHub

- **Local:** `/Users/chrisozsvath/Projects/TROZLAN/TROZLANIO/trozbot`
- **Remote:** `https://github.com/MegaPhoenix92/trozbot`
- **Sibling products:** TROZLANIO (host/shared data plane), TROZLANCOM (legacy embedded surfaces), botsentinel (related security lane)

## Anti-patterns

- “Only Fable can run the goal.” False.
- Three builders editing the same service without lane ownership.
- Treating a green CI run as proof that the active runtime path is wired.
- Marking Phase 1 complete because manifests or stubs exist.
- Creating a separate production database for convenience.
- Shipping K8s without probes, limits, and logging.
- Approving security work from summaries without reading the diff.
- Allowing a builder to self-chain or self-approve without outer-goal authority.
