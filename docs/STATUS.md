# TROZBOT implementation status

**Last reconciled:** July 10, 2026  
**Standalone repository baseline:** `MegaPhoenix92/trozbot` after host documentation PR #15  
**TROZLANIO host baseline:** PR #3480, merge `5753c06d095bbfb7c4b6c6c0fe187c5aabafa87d`

This document separates two facts that must not be blurred:

1. **The Phase 1 code spine exists.** Waves 1–5, hardening, the embed package, and the TROZLANIO host surface have implementation artifacts.
2. **The full Phase 1 acceptance target is not complete.** Several production behaviors remain stubbed, optional, unproven on live infrastructure, or blocked on owner access.

## Current system shape

```text
TROZLANIO protected page
  → authenticated same-origin /api/trozbot proxy
  → standalone TROZBOT orchestrator
  → fixture KB + create_ticket policy

Standalone optional paths:
  apps/web text UI
  apps/voice-gateway stub STT/TTS
  deploy/k8s manifests
```

The host proxy is now registered through the active `server/routes.ts` bootstrap in TROZLANIO. Its Phase 1 upstream contract accepts an origin-root `TROZBOT_ORCHESTRATOR_URL` only; redirects are refused and requests are time-bounded.

## Delivery matrix

| Slice | What is implemented | What is not yet proven or complete |
|-------|----------------------|------------------------------------|
| **Wave 0 — repo spine** | Workspace, blueprint, hard constraints, ADRs, CI skeleton | Public agent instructions must rely on tracked docs because local `AGENTS.md`-style files are intentionally untracked |
| **Wave 1 — orchestrator** | Session API, fixture KB retrieval, tool policy, `create_ticket`, migrations, memory/optional Postgres stores | Sessions are in memory; no Redis store; shared production DB path has no repository-recorded live acceptance evidence |
| **Wave 2 — robot UI** | Non-human avatar, state transitions, text KB and ticket flow | No microphone capture or real spoken turn in `apps/web` / embed |
| **Wave 3 — voice gateway** | Session pipeline and deterministic stub STT/TTS | No concrete live STT/TTS vendor adapter; live-media mode intentionally refuses to boot |
| **Wave 4 — K8s** | Thin manifests, probes, limits, secret references, client-side validation | No repository-recorded live cluster deployment or ingress smoke |
| **Wave 5 — supply chain** | Secrets scan, dependency audit, Dockerfile lint, filesystem SBOM, image build, Trivy scan | No registry push, image signature, or cluster admission verification |
| **Hardening** | Loopback bind guard, optional Postgres tickets/audit, honest KB misses, UI error/no-hit states | Local demo remains unauthenticated by design |
| **Embed package** | `mountTrozbot`, destroy handle, exact origin allowlist, same-origin proxy mode, fixture host | Host identity is not propagated into standalone `tenantId` / `userId` ticket fields |
| **TROZLANIO host** | Protected page, vendored ESM, authenticated proxy, SSRF/redirect/timeout guards, B1 live-wire test | Production deployment and identity propagation remain separate work |

## Phase 1 success criteria

The blueprint defines Phase 1 as complete only when a real user can satisfy all seven outcomes.

| # | Criterion | Current evidence | Verdict |
|---|-----------|------------------|---------|
| 1 | Open a clearly non-human robot concierge | Standalone UI, embed, and protected TROZLANIO page exist | **Code-complete** |
| 2 | Speak a software support issue | Voice gateway is stubbed; no real microphone/STT path | **Not complete** |
| 3 | Receive a KB-grounded answer | Automated and local fixture flows prove hit/miss behavior | **Locally proven** |
| 4 | Create a support ticket | Memory path and optional Postgres implementation exist | **Locally proven; production durability unproven** |
| 5 | Complete 1–4 in one continuous session | Text and stub-media flows exist | **Partial; real voice not proven** |
| 6 | Run on K8s with health checks and logging | Manifests validate client-side | **Not deployed/proven** |
| 7 | Pass security baseline on deployed images | Scans and SBOM run on CI image path | **Signing/admission not complete** |

**Phase 1 acceptance verdict: not complete.** Do not mark the product production-ready from the existence of Waves 1–5 alone.

## Data and identity truth

- `InMemorySessionStore` is the active session implementation. Redis is a target, not current behavior.
- Tickets and tool-call audit are in memory unless `DATABASE_URL` is set.
- The schema is designed for the shared TROZLANIO Postgres data plane; do not create a separate production database.
- `tenantId` and `userId` are optional tool inputs, but the current TROZLANIO host proxy does not forward a trusted identity contract into the standalone orchestrator.
- Raw audio/PII must not be logged without a retention and redaction policy.

## Owner-gated dependencies

The following cannot be completed honestly without owner-provided access or decisions:

- live TROZLANIO database URL and migration/smoke window;
- vendor STT/TTS selection and keys;
- GKE or equivalent cluster access;
- image registry target and credentials;
- cosign key material or keyless workload identity;
- admission-controller selection and installation;
- production DNS/TLS and rollout approval.

Agents must report these blockers and stop. They must not invent credentials or silently weaken security controls.

## Next-task policy

After each merge:

1. inspect the real code and runtime evidence;
2. close remediation before unrelated expansion;
3. choose one smallest high-value gap;
4. issue one bounded goal and pull request;
5. require cross-review for security-shaped work;
6. stop unless the outer goal explicitly authorizes another wave.

Likely Phase 1 closure lanes are live voice, Redis sessions, trusted host identity propagation, live shared-DB validation, live cluster deployment, and signed/admitted images. Their order must be assigned explicitly; none starts automatically.

Phase 2 confirm-to-act tools remain out of scope until the owner changes the outer mission.
