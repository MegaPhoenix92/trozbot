# TROZBOT

TROZLAN AI chat assistant — global widget, admin, greetings, KPIs, and agent tooling.

## Status

**Local scaffold only.** This is a standalone product repo under the TROZLANIO portfolio. GitHub remote not created yet.

Prior implementation and docs still live inside **TROZLANCOM** (widget, APIs, migrations, admin). This repo is the intended home for extraction / standalone product work.

## Intended layout (TBD)

```
trozbot/
  apps/          # web widget, admin, API
  packages/      # shared types / SDK
  docs/          # product + ops docs
```

## Related

| Location | What |
|----------|------|
| `TROZLANCOM` | Current embedded implementation (`GlobalTrozBot`, `server/api/trozbot-*`, migrations) |
| `botsentinel` | TROZLBOT Sentinel (related security/compliance lane) |
| GitHub | Not published yet — create `MegaPhoenix92/trozbot` when ready |

## Local path

```text
/Users/chrisozsvath/Projects/TROZLAN/TROZLANIO/trozbot
```

## Next steps

1. Decide extract vs greenfield vs thin wrapper around TROZLANCOM surfaces.
2. Scaffold apps/packages when stack is locked.
3. `gh repo create MegaPhoenix92/trozbot --private --source=. --remote=origin` (when ready to publish).
