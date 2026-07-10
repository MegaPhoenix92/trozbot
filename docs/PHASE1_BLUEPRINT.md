# TROZBOT Phase 1 Blueprint — Robot Voice Support Concierge

> **Product name:** TROZBOT (TrustBot concierge surface)  
> **Home:** `MegaPhoenix92/trozbot` · local: `TROZLAN/TROZLANIO/trozbot`  
> **Platform core:** TROZLANIO (shared Postgres; not a separate product DB)  
> **Source conversation:** founder voice thread — robot concierge → KB → ticket; K8s from day one; read-then-confirm automation

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

A real user session can:

1. Open the robot concierge (non-human avatar)
2. Speak a software support issue
3. Receive a **helpful answer grounded in the knowledge base**
4. Create a **support ticket** if needed
5. Complete 1–4 in a **single continuous session**
6. Run the slice on the **K8s cluster** with health checks + logging
7. Pass the **security baseline** on images used in that deploy

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

- `AGENTS.md` — single source of truth for every agent
- `docs/AGENTIC_OPERATING_MODEL.md` — loops, lanes, merge gates
- `docs/DO_NOT.md` — hard constraints

**Not Fable-only:** any lineage may build, review, or run a `/goal` lane if it follows `AGENTS.md` and the security merge gate.

---

## Implementation waves (suggested)

| Wave | Outcome |
|------|---------|
| **0 — Repo spine** | Blueprint, AGENTS.md, folder skeleton, CI security stubs, shared-DB ADR |
| **1 — Vertical slice local** | Orchestrator + mock voice path + KB retrieve + create_ticket against shared DB schema |
| **2 — Robot UI** | Avatar states + session wiring in embed host |
| **3 — Real voice gateway** | STT/TTS path; one production-like session |
| **4 — K8s thin deploy** | Deployments, ingress, secrets, probes, logs |
| **5 — Supply chain** | Full scan + SBOM + sign + admission verify green |

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
All agent lineages (claude/fable, codex, grok, hermes) may build/review under AGENTS.md.
Do not invent a separate product DB. Do not over-microservice. Ship the slice.
```
