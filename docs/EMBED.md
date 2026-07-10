# TROZBOT embed — host applications

Mount the clearly non-human TROZBOT support shell inside a parent application without rewriting the legacy TROZLANCOM `GlobalTrozBot` surface.

| Piece | Location |
|-------|----------|
| Package | `@trozbot/embed` → `packages/embed` |
| API | `mountTrozbot(el, options)` / `handle.destroy()` |
| Local fixture | `pnpm dev:embed` → `http://127.0.0.1:8791/` |
| Phase 1 tools | `kb_retrieve` + `create_ticket` only |
| TROZLANIO host | `/dashboard/trozbot/robot-concierge` |
| Host proxy | Authenticated `/api/trozbot/*` |

The embed is an integration shell, not a second policy engine. The standalone orchestrator remains authoritative for the tool allowlist and KB/ticket behavior.

## Why `packages/embed`

Hosts need a small, versionable import with testable configuration and origin rules, independent of the full static demo app. `apps/web` remains the standalone text UI; `packages/embed` is the host integration surface.

## Local fixture

```bash
# Terminal A — standalone orchestrator
pnpm dev:orchestrator   # http://127.0.0.1:8787

# Terminal B — fixture host with same-origin /api proxy
pnpm dev:embed          # http://127.0.0.1:8791
```

The fixture proxies `/api/*` to the loopback orchestrator, so browser CORS is not required.

## Host snippet

```html
<div id="trozbot-slot"></div>
<script type="module">
  import { mountTrozbot } from "@trozbot/embed";

  const handle = mountTrozbot(document.getElementById("trozbot-slot"), {
    // Recommended for production hosts: same-origin authenticated proxy.
    apiProxyPath: "/api/trozbot",

    // Direct URL is for loopback development only.
    // orchestratorBaseUrl: "http://127.0.0.1:8787",

    theme: "dark",
    correlationId: "trozlanio-shell",

    // Exact parent origins only; never "*".
    allowedOrigins: ["https://app.trozlan.io"],

    onTicketCreated: ({ ticketId, subject }) => {
      console.info("ticket created", { ticketId, subject });
    },
    onError: ({ message }) => console.error(message),
    onAvatarState: (state) => {
      // idle | listening | thinking | speaking
    },
  });

  // Later:
  // handle.destroy();
</script>
```

## Runtime bootstrap

Hosts may provide non-secret defaults before loading the bundle:

```html
<script>
  window.__TROZBOT__ = {
    apiProxyPath: "/api/trozbot",
    theme: "default",
    allowedOrigins: ["https://app.trozlan.io"],
  };
</script>
```

Explicit `mountTrozbot` options override bootstrap values.

## Configuration

| Field | Purpose |
|-------|---------|
| `apiProxyPath` | Same-origin API prefix; recommended for authenticated production hosts |
| `orchestratorBaseUrl` | Direct orchestrator URL; loopback only unless `ALLOW_PUBLIC_ORCHESTRATOR=true` in the bundle runtime |
| `theme` | `default` or `dark` |
| `allowedOrigins` | Exact origins for accepted `postMessage` parents; no wildcards |
| `correlationId` | Opaque session correlation value |
| `isRobot` | Always `true`; non-human branding is enforced |
| `fetchImpl` | Test injection |
| `onTicketCreated` | Host callback after ticket creation |
| `onError` | Host callback for surfaced errors |
| `onAvatarState` | Host callback for avatar-state changes |

Resolved branding is `TROZBOT robot concierge`. Avatar states are `idle`, `listening`, `thinking`, and `speaking`.

## Programmatic handle

```ts
const session = await handle.startSession();

const kb = await handle.kbRetrieve("how does the goal build loop work?");
// kb.answer
// kb.hit
// kb.grounded
// kb.sources

if (!kb.hit) {
  // Honest miss: grounded=false and sources=[]
}

const ticket = await handle.createTicket("Subject", "Body");
handle.setAvatarState("speaking");
handle.destroy();
```

`kbRetrieve()` returns the orchestrator's complete grounded-result contract. It does not convert a KB miss into `grounded: true`.

## Origin and messaging safety

- Default parent allowlist permits loopback origins only.
- Wildcards and empty origins are rejected at configuration time.
- `apiProxyPath` must be a same-origin path, never an absolute or protocol-relative URL.
- Parent→child message `{ type: "trozbot:setAvatarState", state: "thinking" }` is ignored unless `event.origin` is allowed.
- Direct DOM mount plus callbacks is preferred.
- The optional iframe contract documents parent→child state messages only; Phase 1 emits no child→parent `postMessage` events.

## TROZLANIO production shape

```text
Browser
  → protected /dashboard/trozbot/robot-concierge
  → authenticated /api/trozbot/*
  → origin-root TROZBOT_ORCHESTRATOR_URL
  → standalone orchestrator
```

The host:

- keeps browser cookies/session on the TROZLANIO origin;
- protects the page through existing TROZLANIO auth;
- does not implement OAuth/SSO inside the embed;
- does not expose the standalone orchestrator through wildcard CORS;
- does not change the legacy `GlobalTrozBot` surface.

## TROZLANIO host implementation

The sibling `MegaPhoenix92/trozlanio` repository contains:

| Piece | TROZLANIO location |
|-------|--------------------|
| Protected page | `/dashboard/trozbot/robot-concierge` |
| React shell | `client/src/components/chat/TrozbotRobotConcierge.tsx` |
| Active proxy registration | `server/routes.ts` → `app.use("/api/trozbot", trozbotEmbedProxyRouter)` |
| Proxy implementation | `server/routes/trozbot-embed-proxy.ts` |
| Vendored browser ESM | `client/public/trozbot-embed/trozbot-embed.browser.js` |
| Source metadata | `client/public/trozbot-embed/VERSION.txt` |
| Sync script | `scripts/sync-trozbot-embed.sh` |

PR #3479 added the host surface. PR #3480 corrected the live-wire defect by mounting the proxy through the `server/routes.ts` registry actually imported by `server/index.ts`.

`server/routes/index.ts` is not the active application bootstrap and must not become a second source of truth for `/api/trozbot`.

## Host environment contract

```bash
# Required to enable tools. Phase 1 Contract A: origin-root URL only.
TROZBOT_ORCHESTRATOR_URL=http://127.0.0.1:8787

# Optional bounded upstream timeout; default 15000 ms, maximum 120000 ms.
TROZBOT_UPSTREAM_TIMEOUT_MS=15000

# Required only for a non-loopback upstream.
# TROZBOT_ORCHESTRATOR_ALLOW_REMOTE=true
```

A value such as `https://orchestrator.example.com/prefix` is rejected. Use an origin-root URL such as `https://orchestrator.example.com` and configure the reverse proxy/routing outside the Phase 1 upstream value.

The proxy refuses upstream redirects, rejects traversal/backslash/protocol-relative paths, and forwards only to the fixed configured origin.

## Local TROZLANIO host smoke

```bash
# trozbot
pnpm dev:orchestrator

# trozlanio
export TROZBOT_ORCHESTRATOR_URL=http://127.0.0.1:8787
# start TROZLANIO, authenticate, then open:
# /dashboard/trozbot/robot-concierge
```

Verify:

1. `GET /api/trozbot/status` reports `enabled: true` and `basePathContract: "origin-root-only"`.
2. Start session succeeds.
3. KB hit returns `hit: true`, `grounded: true`, and a real source.
4. KB miss returns `hit: false`, `grounded: false`, and `sources: []`.
5. `create_ticket` returns an open ticket.
6. A disallowed tool remains `403 TOOL_NOT_ALLOWED`.

## Bundle synchronization

From the TROZLANIO repository with the standalone repo checked out as a sibling:

```bash
scripts/sync-trozbot-embed.sh
```

The script rebuilds `@trozbot/embed`, copies the browser ESM, and records the source SHA in `VERSION.txt`. Review the vendored diff before merge.

## Known limitations

- `apps/web` and the embed provide a text interaction path; there is no real microphone/live speech turn yet.
- The voice gateway uses stub STT/TTS unless a future concrete vendor adapter is implemented.
- Standalone sessions are in memory; Redis is not yet active.
- Tickets/audit are in memory unless the standalone orchestrator receives a valid shared `DATABASE_URL`.
- TROZLANIO authentication protects the proxy, but trusted tenant/user identity is not yet propagated into the standalone ticket context.
- Live GKE, registry push, signing, and admission verification remain owner-gated.
- Phase 2 confirm-to-act tools are out of scope.

See [`STATUS.md`](./STATUS.md) for the complete acceptance matrix.

## Related

- [`DEMO.md`](./DEMO.md) — local standalone walkthrough
- [`PHASE1_BLUEPRINT.md`](./PHASE1_BLUEPRINT.md) — target and acceptance criteria
- [`STATUS.md`](./STATUS.md) — reconciled current truth
- [`GOAL_LOOP.md`](./GOAL_LOOP.md) — agent delivery lifecycle
- [`DO_NOT.md`](./DO_NOT.md) — hard constraints
