# @trozbot/embed

Host-facing mount API for the TROZBOT robot shell (Phase 1).

## Why a package (not apps/web embed mode)

Hosts (TROZLANIO) need a **small, versionable import** with pure config/allowlist
units and no coupling to the full web static app. `apps/web` remains the
standalone demo UI; this package is the integration surface.

## API

```ts
import { mountTrozbot } from "@trozbot/embed";

const handle = mountTrozbot(document.getElementById("slot")!, {
  apiProxyPath: "/api", // recommended for production hosts
  // orchestratorBaseUrl: "http://127.0.0.1:8787", // loopback only unless ALLOW_PUBLIC_ORCHESTRATOR
  theme: "dark",
  allowedOrigins: ["https://app.example"], // never "*"
  onTicketCreated: ({ ticketId }) => {},
});

handle.destroy();
```

See `docs/EMBED.md` at repo root.

## Local fixture

```bash
# terminal A
pnpm dev:orchestrator
# terminal B
pnpm dev:embed
# open http://127.0.0.1:8791/
```
