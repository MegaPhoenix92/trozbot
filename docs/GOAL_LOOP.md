# TROZBOT `/goal` build loop

A `/goal` is a persistent mission contract for an agentic workstream. It is not a one-turn chat prompt and it is not permission to wander through the repository.

The purpose of the loop is simple: preserve the mission, deliver one reviewable slice at a time, and stop cleanly when the evidence says the slice is done or an owner decision is required.

## Required goal slots

Every executable goal must state all six slots.

| Slot | Required content |
|------|------------------|
| **Objective** | One crisp outcome |
| **Scope** | Paths and behavior that may change |
| **DO-NOT** | Hard boundaries and forbidden expansion |
| **Acceptance** | Commands and observable behaviors that prove completion |
| **Review / merge gate** | Required reviewers; builder receives zero votes |
| **STOP** | Success condition or explicit owner blocker |

A goal without these slots is not ready to run.

## Outer goal and inner goal

TROZBOT separates orchestration authority from implementation authority.

### Outer goal — orchestrator

The outer goal owns:

- product mission and current wave;
- issue creation and sequencing;
- lane ownership and collision prevention;
- review and merge gates;
- whether another wave may start;
- final STOP.

Any active lineage may orchestrate if it follows the public repository contracts. Orchestration is not reserved for one model family.

### Inner goal — builder

A builder receives one bounded issue or pull-request-sized objective. The builder:

- changes only the assigned scope;
- runs the required validation;
- opens the pull request;
- reports evidence and risks;
- does not count its own review;
- stops instead of silently selecting unrelated work.

The builder may recommend a next action. The outer goal decides whether that action becomes the next assignment.

## One-wave lifecycle

```text
pre-flight
  → create or confirm one issue
  → branch from current main
  → build only the assigned slice
  → prove with tests and runtime evidence
  → open one pull request
  → cross-review
  → CI green
  → merge
  → verify issue/acceptance state
  → STOP or explicitly authorized next wave
```

One cycle should deliver one meaningful vertical slice. Micro-issues that fragment one coherent change create noise; giant goals that mix unrelated services create hidden coupling.

## Standard state machine

```text
ASSIGNED
   ↓
BUILDING
   ↓
BLOCKED ───────────────→ owner decision or revised scope
   ↓
READY_FOR_REVIEW
   ↓
CHANGES_REQUESTED ─────→ BUILDING
   ↓
APPROVED
   ↓
CI_GREEN
   ↓
MERGED
   ↓
STOP or NEXT_TASK_ASSIGNED
```

A green check does not override a failed primary-source review. A merged pull request does not prove the acceptance behavior unless the load-bearing path was exercised.

## Roles

| Role | Responsibility |
|------|----------------|
| **Owner** | Sets the outer mission, supplies production access, and decides whether to ship |
| **Orchestrator** | Holds the goal, sequences work, enforces gates and STOP |
| **Builder** | Implements one bounded slice and reports evidence |
| **Reviewer** | Reads the actual diff and returns APPROVE or actionable findings |
| **Repository contracts** | Preserve truth when chat context disappears |

Current lineages in rotation are Claude/Fable, Codex, Grok, and Hermes. The repository contract is equal for all of them.

## Review rules

1. **Builder ≠ reviewer.** The author gets zero approval votes.
2. **Security-shaped changes require at least two non-builder lineage approvals.**
3. Review the load-bearing code, not just summaries or convergence between models.
4. Fix important findings in new commits so the review trail remains visible.
5. Re-run relevant tests after every security fix-forward.

Security-shaped areas include auth, identity propagation, tickets and other writes, shared database access, secrets, origin allowlists, K8s RBAC, image signing, and admission policy.

## Agent progress report

Agents should report work with this structure:

```text
TROZBOT AGENT REPORT

Agent lineage:
Task ID:
Task objective:
Status: BUILDING | BLOCKED | READY_FOR_REVIEW | DONE

Git state:
- Repository:
- Branch:
- Latest commit SHA:
- PR:
- Base branch:

Implemented:
- ...

Changed paths:
- ...

Acceptance criteria:
- [x] ...
- [ ] ...

Validation executed:
- command:
  result:

CI status:
- ...

Security-shape affected:
- auth / identity:
- tickets / write tools:
- shared DB:
- secrets:
- K8s / RBAC:
- signing / admission:
- PII / audio logging:

Blockers:
- ...

Unresolved risks:
- ...

Agent-recommended next action:
- ...
```

“Tests pass” without commands, commit identity, and acceptance mapping is not sufficient evidence.

## Orchestrator verdict

After inspecting the reported Git state, the orchestrator returns one of:

```text
CONTINUE
FIX_REQUIRED
READY_FOR_REVIEW
MERGE_READY
BLOCKED_ON_OWNER
NEXT_TASK_ASSIGNED
```

If the current slice is incomplete, the next assignment is remediation—not unrelated feature expansion.

## Self-chaining

Self-chaining means the orchestrator writes and starts the next bounded wave after a successful merge. It is allowed only when the outer goal explicitly authorizes it.

Without that authorization:

- merge the current slice;
- report the final evidence;
- STOP.

A builder never grants itself self-chain authority.

## Owner blockers

Agents must stop and surface owner-only dependencies instead of inventing them:

- production database credentials;
- vendor STT/TTS keys;
- live cluster access or kubeconfig;
- registry credentials;
- cosign key material or workload identity;
- production DNS, TLS, or admission-controller installation.

Once the owner supplies the dependency, the next goal should be a bounded smoke or deployment task with rollback evidence.

## TROZBOT history

| Slice | Evidence pattern |
|-------|------------------|
| Wave 1 | Core contracts + orchestrator + migrations → PR #1 → STOP |
| Waves 2–5 | UI, voice stub, K8s manifests, supply-chain CI → one issue/PR per wave |
| Hardening | Bind safety, DB-optional stores, honest KB miss, UI polish → PR #12 |
| Embed | `mountTrozbot`, allowlists, fixture host → PR #14 |
| TROZLANIO host | Host page/proxy → trozlanio PR #3479; live-wire correction → PR #3480 |

The history demonstrates a code-spine build loop. It does not by itself prove the full production acceptance criteria. See [`STATUS.md`](./STATUS.md).

## What the loop is not

- It is not the user-facing TROZBOT robot running forever.
- It is not code on GitHub changing itself without a live agent/session.
- It is not permission to merge because CI is green.
- It is not permission to rerun completed waves.
- It is not permission to begin Phase 2 because Phase 1 code exists.

## Operator rule

```text
assign one bounded task
→ build
→ prove
→ cross-review
→ merge
→ inspect reality
→ STOP or assign exactly one next task
```

That is how the system keeps moving without losing discipline.
