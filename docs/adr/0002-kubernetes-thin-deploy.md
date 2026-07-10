# ADR 0002 — Kubernetes from day one (thin)

## Status

Accepted

## Context

Founder direction: not App Engine; Kubernetes (GKE-class) from the beginning, without over-microservicing.

## Decision

- Target runtime: **one small K8s cluster**.  
- Phase 1 services: at most **voice-gateway**, **orchestrator**, and embed/**web**.  
- Managed Postgres (shared TROZLANIO) + managed Redis.  
- Ingress, secrets, health probes, resource limits, structured logging required.  
- Supply chain: scan + SBOM + sign + admission verify on the deploy path.

## Consequences

- Local dev may use compose or tilt, but **production shape is K8s**.  
- New services require an ADR if they would exceed the thin cap before Phase 1 success criteria are met.
