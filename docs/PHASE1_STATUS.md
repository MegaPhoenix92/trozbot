# TROZBOT Phase 1 — current evidence ledger

**Canonical current-state truth for this repository.** Plans and historical goals live elsewhere; this file answers: *what exists, what was proven, what is blocked.*

| State | Meaning |
|---|---|
| **SHIPPED CODE** | Merged on `main` in this repo or the named sibling |
| **LOCALLY PROVEN** | Automated test and/or documented local smoke |
| **HOST-INTEGRATION PROVEN** | Proven through the TROZLANIO host path with source/tests/PRs |
| **LIVE / PRODUCTION PROVEN** | Running on a real shared production path with owner credentials/cluster |
| **OWNER-BLOCKED** | Code/docs ready; owner keys, DB, cluster, registry, or approval required |
| **NOT SHIPPED** | Explicitly later or not implemented |

Never collapse **SHIPPED CODE** or production-config tests into **LIVE / PRODUCTION PROVEN**.

**Last reconciled:** 2026-07-11 after TROZLANIO host PRs #3479, #3480, #3483, #3485, #3489, and #3490.

---

## Product invariants

| Fact | Source |
|---|---|
| Clearly **non-human** robot concierge | Blueprint, UI, embed |
| Phase 1 tools only `kb_retrieve` + `create_ticket` | Orchestrator tool policy |
| No confirm-to-act / risky automations in Phase 1 | `docs/DO_NOT.md` |
| TROZLANIO legacy **GlobalTrozBot was not replaced** | Host integration PRs/docs |

---

## Evidence table

| Capability | State | Evidence / path | Limitation / next owner dependency |
|---|---|---|---|
| Orchestrator HTTP service | **SHIPPED CODE** + **LOCALLY PROVEN** | `apps/orchestrator`; `/health`; unit/flow tests | Not a multi-region live service |
| Session lifecycle | **SHIPPED CODE** + **LOCALLY PROVEN** | `POST /sessions`; flow tests | Durable session store optional |
| KB hit | **SHIPPED CODE** + **LOCALLY PROVEN** | `fixtures/kb.json`; `kb-retrieve.test.ts`; flow | Fixture KB, not production corpus |
| Honest KB miss | **SHIPPED CODE** + **LOCALLY PROVEN** | `hit:false`, `grounded:false`, empty sources | — |
| `create_ticket` | **SHIPPED CODE** + **LOCALLY PROVEN** | Tool policy + ticket stores + flow tests | IDs only from `TrustedToolContext` (#24); HTTP host channel (#27) populates context when `TROZBOT_HOST_SERVICE_TOKEN` verifies |
| In-memory persistence | **SHIPPED CODE** + **LOCALLY PROVEN** | Default when `DATABASE_URL` unset | Lost on process restart |
| Shared Postgres path | **SHIPPED CODE** + **LOCALLY PROVEN** (optional) | migrations, `pg-store`, apply path | **LIVE/PROD** requires owner TROZLANIO `DATABASE_URL`, migration apply, and DB smoke |
| Robot UI (`apps/web`) | **SHIPPED CODE** + **LOCALLY PROVEN** | Avatar states; same-origin local proxy | Local demo unauthenticated and loopback-only |
| Standalone embed package | **SHIPPED CODE** + **LOCALLY PROVEN** | `packages/embed`; fixture `:8791` | Fixture host is not production auth |
| TROZLANIO host page | **SHIPPED CODE** + **HOST-INTEGRATION PROVEN** | `/dashboard/trozbot/robot-concierge`; #3479 | Sibling monorepo |
| Active authenticated host proxy | **SHIPPED CODE** + **HOST-INTEGRATION PROVEN** | `/api/trozbot` mounted in TROZLANIO `server/routes.ts`; #3480 | Needs reviewed upstream env |
| Rollout gate + narrow routes | **SHIPPED CODE** + **HOST-INTEGRATION PROVEN** | `isAuthenticated` -> `requireTrozbotAccess`; #3483 | `godfather` is force-allowed by current host policy |
| Trusted ticket attribution | **SHIPPED CODE** + **LOCALLY PROVEN** end-to-end channel (#24+#27) | Body never authoritative; host sends `X-Trozbot-Host-Token` + tenant/user after auth; forged headers fail closed | Host TROZLANIO must set matching `TROZBOT_HOST_SERVICE_TOKEN` and send headers; do not expose orchestrator to browsers |
| Canonical host/embed tool errors | **SHIPPED CODE** + **LOCALLY PROVEN** | #3489; only `TOOL_NOT_ALLOWED`, `INVALID_INPUT`, `SESSION_NOT_FOUND`, `TOOL_FAILED` | Compatibility proof, not live deployment proof |
| Production 5xx tool-envelope preservation | **SHIPPED CODE** + **LOCALLY PROVEN** under production middleware stack | #3490; server-only marker + strict bounded envelope | Ordinary/unmarked production 5xx remains generically sanitized |
| Voice gateway stub | **SHIPPED CODE** + **LOCALLY PROVEN** | `apps/voice-gateway` stub STT/TTS | **NOT** real STT/TTS |
| Real STT/TTS | **NOT SHIPPED** + **OWNER-BLOCKED** | — | Provider adapter, vendor selection, credentials, retention policy |
| K8s manifests | **SHIPPED CODE** + **LOCALLY PROVEN** (client validation) | `deploy/k8s` | Live standalone cluster apply unproven |
| Live standalone K8s deployment | **OWNER-BLOCKED** / not production-proven | manifests only | Cluster auth, image, secrets, operator evidence |
| Security scans | **SHIPPED CODE** + **LOCALLY PROVEN** in CI | gitleaks, audit, hadolint, trivy path | — |
| SBOM | **SHIPPED CODE** + **LOCALLY PROVEN** in CI | Syft path | — |
| Image registry push | **OWNER-BLOCKED** | `docs/SUPPLY_CHAIN.md` | Registry credentials and immutable push evidence |
| Cosign signing | **OWNER-BLOCKED** | documented release gap | Signing keys/identity and policy |
| Admission verification | **OWNER-BLOCKED** | documented release gap | Cluster admission installation/enforcement |

---

## TROZLANIO host contract

| Item | Current contract |
|---|---|
| Page | `/dashboard/trozbot/robot-concierge` |
| Proxy | `/api/trozbot` -> environment-only `TROZBOT_ORCHESTRATOR_URL` |
| Active registry | TROZLANIO `server/routes.ts`, not `server/routes/index.ts` alone |
| Auth | `isAuthenticated` -> `requireTrozbotAccess` |
| Forwarded paths | `GET /health`, `POST /sessions`, `POST /sessions/<uuid>/tools` |
| Local-only path | `GET /status` |
| Upstream | origin-root only; non-loopback requires explicit allow |
| Ticket identity | host channel headers + `TrustedToolContext`; body IDs never authoritative |
| Tool errors | canonical four-code embed schema; bounded production 5xx preservation |
| UI | no interactive mount when denied or disabled |

Merged host waves: **#3479, #3480, #3483, #3485, #3489, #3490**.

Canonical step-by-step production handoff (TROZLANIO):  
[TROZBOT production runbook](https://github.com/MegaPhoenix92/trozlanio/blob/main/docs/TROZBOT_PRODUCTION_RUNBOOK.md)  
(landed via TROZLANIO [#3492](https://github.com/MegaPhoenix92/trozlanio/pull/3492); path resolves on TROZLANIO `main`).

That runbook covers backup/migrations, secrets, image evidence, standalone deploy, host canary-to-production rollout, staged access, authenticated smoke, observability, rollback, and release evidence. Its existence does not mean those owner-operated production steps have already run.

---

## What “Phase 1 code spine shipped” means

**Means:** local vertical slice, embed package, thin K8s manifests, supply-chain CI path, and hardened TROZLANIO host integration exist with tests.

**Does not mean:** real production voice, live standalone cluster, signed registry release, enforced signature admission, or production shared-DB operation without owner evidence.

See also:

- [`HANDOFF_CURRENT.md`](./HANDOFF_CURRENT.md) — agent pickup / STOP / next goals
- [`PHASE1_BLUEPRINT.md`](./PHASE1_BLUEPRINT.md) — mission and planned criteria
- [`GOAL_LOOP.md`](./GOAL_LOOP.md) — how issue/build/review/merge/STOP work
- [`EMBED.md`](./EMBED.md) — host contract
- [`SUPPLY_CHAIN.md`](./SUPPLY_CHAIN.md) — owner-gated release security
