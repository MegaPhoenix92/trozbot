# TROZBOT — DO NOT list

Hard constraints for every agent lineage (Claude/Fable, Codex, Grok, Hermes, humans).

## Product

1. **Do not** make the robot appear human (name, face, “I’m a support rep”).
2. **Do not** ship Phase 1 write automations beyond **create ticket** (and KB read).
3. **Do not** execute account/billing/infra changes without explicit user confirmation (Phase 2+ only).
4. **Do not** block the vertical slice waiting for a perfect multi-agent platform.

## Data

5. **Do not** create a separate production Postgres for TROZBOT — **share TROZLANIO DB**, schema-isolate (`trozbot` schema preferred).
6. **Do not** duplicate users/tenants/auth tables; join/reference TROZLANIO identity.
7. **Do not** put secrets, connection strings, or prod dumps in git.

## Architecture

8. **Do not** start on App Engine as the primary runtime — **Kubernetes** is the target.
9. **Do not** explode into many microservices before the vertical slice works (cap Phase 1 at ~3 services).
10. **Do not** add event buses, multi-cluster, or service mesh “for later” in Phase 1.

## Security / supply chain

11. **Do not** push unsigned images to the deploy registry path.
12. **Do not** skip image/dep/secrets/Dockerfile scans or SBOM on the release path.
13. **Do not** weaken admission policy “just to get green” without owner sign-off.
14. **Do not** log raw audio/PII without retention + redaction policy.

## Multi-agent process

15. **Do not** treat this as a Fable-only loop — all lineages share the public docs contract (`docs/GOAL_LOOP.md`, `docs/AGENTIC_OPERATING_MODEL.md`, this file).
16. **Do not** let the builder self-approve security-shape PRs (auth, tickets, data access, K8s RBAC, signing).
17. **Do not** merge security-shape changes without ≥2 non-builder lineage reviews + primary-source verify of the load-bearing change.
18. **Do not** force-push `main` or rewrite published history without owner approval.
