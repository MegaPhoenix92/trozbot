# packages/core — Shared contracts

Zod/types for sessions, avatar state, tools (`kb_retrieve`, `create_ticket`), and tool invoke envelopes.

## Phase 1 tools only

| Tool | Mode | Purpose |
|------|------|---------|
| `kb_retrieve` | read | Knowledge-base answer grounded in sources |
| `create_ticket` | write | Create a support ticket |

Policy helpers: `PHASE1_TOOL_NAMES`, `isAllowedPhase1Tool`.

## Avatar states

`idle` · `listening` · `thinking` · `speaking` — robot presentation only (no human masquerade).

## Scripts

```bash
pnpm --filter @trozbot/core test
pnpm --filter @trozbot/core typecheck
pnpm --filter @trozbot/core build
```

**Status:** Wave 1 contracts + unit tests.
