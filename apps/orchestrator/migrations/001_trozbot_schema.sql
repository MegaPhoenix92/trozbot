-- Wave 1 expand-only migration for shared TROZLANIO Postgres.
-- Safe to re-run: uses IF NOT EXISTS only (no drops, no renames, no destructive alters).
-- Schema isolation: trozbot.* — does not touch TROZLANIO identity tables.
--
-- Apply (when DATABASE_URL is available):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/orchestrator/migrations/001_trozbot_schema.sql
-- Or:
--   pnpm --filter @trozbot/orchestrator migrate:dry-run   # syntax/structure check without DB
--
-- Do NOT commit connection strings. Prefer TROZLANIO env conventions for the shared URL.

CREATE SCHEMA IF NOT EXISTS trozbot;

-- Support tickets created by the robot concierge (Phase 1 write tool).
CREATE TABLE IF NOT EXISTS trozbot.tickets (
  id            UUID PRIMARY KEY,
  session_id    UUID,
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_session_id_idx
  ON trozbot.tickets (session_id);

CREATE INDEX IF NOT EXISTS tickets_created_at_idx
  ON trozbot.tickets (created_at DESC);

-- Tool invocation audit trail (kb_retrieve + create_ticket + denied attempts).
CREATE TABLE IF NOT EXISTS trozbot.tool_calls (
  id            UUID PRIMARY KEY,
  session_id    UUID,
  tool_name     TEXT NOT NULL,
  input_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_json   JSONB,
  status        TEXT NOT NULL,
  error_code    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tool_calls_session_id_idx
  ON trozbot.tool_calls (session_id);

CREATE INDEX IF NOT EXISTS tool_calls_created_at_idx
  ON trozbot.tool_calls (created_at DESC);

CREATE INDEX IF NOT EXISTS tool_calls_tool_name_idx
  ON trozbot.tool_calls (tool_name);
