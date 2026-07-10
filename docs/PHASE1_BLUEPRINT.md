# TROZBOT Phase 1 blueprint — robot voice support concierge

> **Product:** TROZBOT (TrustBot concierge surface)  
> **Home:** `MegaPhoenix92/trozbot` · local: `TROZLAN/TROZLANIO/trozbot`  
> **Platform core:** TROZLANIO  
> **Data decision:** shared TROZLANIO Postgres, schema-isolated; never a separate product database  
> **Runtime target:** thin Kubernetes  
> **Current evidence:** [`STATUS.md`](./STATUS.md)

## How to read this document

This blueprint defines the **target and acceptance contract**. It is not a claim that every row is already live in production.

As of July 10, 2026:

- Waves 1–5 have code artifacts;
- hardening, the embed package, and the TROZLANIO host surface exist;
- TROZLANIO PR #3480 live-wired the host proxy through the active route registry;
- real voice, Redis sessions, live shared-DB proof, live cluster deployment, image signing, and admission verification remain incomplete or owner-gated.

Use [`STATUS.md`](./STATUS.md) for the evidence-backed current state. A manifest, stub, or optional code path does not satisfy a production acceptance criterion by itself.

---

## Goal

Ship a real-time voice support agent inside TROZLANIO:

- a clearly **non-human robot character**;
- spoken support for software issues;
- answers grounded in a knowledge base;
- support-ticket creation when needed;
- one continuous session;
- a small Kubernetes deployment;
- a release path with image scanning, SBOM, signing, and admission verification.

**Required vertical slice:**

> Robot opens → user speaks → helpful KB answer → optional ticket creation → one continuous session on the deployed path.

Automation grows later. Phase 1 is support guidance plus ticket creation—not autonomous account or infrastructure modification.

---

## Product principles

| Principle | Meaning |
|-----------|---------|
| **Robot, not human** | Avatar, voice, and copy never pretend to be a human agent |
| **Vertical slice first** | One real end-to-end path, not a platform made only of stubs |
| **Read → confirm → act** | Phase 1 reads KB content and may create a ticket; later risky actions require explicit confirmation |
| **Thin K8s** | One small cluster and a few clean workloads; no premature service mesh or event platform |
| **Shared data plane** | Reuse TROZLANIO Postgres with schema isolation; Redis is the target for ephemeral sessions/cache |
| **Security backbone** | Scan, SBOM, sign, and verify images used by the deployment |
| **Multi-lineage delivery** | Claude/Fable, Codex, Grok, and Hermes operate under the same tracked contract |
| **Evidence over labels** | “Wave shipped” means code exists; “Phase 1 accepted” means the deployed behavior is proven |

---

## Target architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ TROZLANIO app shell / authenticated embed host              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Robot UI — idle | listening | thinking | speaking    │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ real-time audio + session
                              ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Voice Gateway   │───▶│ AI Orchestrator  │───▶│ KB + Ticketing  │
│ STT / TTS edge  │    │ tools + policy   │    │ shared DB       │
└─────────────────┘    └────────┬─────────┘    └─────────────────┘
                                │
                         Redis sessions
                         shared Postgres
```

### Current baseline

The current host path is narrower:

```text
TROZLANIO protected page or standalone text UI
  → authenticated same-origin proxy or direct loopback
  → TROZBOT orchestrator
  → fixture KB + create_ticket
  → in-memory sessions
  → in-memory tickets/audit or optional Postgres
```

The current voice gateway uses deterministic stub STT/TTS. See [`STATUS.md`](./STATUS.md) before assigning the next closure task.

---

## Core components

| Component | Phase 1 target | Current evidence |
|-----------|----------------|------------------|
| **Frontend robot** | Non-human avatar, visible states, microphone/session UX | Avatar and text session flow exist; microphone/live spoken flow is open |
| **Voice gateway** | One duplex live audio path per session | Session pipeline exists; STT/TTS are stubbed |
| **AI orchestrator** | KB retrieval, tool policy, `create_ticket` only | Implemented locally with honest hit/miss behavior |
| **Data plane** | Redis sessions; durable tickets/audit/KB pointers on shared Postgres | Sessions are in memory; tickets/audit are memory or optional Postgres |
| **Host integration** | Protected TROZLANIO page and same-origin authenticated proxy | Implemented and live-wired by TROZLANIO PR #3480 |
| **K8s deployment** | Ingress, secrets, probes, limits, structured logging | Manifests and client-side validation exist; live deploy is unproven |
| **Supply chain** | Scan, SBOM, registry push, sign, admission verify | Scans/SBOM/image build exist; push/sign/admission are open |

---

## Out of scope for Phase 1

- password resets, billing changes, account deletion, or other risky write automations;
- autonomous “fix it for me” actions without explicit confirmation;
- many microservices, event mesh, service mesh, multi-cluster, or speculative scale-out;
- a human agent masquerading as the robot;
- a separate TROZBOT-only production database;
- Phase 2 confirm-to-act tools unless the owner explicitly changes the outer mission.

---

## Shared data contract

TROZBOT does not own a greenfield production database. It uses the same Postgres data plane as TROZLANIO with a dedicated schema, recommended name `trozbot`.

| Concern | Target location | Current state |
|---------|-----------------|---------------|
| Users / tenants / auth | TROZLANIO identity system | Host page is protected; trusted identity is not yet propagated into standalone tool context |
| Tickets | TROZLANIO ticketing surface or `trozbot.tickets` linked by tenant/user IDs | `trozbot.tickets` migration and optional store exist |
| Knowledge base | `trozbot.kb_*` or an explicitly migrated existing KB | Fixture file is current retrieval source |
| Voice sessions | Redis plus optional durable audit | Active sessions use `InMemorySessionStore` |
| Tool audit | `trozbot.tool_calls` | Memory or optional Postgres store |

Migrations live in this repository but apply to the **shared** TROZLANIO database with schema isolation. Never duplicate user, tenant, or auth tables.

### Identity rule

`tenantId` and `userId` may only come from a trusted host/server identity contract. Do not accept client-supplied identity as authoritative. Until that contract is implemented, record the limitation honestly.

---

## Deployment target

| Layer | Phase 1 target | Current evidence |
|-------|----------------|------------------|
| Cluster | One small GKE-class cluster, namespace `trozbot` | Owner-gated; no live smoke recorded |
| Workloads | Web/embed static surface, voice gateway, orchestrator | Manifests exist for a thin service set |
| Data | Shared managed Postgres + managed Redis | Access/configuration owner-gated |
| Ingress | TLS paths to voice and API | Manifest path exists; live ingress unproven |
| Secrets | K8s/external secrets only | Secret references exist; no secrets in Git |
| Operations | Health probes, CPU/memory limits, structured logs | Manifest and service logging foundations exist |

Kubernetes “from day one” means the architecture and manifests are designed for K8s. It does not mean a client-side dry-run is equivalent to a live deployment.

---

## Security baseline

Every image used in the deployed path must have:

1. container image CVE scan;
2. SBOM generation;
3. dependency scan;
4. secrets scan;
5. Dockerfile lint/scan;
6. image signing before registry use;
7. admission verification that denies unsigned images and enforces agreed vulnerability policy.

Current CI implements scans, filesystem SBOM, image build, and Trivy. Registry push, signing identity, and admission-controller installation remain owner-gated. See [`SUPPLY_CHAIN.md`](./SUPPLY_CHAIN.md).

Do not weaken the admission target merely to make a deployment green.

---

## Phase 1 success criteria

Phase 1 is accepted only when a real user can:

1. open the clearly non-human robot concierge;
2. **speak** a software support issue;
3. receive a helpful answer grounded in the knowledge base;
4. create a support ticket if needed;
5. complete steps 1–4 in one continuous session;
6. run that slice on Kubernetes with health checks and logging;
7. pass the security baseline on the images used in that deployment.

The current verdict for each item is maintained in [`STATUS.md`](./STATUS.md). At the time of this reconciliation, the seven-item set is not fully accepted.

---

## Phase 2 and later

Explicitly later:

- safe automations with confirm-to-act;
- more read tools for status and diagnostics;
- limited account reads under a trusted identity contract;
- richer avatar and multilingual support;
- queue workers and scale-out only after the vertical slice is proven.

No Phase 2 task self-starts from a Phase 1 merge.

---

## Agentic operating model

Tracked public contracts:

- [`GOAL_LOOP.md`](./GOAL_LOOP.md) — outer/inner goals, evidence, review, merge, STOP;
- [`AGENTIC_OPERATING_MODEL.md`](./AGENTIC_OPERATING_MODEL.md) — lineages and lane defaults;
- [`STATUS.md`](./STATUS.md) — current truth;
- [`DO_NOT.md`](./DO_NOT.md) — hard boundaries.

Any active lineage may build, review, or orchestrate. The builder receives zero review votes. Security-shaped changes require at least two non-builder approvals and primary-source verification.

Local `AGENTS.md`-style files may exist but are intentionally untracked; they may not override these public contracts.

---

## Delivery waves

| Wave | Target outcome | Reconciled state |
|------|----------------|------------------|
| **0 — repo spine** | Blueprint, contracts, folders, ADRs, CI skeleton | Complete |
| **1 — local vertical slice** | Orchestrator, KB, `create_ticket`, schema | Code-complete locally; live shared-DB proof open |
| **2 — robot UI** | Avatar states and session wiring | Text path complete; mic/live spoken UX open |
| **3 — real voice gateway** | Production-like STT/TTS session | Stub pipeline complete; real media open |
| **4 — thin K8s deploy** | Live workloads, ingress, secrets, probes, logs | Manifests complete; live deployment open |
| **5 — supply chain** | Scan, SBOM, sign, admission verify | Scan/SBOM partial complete; sign/admission open |
| **Host** | Protected TROZLANIO mount and authenticated proxy | Complete locally after PR #3480 |

Historical wave code should not be rebuilt without a confirmed defect. Future goals select a remaining acceptance gap from [`STATUS.md`](./STATUS.md).

---

## Locked name and placement

| Decision | Choice |
|----------|--------|
| Platform core | **TROZLANIO** |
| Product / repository | **TROZBOT** |
| Public repo | `https://github.com/MegaPhoenix92/trozbot` |
| Database | Shared TROZLANIO Postgres, schema-isolated |
| Runtime target | Thin Kubernetes |
| Host route | `/dashboard/trozbot/robot-concierge` |
| Host proxy | Authenticated `/api/trozbot/*` |

---

## Copy-ready agent brief

```text
Product: TROZBOT — a clearly non-human robot support concierge hosted by TROZLANIO.

Read docs/STATUS.md before work. The Waves 1–5 code spine and host mount exist,
but Phase 1 is not fully accepted. Select only the explicitly assigned remaining
gap. Keep tools limited to kb_retrieve + create_ticket. Use the shared TROZLANIO
Postgres data plane; do not create a separate product DB. Real voice, Redis,
identity propagation, live K8s, signing, and admission are closure lanes, not
assumed facts. Builder gets zero review votes. Security-shaped changes require
at least two non-builder approvals and primary-source verification. Open one PR,
prove the behavior, then STOP unless the outer goal explicitly authorizes chaining.
```
