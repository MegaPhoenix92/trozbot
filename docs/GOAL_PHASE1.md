# HISTORICAL OUTER GOAL — PHASE 1 CODE-SPINE BUILD

> **Status:** Complete as a **code-spine** outer goal.  
> **Do not** instruct a new agent to rebuild Waves 1–5 from scratch.  
> **Start from:** current `origin/main` + [`docs/PHASE1_STATUS.md`](./PHASE1_STATUS.md).  
> **How work runs:** [`docs/GOAL_LOOP.md`](./GOAL_LOOP.md).

---

## Completion summary

| Item | Result |
|------|--------|
| Waves 1–5 code spine | Merged on main |
| Hardening | Bind guard, DB-optional, KB miss honesty |
| Embed package | `@trozbot/embed` + fixture host |
| TROZLANIO host (sibling) | Page + `/api/trozbot` proxy; B1 live-wire; B2 rollout; B3 trusted attribution |
| Local demo | Documented in `docs/DEMO.md` |

### Current owner blockers (not “re-run Wave 5”)

- Real STT/TTS vendor keys and product adapter  
- Live GKE apply / gcloud auth  
- Registry push, cosign production signing, admission verify  
- Production shared TROZLANIO `DATABASE_URL`  

### Open related work (sibling)

- TROZLANIO **#3486** — P2 host/embed error-code compatibility (separate lane)  
- D2 — TROZLANIO documentation issue **#3487** (authorized after D1 only)

Future goals begin from **current main**, skip completed waves, and use the evidence ledger.

---

## Archive boundary — original outer goal text (historical)

Copy-into-`/goal` draft used for the multi-agent Phase 1 build. Kept for history.

### Goal (historical)

Ship TROZBOT Phase 1 vertical slice per `docs/PHASE1_BLUEPRINT.md`: robot voice support concierge — KB answers + create_ticket, single session, thin Kubernetes, shared TROZLANIO Postgres, security baseline path.

### Scope (historical, in)

- Wave 0 done (repo spine) → execute Waves 1–5 as ordered in the blueprint  
- `apps/orchestrator`, `apps/voice-gateway`, `apps/web`, `packages/core`, `deploy/k8s`  
- Schema `trozbot` on **shared** TROZLANIO DB (ADR 0001)  
- CI supply-chain stub → real scans/sign when images exist  

### DO-NOT (historical)

Follow `docs/DO_NOT.md` in full. Especially:

- No separate product Postgres  
- No human masquerade  
- No write tools beyond create_ticket in Phase 1  
- No over-microservice  
- No Fable-only process — all lineages share the public docs contract  
- Security-shape: ≥2 non-builder lineage reviews  

### Acceptance (historical target)

Blueprint success criteria section — seven bullets. **Today:** not all LIVE/PRODUCTION PROVEN; see `PHASE1_STATUS.md`.

### Review gate (still in force)

Every PR: tests/lint as available; security-shape PRs need ≥2 non-builder of {claude, codex, grok, hermes} + primary-source verify.

### STOP (historical)

When Phase 1 success criteria met, or blocked on owner decision (prod DB access, cluster provisioning, vendor STT/TTS keys). Surface blockers; do not invent credentials.

**D1+ STOP:** do not re-open Waves 1–5 as if incomplete without reading the evidence ledger.
