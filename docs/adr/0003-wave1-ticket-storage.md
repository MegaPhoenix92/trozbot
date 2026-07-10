# ADR 0003 — Wave 1 ticket storage in `trozbot.tickets`

## Status

Accepted (Wave 1 vertical slice)

## Context

ADR 0001 requires choosing ticket storage before Wave 1 schema lands: either link to existing TROZLANIO ticketing **or** store in `trozbot.*` with references to platform identity (no duplicated users/tenants).

Wave 1 must ship expand-only migrations and a local runnable `create_ticket` path without inventing prod credentials or a second product database.

## Decision

1. **Store tickets in schema `trozbot`** (`trozbot.tickets`), not a separate Postgres product.
2. **Reference TROZLANIO identity by opaque ids** — columns `tenant_id` and `user_id` (TEXT, nullable in Wave 1). Do **not** copy users/tenants tables into this repo.
3. **No hard foreign keys in Wave 1** — TROZLANIO identity table/schema names are platform-owned and may differ by environment; FKs would couple migrations unsafely. Indexes on `tenant_id` / `user_id` support joins once the platform path is confirmed.
4. **Session correlation** — `session_id` links the ticket to the robot session that created it (app-layer required on create).
5. **Runtime without `DATABASE_URL`** — in-memory ticket store implements the same shape for local tests; durable write uses this schema when Postgres is wired (follow-up).

## Consequences

- Expand-only migration ships with identity *hooks* (columns + indexes), not a second identity system.
- A later ADR may tighten FKs or switch to TROZLANIO’s native ticketing surface; that is expand/migrate work, not a product DB split.
- Orchestrator may accept optional `tenantId` / `userId` on `create_ticket` as it gains auth context; Wave 1 local slice may leave them null.
