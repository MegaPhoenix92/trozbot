# TROZBOT Phase 1 — Current evidence ledger

**Canonical current-state truth for this repository.**  
Plans and historical goals live elsewhere; this file answers: *what exists, what was proven, what is blocked.*

| State | Meaning |
|-------|---------|
| **SHIPPED CODE** | Merged on `main` in this repo (or named sibling) |
| **LOCALLY PROVEN** | Automated test and/or documented local demo smoke |
| **HOST-INTEGRATION PROVEN** | Proven through TROZLANIO host path (auth + proxy + page) with tests/PRs |
| **LIVE / PRODUCTION PROVEN** | Running on a real shared/prod path with owner credentials/cluster |
| **OWNER-BLOCKED** | Code or docs ready; needs owner keys, DB URL, cluster, or registry |
| **NOT SHIPPED** | Explicitly out of Phase 1 code spine or not implemented |

Never collapse **SHIPPED CODE** with **LIVE / PRODUCTION PROVEN**.

Last reconciled: 2026-07-10 (D1 truth + `/goal` loop docs).

---

## Product invariants (always true)

| Fact | Source |
|------|--------|
| Clearly **non-human** robot concierge | Blueprint, UI, embed |
| Phase 1 tools **only** `kb_retrieve` + `create_ticket` | Orchestrator policy |
| No confirm-to-act / risky write automations in Phase 1 | `docs/DO_NOT.md` |
| **GlobalTrozBot** (TROZLANIO legacy) was **not** replaced | Host PRs #3479+ |

---

## Evidence table

| Capability | State | Evidence / path | Limitation / next owner dependency |
|------------|-------|-----------------|--------------------------------------|
| Orchestrator HTTP service | **SHIPPED CODE** + **LOCALLY PROVEN** | `apps/orchestrator`; `/health`; unit/flow tests | Not a multi-region prod service |
| Session lifecycle | **SHIPPED CODE** + **LOCALLY PROVEN** | `POST /sessions`; flow tests | Durable session store optional |
| KB hit | **SHIPPED CODE** + **LOCALLY PROVEN** | `fixtures/kb.json`; `kb-retrieve.test.ts`; flow | Fixture KB, not production corpus |
| Honest KB miss | **SHIPPED CODE** + **LOCALLY PROVEN** | `hit:false`, empty sources; tests | — |
| create_ticket | **SHIPPED CODE** + **LOCALLY PROVEN** | Tool policy + ticket store; flow tests | Attribution trusted only via **host** rewrite |
| In-memory persistence | **SHIPPED CODE** + **LOCALLY PROVEN** | Default when `DATABASE_URL` unset | Lost on process restart |
| Shared Postgres path | **SHIPPED CODE** + **LOCALLY PROVEN** (optional) | `migrations/`, `pg-store`, migrate apply when URL set | **LIVE/PROD** needs owner TROZLANIO `DATABASE_URL` |
| Robot UI (`apps/web`) | **SHIPPED CODE** + **LOCALLY PROVEN** | Avatar states; same-origin `/api` proxy | Local demo **unauthenticated**, loopback |
| Standalone embed package | **SHIPPED CODE** + **LOCALLY PROVEN** | `packages/embed`; fixture `:8791` | Fixture host ≠ production host |
| TROZLANIO host page | **SHIPPED CODE** + **HOST-INTEGRATION PROVEN** | TROZLANIO `/dashboard/trozbot/robot-concierge` | Sibling monorepo MegaPhoenix92/trozlanio |
| Authenticated host proxy | **SHIPPED CODE** + **HOST-INTEGRATION PROVEN** | TROZLANIO `/api/trozbot` in **`server/routes.ts`** (not `routes/index.ts`) | Needs orchestrator URL env |
| Rollout gate | **SHIPPED CODE** + **HOST-INTEGRATION PROVEN** | `isAuthenticated` → `requireTrozbotAccess` | Same TROZBOT_ALPHA/BETA/GA as `/api/chat` |
| Trusted ticket attribution | **SHIPPED CODE** + **HOST-INTEGRATION PROVEN** | Host rewrites `create_ticket` with server tenant/user | Orchestrator alone still accepts optional IDs if exposed directly |
| Narrow host path allowlist | **SHIPPED CODE** + **HOST-INTEGRATION PROVEN** | GET `/health`, POST `/sessions`, POST `/sessions/<uuid>/tools`; local GET `/status` | Not a general reverse proxy |
| Voice gateway stub | **SHIPPED CODE** + **LOCALLY PROVEN** | `apps/voice-gateway` stub STT/TTS | **NOT** real STT/TTS |
| Real STT/TTS | **NOT SHIPPED** + **OWNER-BLOCKED** | — | Vendor keys + adapter productization |
| K8s manifests | **SHIPPED CODE** + **LOCALLY PROVEN** (client kustomize) | `deploy/k8s` | **LIVE cluster apply unproven** |
| Live K8s deployment | **OWNER-BLOCKED** / **NOT** production-proven | Manifests only | gcloud auth, cluster, secrets |
| Security scans (CI) | **SHIPPED CODE** + **LOCALLY PROVEN** (CI) | gitleaks, audit, hadolint, trivy path | — |
| SBOM | **SHIPPED CODE** + **LOCALLY PROVEN** (CI) | Syft path in security-baseline | — |
| Image registry push | **OWNER-BLOCKED** | Docs in `SUPPLY_CHAIN.md` | Registry credentials + push path |
| Cosign signing | **OWNER-BLOCKED** | Documented owner gap | Cosign keys + policy |
| Admission verification | **OWNER-BLOCKED** | Documented owner gap | Cluster admission install |
| Open P2 host/embed codes | **HOST-INTEGRATION** partial | TROZLANIO **#3486** | Compatibility until merged/closed |

---

## TROZLANIO host contract (summary)

| Item | Value |
|------|--------|
| Page | `/dashboard/trozbot/robot-concierge` |
| Proxy | `/api/trozbot` → `TROZBOT_ORCHESTRATOR_URL` |
| Active registry | TROZLANIO **`server/routes.ts`** (not `server/routes/index.ts`) |
| Auth | `isAuthenticated` → `requireTrozbotAccess` |
| Forwarded paths | `GET /health`, `POST /sessions`, `POST /sessions/<uuid>/tools` |
| Local (not forwarded) | `GET /status` |
| Upstream URL | Env-only, **origin-root**; remote needs explicit allow |
| Ticket identity | Server-derived tenant/user; never browser-chosen |
| UI gate | No interactive embed when denied or orchestrator disabled |

Merged host waves (sibling): #3479, #3480, #3483, #3485.

---

## What “Phase 1 code spine shipped” means

**Means:** vertical local slice, embed package, thin K8s manifests, supply-chain CI path, and TROZLANIO host integration code exist with tests.

**Does not mean:** production voice, live cluster, signed registry deploy, or production shared-DB without owner access.

See also: [`PHASE1_BLUEPRINT.md`](./PHASE1_BLUEPRINT.md) (mission + planned criteria), [`GOAL_LOOP.md`](./GOAL_LOOP.md) (how work is run), [`SUPPLY_CHAIN.md`](./SUPPLY_CHAIN.md) (owner gaps).
