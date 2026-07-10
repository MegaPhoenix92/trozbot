# TROZBOT — Agentic operating model (all lineages)

TROZBOT is built as **agentic software** by a **multi-lineage agent team**. This is not a Claude/Fable-only product loop.

**`/goal` loop doctrine (outer vs inner, STOP, self-chain, final review refresh):**  
→ **[`docs/GOAL_LOOP.md`](./GOAL_LOOP.md)** (canonical).  
**Current evidence ledger:** → **[`docs/PHASE1_STATUS.md`](./PHASE1_STATUS.md)**.

Public contracts live under `docs/`. Local agent entrypoints (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.clinerules*`) may exist in a developer checkout but are **not published** in this public repository; do not treat them as remote links.

## Lineages in rotation

| Lineage | Wrapper / surface | Default strengths |
|---------|-------------------|-------------------|
| **Claude / Fable** | Claude Code, subagents | Orchestration, product judgment, consult, review |
| **Codex** | `codex` CLI / tmux | Primary builder for services, K8s, CI |
| **Grok** | Grok Build / xAI | Builder + reviewer; security-gate eligible with primary-source verify |
| **Hermes** | hermes / GLM | Builder + reviewer; non-xAI security-gate eligible |

Retired lineages (agy, kimi-together, deepseek) stay out of merge gates.

## Equal-citizen rules

1. **One public contract:** `docs/PHASE1_BLUEPRINT.md` + `docs/DO_NOT.md` + this file + `docs/GOAL_LOOP.md` apply to every lineage the same way. Local overlays only refine developer checkout.
2. **Any lineage may orchestrate** a wave (not only Fable) if it follows pre-flight, consult, and review gates.
3. **Builder ≠ reviewer.** Whoever authored the diff gets zero review votes on that PR.
4. **Security-shape gate:** auth, tickets, shared-DB access, secrets, K8s RBAC, image signing, admission policy, host proxy → **≥2 non-builder lineages APPROVE** + primary-source verification of the load-bearing change.
5. **Convergence is a signal, not truth.** Spot-read the actual code either way.
6. **Outer owns sequencing.** Only the outer `/goal` authorizes self-chain; builders recommend, do not silently start the next wave.
7. **Tracked follow-ups.** A valid non-blocking finding becomes a **numbered issue**, not forgotten prose.

## Outer vs inner ownership

| | Outer orchestrator | Inner builder |
|--|--------------------|---------------|
| Sequencing | Yes | No |
| Self-chain authority | Yes (if goal text allows) | No |
| Implementation PR | May, but then zero review votes | Default |
| Review votes on own PR | Zero | Zero |
| STOP / NEXT WAVE declaration | Required in report | STOP unless outer authorized NEXT |

### Current-state report schema (builder → outer)

```text
PR: …
HEAD: …
Changed paths: …
Evidence (commands + results): …
Skips / owner blockers: …
Reviews: …
STOP | recommend NEXT: …
```

### Orchestrator-verdict schema

```text
Acceptance: met | not-met | blocked
Merge: yes | no (why)
STOP | authorize NEXT: <issue/goal id or none>
Follow-ups filed: #…
```

### Final review refresh (mandatory on security-shape and multi-file ops docs)

1. Fetch final HEAD  
2. Fetch all reviews again  
3. Inspect unresolved threads  
4. Disposition every high/security finding (accept / reject-with-rationale / track-as-issue)  
5. Confirm approvals apply to final HEAD  
6. Merge only when CI green and no CRITICAL / REQUEST_CHANGES  

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
  → final review refresh
  → merge
```

### C. Sustained `/goal` (multi-wave)

```
pre-flight
  → lock scope against PHASE1_STATUS + PHASE1_BLUEPRINT + DO_NOT
  → parallel lanes OK only with non-overlapping paths
  → each lane: issue → build → review → ship PR
  → outer merges only when gates pass
  → STOP when vertical slice criteria met or owner-blocked
  → self-chain only if outer goal authorized it
```

See **`docs/GOAL_LOOP.md`** for full doctrine and TROZBOT wave examples (Waves 1–5, host, B1–B3, D1).

## Lane ownership (historical Phase 1 waves)

| Wave | Suggested primary builder | Required reviewers |
|------|---------------------------|--------------------|
| Shared DB schema / tickets | Codex or Claude | ≥2 including non-builder on security-shape |
| Orchestrator + tools | Codex | Claude + Hermes or Grok |
| Voice gateway (stub) | Codex / Grok | Claude + Hermes |
| Robot UI | Claude / Grok | Codex skim + one other |
| K8s + supply chain CI | Codex | Hermes + Grok (security-shape) |

Reassign freely; claim paths in `docs/lanes/` when parallel.

## Coordination artifacts (public repo)

| Path | Purpose |
|------|---------|
| `docs/PHASE1_STATUS.md` | **Current** evidence ledger |
| `docs/PHASE1_BLUEPRINT.md` | Product mission + planned criteria |
| `docs/GOAL_LOOP.md` | `/goal` outer/inner loop |
| `docs/DO_NOT.md` | Hard stops |
| `docs/AGENTIC_OPERATING_MODEL.md` | This file |
| `docs/DEMO.md` / `docs/EMBED.md` | Local demo vs host integration |
| `docs/SUPPLY_CHAIN.md` | Scan/SBOM/sign owner gaps |
| `docs/lanes/` | Optional per-wave briefs |
| `docs/adr/` | Architecture decision records |

## Local + GitHub

- **Local:** `TROZLAN/TROZLANIO/trozbot`  
- **Remote:** `https://github.com/MegaPhoenix92/trozbot` (public)  
- **Sibling:** TROZLANIO (shared DB + host mount), TROZLANCOM (legacy embed reference), botsentinel  

## Anti-patterns

- “Only Fable can run the goal” → false  
- Claiming LIVE/PRODUCTION PROVEN from local tests alone → false  
- Three builders thrashing the same paths without a lane brief  
- Separate prod DB “for simplicity”  
- Approving security PRs by vibe  
- Silent self-chain without outer authorization  
- Linking gitignored local `AGENTS.md` as if it were a public doc  
