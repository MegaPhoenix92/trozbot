# TROZBOT migrations (shared TROZLANIO Postgres)

## Rules

- **Shared DB only** — apply against the TROZLANIO Postgres cluster/branch, not a second product database.
- **Schema** — all objects live under `trozbot`.
- **Expand-only** — `CREATE … IF NOT EXISTS` only. No `DROP`, no destructive `ALTER`, no data rewrites in Wave 1.
- **No secrets** — never commit `DATABASE_URL` or connection strings. Use local env / TROZLANIO conventions.

## Files

| File | Purpose |
|------|---------|
| `001_trozbot_schema.sql` | `trozbot` schema, `tickets`, `tool_calls` (+ indexes) |

## Apply (when you have a URL)

```bash
# Export from your TROZLANIO secret store — do not paste into git/issues.
export DATABASE_URL="postgresql://..."   # local/dev branch only in Wave 1

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f apps/orchestrator/migrations/001_trozbot_schema.sql
```

## Dry-run without a live database

Wave 1 acceptance does **not** require live Postgres. Validate migration artifacts:

```bash
pnpm --filter @trozbot/orchestrator migrate:dry-run
```

This checks that SQL files exist, target schema `trozbot`, are expand-only (no DROP/TRUNCATE), and declare `tickets` + `tool_calls`. If `DATABASE_URL` is unset, live apply is **skipped** and reported — that is expected for local CI without shared-DB credentials.

## Wave 1 ticket path without DB

The orchestrator uses an in-memory ticket store by default so `create_ticket` is testable without credentials. When a real `DATABASE_URL` is wired later, the same schema is ready for a Postgres-backed writer (follow-up; not required to merge Wave 1).
