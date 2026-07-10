# ADR 0001 — Shared TROZLANIO Postgres

## Status

Accepted (founder direction, voice thread correction)

## Context

TROZBOT needs durable state (sessions audit, KB, tickets). A separate product database would split identity and ops from TROZLANIO.

## Decision

TROZBOT uses the **same Postgres as TROZLANIO**, with schema isolation (`trozbot` preferred). Redis remains TROZBOT-scoped (managed Redis) for ephemeral session/cache.

## Consequences

- Migrations must be safe on a shared cluster (expand-only, careful locks).  
- Connection secrets align with TROZLANIO env conventions.  
- Users/tenants are not duplicated.  
- Ticket storage either links to existing TROZLANIO ticketing or lives in `trozbot.*` with foreign keys to platform identity — choose in a follow-up ADR before Wave 1 schema lands.
