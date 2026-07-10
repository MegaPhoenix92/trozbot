# TROZBOT Phase 1 Blueprint — Robot Voice Support Concierge

> **Product name:** TROZBOT (TrustBot concierge surface)  
> **Home:** `MegaPhoenix92/trozbot` · local: `TROZLAN/TROZLANIO/trozbot`  
> **Platform core:** TROZLANIO (shared Postgres; not a separate product DB)  
> **Source conversation:** founder voice thread — robot concierge → KB → ticket; K8s from day one; read-then-confirm automation

---

## Current status (read first)

**This document is the product mission and planned architecture.**  
It is **not** the evidence ledger.

| Layer | Where to look |
|-------|----------------|
| **What is proven today** | [`docs/PHASE1_STATUS.md`](./PHASE1_STATUS.md) |
| **How agents run `/goal`** | [`docs/GOAL_LOOP.md`](./GOAL_LOOP.md) |
| **Hard constraints** | [`docs/DO_NOT.md`](./DO_NOT.md) |

Distinguish carefully:

| Term | Meaning |
|------|---------|
| **Planned success criteria** | The seven bullets below — **targets** |
| **Shipped code** | Merged on main (see status ledger) |
| **Local evidence** | Tests / loopback demo |
| **Owner-operated production evidence** | Live DB, cluster, registry, vendor keys |

**As of D1 reconciliation:** Phase 1 **code spine** is shipped with local and host-integration proof on many paths. **Not all** planned success criteria are LIVE/PRODUCTION PROVEN: voice remains a **stub** (not real STT/TTS), live K8s apply is unproven, and cosign/registry/admission remain **owner-blocked**.

---

## Goal (Phase 1)

Ship a **real-time voice support agent** inside the app:

- Clearly **non-human robot character** (approachable, no human masquerade)
- Talks the user through software issues
- Answers from a **knowledge base**
- **Creates a support ticket** when needed
- Runs on a **small Kubernetes cluster** (GKE-class), not App Engine

**First vertical slice (must work end-to-end):**

> Robot pops up → user speaks → helpful KB answer → optional ticket create → one session.

Automation grows under the surface later. Shell first, then safe actions.

---

## Product principles

| Principle | Meaning |
|-----------|---------|
| Robot, not human | Avatar + voice + copy never pretends to be a human agent |
| Vertical slice first | One real path (KB answer + create ticket), not a platform of stubs |
| Read → confirm → act | Phase 1 is read + ticket only; later automations require explicit user confirmation |
| Thin K8s | One small cluster, a few clean services — do not over-microservice |
| Shared data plane | **Same Postgres as TROZLANIO** (schema-namespaced tables). Managed Redis for sessions/cache |
| Security backbone day one | Image scan, SBOM, dependency + secrets + Dockerfile scan; signed images; admission verify signatures |
| Multi-agent product | Built and operated by **all agent lineages** (Claude/Fable, Codex, Grok, Hermes) — not a Fable-only loop |

---

## Phase 1 architecture

```
┌─────────────────────────────────────────────────────────────┐
│  App shell (TROZLANIO / embed host)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Robot UI — idle | listening | thinking | speaking    │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ WebRTC / WS audio + session
                              ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Voice Gateway  │───▶│  AI Orchestrator │───▶│  KB + Ticketing │
│  (live audio)   │    │  (tools + policy)│    │  (TROZLANIO DB) │
└─────────────────┘    └────────┬─────────┘    └─────────────────┘
                                │
                         Redis sessions
                         Postgres (shared)
```

### Core components

| Component | Responsibility | Phase 1 bar |
|-----------|----------------|-------------|
| **Frontend robot** | Avatar states: idle, listening, thinking, speaking; session UX | Visible states + mic; no human face/name |
| **Voice gateway** | Live audio in/out; STT/TTS edge | One duplex path per session |
| **AI orchestrator** | Intent, KB retrieval, tool policy, ticket create | KB answer + `create_ticket` only |
| **Data plane** | Sessions (Redis); durable state + tickets + KB pointers (Postgres shared with TROZLANIO) | Managed Postgres + Redis |
| **K8s deploy** | Ingress, secrets, health checks, resource limits, basic logging | One cluster, few services |

### Out of scope (Phase 1)

- Risky write automations (password resets, billing changes, account deletes)
- Autonomous “fix it for me” without confirmation
- Many microservices / event mesh / multi-cluster
- Human handoff masquerading as the robot
- Separate TROZBOT-only production database (use TROZLANIO shared DB)

---

## Data contract (shared TROZLANIO DB)

**Decision:** TROZBOT does **not** own a greenfield production DB. It uses the **same Postgres as TROZLANIO**, with a dedicated schema (recommended: `trozbot`) and clear ownership of tables.

| Concern | Where |
|---------|--------|
| Users / tenants / auth | TROZLANIO (existing) |
| Tickets | TROZLANIO ticketing surface **or** `trozbot.tickets` linked by `tenant_id` / `user_id` — pick one path in implementation ADR |
| Knowledge base docs / chunks | `trozbot.kb_*` (or existing COM KB if migrated) |
| Voice sessions / tool audit | `trozbot.sessions`, `trozbot.tool_calls` |
| Ephemeral session state | Redis (`trozbot:session:*`) |

Migrations: live in this repo under `apps/orchestrator` (or `packages/db`) but apply to the **shared** cluster/branch with schema isolation. Never invent a second source of truth for users/tenants.

---

## Deployment (Kubernetes from day one)

**Target:** small GKE (or equivalent) cluster.

| Layer | Phase 1 |
|-------|---------|
| Cluster | One small cluster, one primary namespace `trozbot` |
| Workloads | `web` (or embed static), `voice-gateway`, `orchestrator` — start with 2–3 Deployments max |
| Data | Managed Postgres (shared TROZLANIO), managed Redis |
| Ingress | TLS ingress → voice + API paths |
| Secrets | K8s secrets / external secrets; no secrets in git |
| Ops | Health probes, CPU/mem limits, structured logs |

### Security baseline (day one)

Every image push path must include:

1. **Container image scan** (CVE gate)
2. **SBOM** generation
3. **Dependency scan**
4. **Secrets scan**
5. **Dockerfile lint/scan**
6. **Image signing** before registry push
7. **Admission policy**: verify signature; basic deny rules for unsigned / critical CVEs

Start small: CI does scans + sign; cluster enforces verify. Expand policies as services grow.

---

## Success criteria (Phase 1 done when)

> **Target criteria** (not all LIVE/PRODUCTION PROVEN — see [`PHASE1_STATUS.md`](./PHASE1_STATUS.md)).

A real user session can:

1. Open the robot concierge (non-human avatar) — **local + host UI shipped**
2. Speak a software support issue — **stub voice only**; real STT **not shipped**
3. Receive a **helpful answer grounded in the knowledge base** — **local proven** (fixture KB)
4. Create a **support ticket** if needed — **local + host-attribution proven**
5. Complete 1–4 in a **single continuous session** — **local text path proven**; full voice E2E production **not**
6. Run the slice on the **K8s cluster** with health checks + logging — **manifests shipped**; **live apply owner-blocked**
7. Pass the **security baseline** on images used in that deploy — **CI scans/SBOM shipped**; **sign + admission owner-blocked**

---

## Phase 2+ (explicitly later)

- Safe automations with **confirm-to-act** (read-only checks → propose fix → user confirms → execute)
- More tools (status, diagnostics, limited account reads)
- Richer avatar / multi-language
- Scale-out voice + queue workers only when the vertical slice is proven

---

## Multi-agent operating model

TROZBOT is **agentic software** and an **agentic product workspace**:

| Lineage | Default roles |
|---------|----------------|
| **Claude / Fable** | Orchestration, product judgment, consult, review |
| **Codex** | Primary builder (services, K8s, CI) |
| **Grok** | Builder/reviewer (xAI); security-gate eligible with primary-source verify |
| **Hermes** | Builder/reviewer (non-xAI); security-gate eligible |

See:

- `docs/GOAL_LOOP.md` — `/goal` outer/inner doctrine (public)
- `docs/AGENTIC_OPERATING_MODEL.md` — lineages, gates, final review refresh
- `docs/DO_NOT.md` — hard constraints
- `docs/PHASE1_STATUS.md` — current evidence

Local agent overlays may exist in a private checkout; they are not published in this public repo.

**Not Fable-only:** any lineage may build, review, or run a `/goal` lane if it follows the public docs contract and the security merge gate.

---

## Implementation waves (evidence-aware)

| Wave | Planned outcome | Evidence status (see PHASE1_STATUS) |
|------|-----------------|-------------------------------------|
| **0 — Repo spine** | Blueprint, docs, folder skeleton, CI stubs, shared-DB ADR | **SHIPPED** |
| **1 — Vertical slice local** | Orchestrator + KB + create_ticket (+ schema) | **SHIPPED** + **LOCALLY PROVEN** (Postgres optional) |
| **2 — Robot UI** | Avatar states + session wire | **SHIPPED** + **LOCALLY PROVEN** |
| **3 — Voice gateway** | STT/TTS path | **SHIPPED as stub** — **NOT** real STT/TTS |
| **4 — K8s thin deploy** | Deployments, probes, limits | **Manifests SHIPPED**; live cluster **OWNER-BLOCKED** |
| **5 — Supply chain** | Scan + SBOM + sign + admission | **CI scan/SBOM SHIPPED**; sign/registry/admission **OWNER-BLOCKED** |
| **Host embed** | TROZLANIO mount + proxy | **HOST-INTEGRATION PROVEN** (sibling monorepo) |

Stop and reassess after Wave 1–2 if the shell feels wrong; expand automation only after the shell is good.

---

## Name & placement (locked from thread)

| Decision | Choice |
|----------|--------|
| Platform core | **TROZLANIO** |
| Product / repo | **TROZBOT** (TrustBot concierge) |
| Repo | Public: `https://github.com/MegaPhoenix92/trozbot` |
| DB | **Shared with TROZLANIO** (schema-isolated), not a separate product DB |
| Runtime | **Kubernetes** from the beginning (disciplined, thin) |

---

## Agent copy-paste brief (Phase 1)

```text
Product: TROZBOT — robot voice support concierge on TROZLANIO.
Phase 1 vertical slice: robot UI states + voice gateway + AI orchestrator +
KB answers + create_ticket, single session, non-human character only.
Deploy: thin K8s (GKE-class), managed Redis, SHARED Postgres with TROZLANIO
(schema trozbot). Security day one: image/dep/secrets/Dockerfile scan, SBOM,
signed images, admission verify. No risky automation; read-only + ticket only.
All agent lineages (claude/fable, codex, grok, hermes) may build/review under docs/GOAL_LOOP.md + AGENTIC_OPERATING_MODEL.
Do not invent a separate product DB. Do not over-microservice. Ship the slice.
Current evidence: docs/PHASE1_STATUS.md (do not claim production voice/cluster without proof).
```
