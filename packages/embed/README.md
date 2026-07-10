# @trozbot/embed

Host-facing mount API for the TROZBOT robot shell.

## Why a package

Hosts such as TROZLANIO need a small, versionable import with pure configuration and origin-allowlist units, independent of the full static demo app. `apps/web` remains the standalone text UI; this package is the integration surface.

## API

```ts
import { mountTrozbot } from "@trozbot/embed";

const handle = mountTrozbot(document.getElementById("slot")!, {
  apiProxyPath: "/api/trozbot", // recommended for authenticated production hosts
  // orchestratorBaseUrl: "http://127.0.0.1:8787", // loopback development
  theme: "dark",
  allowedOrigins: ["https://app.example"], // exact origins; never "*"
  onTicketCreated: ({ ticketId }) => {},
});

await handle.startSession();
const kb = await handle.kbRetrieve("how does the goal loop work?");
// Preserves answer, hit, grounded, and sources from the orchestrator.
const ticket = await handle.createTicket("Subject", "Body");

handle.destroy();
```

The package does not reimplement tool policy. The orchestrator allows only `kb_retrieve` and `create_ticket` in Phase 1.

See [`../../docs/EMBED.md`](../../docs/EMBED.md) for host proxy, security, synchronization, and TROZLANIO integration details.

## Local fixture

```bash
# terminal A
pnpm dev:orchestrator

# terminal B
pnpm dev:embed
# open http://127.0.0.1:8791/
```

The full Phase 1 target and current gaps are tracked separately in [`../../docs/STATUS.md`](../../docs/STATUS.md).
