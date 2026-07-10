# `/goal` loop — operating doctrine for TROZBOT

`/goal` is a **persistent multi-lineage build contract**, not a one-turn chat prompt.  
It binds an **outer orchestrator** and **inner builders** until acceptance is met or an explicit **STOP** / owner blocker is hit.

Public contract lives under **`docs/`**. Local-only agent overlays (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.clinerules*`) may exist in a private checkout but are **not** the published source of truth for this public repo.

---

## Anatomy of a `/goal`

| Element | Role |
|---------|------|
| **Objective** | What “done” means in one vertical slice |
| **Scope** | Paths and behaviors in |
| **DO-NOTs** | Hard constraints (or pointer to `docs/DO_NOT.md`) |
| **Acceptance** | Evidence commands / smoke / tests that must pass |
| **Review / merge gate** | Who may vote; security-shape rules |
| **STOP** | When to halt; what not to auto-start |

Missing any of these is an incomplete goal.

---

## Outer vs inner

| Role | Owns | Does not own |
|------|------|--------------|
| **Outer orchestrator** | Sequencing, issue/PR shape, self-chain **authorization**, merge timing, progress report | Implementing the whole product in one PR without gates |
| **Inner builder** | One bounded implementation PR | Review votes on own PR; silently starting the next wave |

- **Only the outer goal** may authorize self-chain to the next issue/PR.
- A builder may **recommend** NEXT WAVE; they must not treat recommendation as authorization unless the outer contract already said so.
- **Builder gets zero review votes** on the PR they built.

---

## Lifecycle (one vertical slice)

```text
issue (one)
  → branch from origin/main
  → build (thin, in-scope)
  → acceptance evidence
  → cross-review (builder ≠ reviewer)
  → CI green (necessary, not sufficient)
  → final HEAD review refresh
  → merge
  → STOP or authorized NEXT WAVE
```

**One issue + one PR** per meaningful vertical slice (stack only when required and tight).

### Security-shaped work

Auth, tickets, shared DB, secrets, K8s RBAC, signing, admission, host proxy:

- ≥2 **non-builder** lineages APPROVE  
- **Primary-source** verification of the load-bearing diff  
- CI green is required but never replaces reading the code  

### Final review refresh (before merge)

1. Fetch **final HEAD**  
2. Re-fetch **all** reviews and automated review events  
3. Inspect **unresolved threads**  
4. Reply **accepted** / **rejected-with-rationale** / **tracked-as-issue**  
5. Confirm approvals apply to **final HEAD**  
6. No open CRITICAL / P1 / REQUEST_CHANGES  
7. Post final review snapshot  
8. Merge only when CI is green  

Valid non-blocking findings → **numbered follow-up issue**, not forgotten prose.

---

## STOP vs NEXT WAVE

| Signal | Meaning |
|--------|---------|
| **STOP** | Acceptance merged **or** hard owner blocker; do not invent credentials/cluster/registry/vendor keys |
| **NEXT WAVE** | Only if **outer** goal (or owner) explicitly authorized the chain |

Owner blockers include: production/shared DB URL, GKE apply, registry push, cosign keys, STT/TTS vendor keys.

**Self-chain** is allowed only when the outer goal text authorizes it (example: D1 authorizes D2 TROZLANIO docs #3487 after merge). No magic background process: hooks/re-wake are **environment-dependent**.

---

## Progress report (builder → orchestrator)

```text
PR: <url>
HEAD: <sha>
Changed paths: …
Evidence commands + results: …
Skips / blockers: …
Review status: …
STOP | recommend NEXT: <id or none>
```

## Next-task assignment (orchestrator → builder)

```text
Issue: <n>
Scope: …
DO-NOTs: …
Acceptance: …
Review gate: …
STOP: …
Self-chain: yes/no (authority source)
```

---

## TROZBOT examples (illustrative)

| Wave / ID | Outcome |
|-----------|---------|
| Waves 1–5 | Local vertical slice: orchestrator, UI, voice **stub**, K8s manifests, supply-chain CI |
| Hardening | Bind guard, DB-optional, KB miss honesty |
| Embed | `@trozbot/embed` package + fixture host |
| Host mount | TROZLANIO page + proxy (sibling repo) |
| B1 | Live-wire: proxy registered in **active** `server/routes.ts` |
| B2 | Rollout gate + Phase 1 path allowlist |
| B3 | Trusted create_ticket attribution from host identity |
| **D1** (this doc wave) | Public truth ledger + `/goal` doctrine + fixture KB |
| D2 (authorized after D1) | TROZLANIO docs issue #3487 |
| #3486 | Separate P2 host/embed error-code compatibility lane |

---

## Related

- [`PHASE1_STATUS.md`](./PHASE1_STATUS.md) — evidence ledger  
- [`AGENTIC_OPERATING_MODEL.md`](./AGENTIC_OPERATING_MODEL.md) — lineages and gates  
- [`DO_NOT.md`](./DO_NOT.md) — hard constraints  
- [`GOAL_PHASE1.md`](./GOAL_PHASE1.md) — **historical** Phase 1 code-spine outer goal (do not re-run from scratch)  
