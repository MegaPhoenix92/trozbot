# apps/orchestrator — AI orchestration (Wave 1)

Phase 1 tools only:

1. Knowledge-base retrieve (read) — fixture/file-backed
2. `create_ticket` (write) — in-memory store when `DATABASE_URL` is unset

Policy: no risky automations. Session store is in-memory (Redis-ready interface later). Ticket + tool audit map to `trozbot.tickets` / `trozbot.tool_calls` migrations.

## HTTP

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | `{ ok: true, service, wave }` |
| `POST` | `/sessions` | Start session (`correlationId` optional) |
| `POST` | `/sessions/:id/tools` | Invoke tool under policy |

## Local run

From repo root (after `pnpm install`):

```bash
pnpm build
pnpm dev:orchestrator
# → GET http://127.0.0.1:8787/health
```

## Tests

```bash
pnpm --filter @trozbot/orchestrator test
pnpm --filter @trozbot/orchestrator migrate:dry-run
```

## Migrations

See [`migrations/README.md`](./migrations/README.md). Live apply requires `DATABASE_URL` (shared TROZLANIO Postgres). Without it, dry-run validates expand-only SQL and skips apply.

**Status:** Wave 1 local vertical slice.
