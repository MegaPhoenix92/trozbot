# Outer goal draft — TROZBOT Phase 1 (multi-agent)

Copy into `/goal` for **any** orchestrator lineage (Fable, Codex, Grok, Hermes).

---

## Goal

Ship TROZBOT Phase 1 vertical slice per `docs/PHASE1_BLUEPRINT.md`: robot voice support concierge — KB answers + create_ticket, single session, thin Kubernetes, shared TROZLANIO Postgres, security baseline path.

## Scope (in)

- Wave 0 done (this repo spine) → execute Waves 1–5 as ordered in the blueprint  
- `apps/orchestrator`, `apps/voice-gateway`, `apps/web`, `packages/core`, `deploy/k8s`  
- Schema `trozbot` on **shared** TROZLANIO DB (ADR 0001)  
- CI supply-chain stub → real scans/sign when images exist  

## DO-NOT

Follow `docs/DO_NOT.md` in full. Especially:

- No separate product Postgres  
- No human masquerade  
- No write tools beyond create_ticket in Phase 1  
- No over-microservice  
- No Fable-only process — all lineages share AGENTS.md  
- Security-shape: ≥2 non-builder lineage reviews  

## Acceptance

Blueprint success criteria section — all seven bullets true with evidence (demo path or automated test + deploy smoke).

## Review gate

Every PR: tests/lint as available; security-shape PRs need ≥2 non-builder of {claude, codex, grok, hermes} + primary-source verify.

## STOP

When Phase 1 success criteria met, or blocked on owner decision (prod DB access, cluster provisioning, vendor STT/TTS keys). Surface blockers; do not invent credentials.
