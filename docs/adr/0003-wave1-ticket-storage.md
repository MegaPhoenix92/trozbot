# ADR 0003 — Wave 1 ticket storage in `trozbot.tickets`

## Status

Accepted (Wave 1 vertical slice); trust-boundary clarification added during reconciliation.

## Context

ADR 0001 requires choosing ticket storage before the Wave 1 schema lands: either link to existing TROZLANIO ticketing or store in `trozbot.*` with references to platform identity, without duplicating users or tenants.

Wave 1 must ship expand-only migrations and a local runnable `create_ticket` path without inventing production credentials or a second product database.

## Decision

1. **Store tickets in schema `trozbot`** (`trozbot.tickets`), not a separate Postgres product.
2. **Reference TROZLANIO identity by opaque IDs** — nullable `tenant_id` and `user_id` columns. Do not copy users/tenants tables into this repo.
3. **No hard foreign keys in Wave 1** — TROZLANIO identity table/schema names are platform-owned and may differ by environment. Indexes on `tenant_id` / `user_id` support future verified joins.
4. **Session correlation** — `session_id` links the ticket to the robot session that created it and is required by the application layer.
5. **Runtime without `DATABASE_URL`** — an in-memory ticket store implements the same shape for local tests; durable writes use the shared schema when Postgres is wired.
6. **Identity trust boundary** — `tenantId` and `userId` are server-established context, not authoritative tool input. The orchestrator must ignore caller-supplied identity values. A future authenticated TROZLANIO adapter may populate the internal trusted context only after verifying the host session/tenant.

## Consequences

- The migration ships identity hooks (columns + indexes), not a second identity system.
- Local and current host-proxy calls leave tenant/user IDs absent until a trusted propagation contract is implemented.
- A client cannot select another tenant/user by placing identity fields in the `create_ticket` JSON body.
- The public HTTP path does not invent authentication or identity headers.
- A later ADR may define verified host identity propagation, tighten foreign keys, or switch to TROZLANIO’s native ticketing surface. That is explicit expand/migrate work, not a product database split.

## Decision addendum (host channel)

**TrustedToolContext over HTTP** is populated only via host service-token headers
(`X-Trozbot-Host-Token`, `X-Trozbot-Tenant-Id`, `X-Trozbot-User-Id`) when
`TROZBOT_HOST_SERVICE_TOKEN` matches. Client-supplied trust headers without a
valid secret are rejected. Tool body `tenantId`/`userId` remain non-authoritative.

