# Current agent handoff (2026-07-11)

**STOP discipline:** this document is pickup context, not authorization to deploy.

## Done (merged)

| Repo | Item | Merge SHA |
|------|------|-----------|
| trozbot | #28 host service-token → TrustedToolContext | `c67719a11eb3540381b454b12fd836d0243474d2` |
| TROZLANIO | #3495 host trust headers (soft-skip if token unset) | `8ae2ef0a87a7f896810517c89e74ff7c76c39a23` |
| TROZLANIO | #3494 production preflight **HOLD** | `b22d7f2f…` |
| trozbot | #24 body IDs non-authoritative | earlier |

## Contract

```text
Auth host → session identity → X-Trozbot-Host-Token/Tenant/User
  → TrustedToolContext → durable ticket IDs
Body spoof → ignored
Bad/missing host token on orchestrator → 401 (if headers present)
```

Host follow-up (if landed): create_ticket without host token → **503** fail-closed; body has no tenant/user.

Env (both sides, never commit values): `TROZBOT_HOST_SERVICE_TOKEN`

## STOP / production HOLD

Do **not** auto-start: Slice A, registry/cosign/K8s apply, real STT/TTS, Phase 2 tools, prod flag rollout.

Owner still must set matching tokens, DB, image, cluster, cohort.

## Next pickups (need new owner `/goal`)

1. Land residual host strict headers PR if open (body non-authoritative + 503 when token unset).
2. Runtime token wiring (ops only; no secrets in git).
3. Owner-authorized Slice A only after preflight decision table.

## Canonical paths

- trozbot: `apps/orchestrator/src/host-trust.ts`, `server.ts`
- host: `server/routes/trozbot-embed-proxy.ts`
- truth ledger: `docs/PHASE1_STATUS.md`
- production: TROZLANIO `docs/TROZBOT_PRODUCTION_PREFLIGHT_REPORT.md` (**HOLD**)
