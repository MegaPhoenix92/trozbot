# Parallel lanes

Use a short lane brief when multiple agents work on TROZBOT at the same time. A lane exists to prevent path collisions and hidden scope expansion; it does not replace the issue, outer goal, or review gate.

Example: `docs/lanes/phase1-redis-sessions.md`

```markdown
# Lane: phase1-redis-sessions

Task / issue: #N
Owner lineage: codex
Objective: replace in-memory sessions with the assigned Redis-backed Phase 1 contract
Allowed paths: apps/orchestrator/**, packages/core/**
Do not touch: apps/web/**, deploy/k8s/**, Phase 2 tools
Acceptance: exact tests + restart/durability smoke
Reviewers: claude + hermes
STOP: PR merged and acceptance verified, or owner Redis access/config blocker
```

Rules:

- Parallel lanes must have non-overlapping ownership unless the orchestrator explicitly sequences a shared file.
- Every lane names objective, paths, DO-NOTs, acceptance, reviewers, and STOP.
- The builder receives zero review votes.
- Security-shaped lanes follow the two-non-builder gate.
- Empty `docs/lanes/` means the current work is intentionally single-threaded.
- Remove or archive stale lane briefs after the wave so they are not mistaken for active assignments.

See [`../GOAL_LOOP.md`](../GOAL_LOOP.md) for the full lifecycle and [`../STATUS.md`](../STATUS.md) before selecting a new lane.
