# Outer goal — TROZBOT Phase 1 closure

Copy this into `/goal` for any orchestrator lineage when the owner explicitly authorizes continued Phase 1 closure work.

This is a **post-code-spine** goal. Do not rerun Waves 1–5 merely because their historical names appear in the blueprint.

---

## Objective

Close the next explicitly assigned gap between the current implementation in [`STATUS.md`](./STATUS.md) and the seven Phase 1 success criteria in [`PHASE1_BLUEPRINT.md`](./PHASE1_BLUEPRINT.md).

Deliver one meaningful vertical slice, prove it, merge it under the review gate, then STOP unless this outer goal explicitly authorizes another slice.

## Baseline already shipped

- Waves 0–5 code artifacts;
- hardening and honest KB miss behavior;
- `@trozbot/embed` host package;
- TROZLANIO protected host page and proxy;
- B1 live-wire correction in TROZLANIO PR #3480.

Do not rebuild or fork these paths without a confirmed defect or an assigned acceptance gap.

## Scope

For each cycle:

1. read `docs/STATUS.md`, the blueprint, and `docs/DO_NOT.md`;
2. select or receive exactly one bounded Phase 1 closure task;
3. create or confirm one GitHub issue with acceptance criteria;
4. branch from current `origin/main`;
5. implement only the assigned paths;
6. run exact tests plus a load-bearing runtime smoke;
7. open one pull request with evidence;
8. obtain required non-builder reviews;
9. merge only when CI and the behavioral gate pass;
10. verify issue closure and report the final merge SHA.

Potential closure lanes include real voice, Redis sessions, trusted host identity propagation, live shared-DB validation, live K8s deployment, and signed/admitted images. Their order is not automatic; the owner or outer orchestrator must assign it.

## DO-NOT

Follow [`DO_NOT.md`](./DO_NOT.md) in full. Especially:

- no separate TROZBOT production Postgres;
- no human masquerade;
- no Phase 2 write tools beyond `create_ticket`;
- no autonomous account, billing, or infrastructure changes;
- no over-microservice expansion;
- no invented credentials, vendor keys, registry, or cluster access;
- no weakening redirect, origin, signing, admission, auth, or review controls to get green;
- no builder self-approval;
- no silent self-chain.

## Acceptance

The assigned slice must have:

- issue acceptance mapped to exact implementation evidence;
- build, typecheck, and relevant tests green;
- a real smoke of the load-bearing path, not only helper-unit tests;
- honest limitations and blockers recorded in `docs/STATUS.md` when state changes;
- at least two non-builder lineage approvals for security-shaped work;
- primary-source verification of the critical diff;
- a final report containing branch, head SHA, PR, commands, results, reviewers, CI state, and merge SHA.

Full Phase 1 is accepted only when all seven blueprint success criteria are true on the deployed path. Code files, manifests, or stubs alone do not satisfy that bar.

## Review / merge gate

- Builder receives zero review votes.
- Security-shaped changes require at least two non-builder approvals from Claude/Fable, Codex, Grok, or Hermes.
- Include primary-source review of auth, identity, ticket writes, shared DB, K8s/RBAC, signing/admission, and audio/PII handling when affected.
- The outer orchestrator owns merge authority.

## Self-chain

Default: **disabled**.

Self-chain only when the owner adds an explicit instruction such as:

> After a successful merge, select the next smallest Phase 1 gap from `docs/STATUS.md`, create a new bounded child goal, and continue until an owner blocker or all seven criteria are accepted.

Without that sentence or equivalent authority, merge the assigned slice and STOP.

## STOP

Stop when any of these is true:

1. the assigned slice is merged and its acceptance is verified;
2. owner access is required for the shared production DB, vendor STT/TTS, cluster, registry, signing identity, DNS/TLS, or admission controller;
3. the next action would enter Phase 2;
4. a product or architecture decision is unresolved;
5. the outer goal does not explicitly authorize another wave.

Surface blockers precisely. Never invent access or claim production acceptance from local evidence.
