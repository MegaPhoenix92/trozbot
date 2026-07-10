# Parallel lanes

When multiple agents work TROZBOT at once, create a short brief here so paths do not collide.

Example: `docs/lanes/wave1-orchestrator.md`

```markdown
# Lane: wave1-orchestrator
Owner lineage: codex
Paths: apps/orchestrator/**, packages/core/**
Do not touch: deploy/k8s/**, apps/web/**
Acceptance: health endpoint + create_ticket stub + tests
Reviewers: claude + hermes
```

Empty lanes dir means single-threaded work (preferred until Wave 1 lands).
