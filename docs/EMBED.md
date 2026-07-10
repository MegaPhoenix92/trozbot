# TROZBOT embed — host apps (TROZLANIO path)

Mount the Phase 1 **robot concierge** inside a parent application without rewriting TROZLANCOM `GlobalTrozBot`.

| Piece | Location |
|-------|----------|
| Package | `@trozbot/embed` → `packages/embed` |
| API | `mountTrozbot(el, options)` / `handle.destroy()` |
| Local fixture | `pnpm dev:embed` → http://127.0.0.1:8791/ |
| Tools | Still **only** `kb_retrieve` + `create_ticket` (orchestrator policy) |

## Why `packages/embed` (not apps/web mode)

Hosts need a **small import** with testable config + origin allowlist, independent of the full static demo app. `apps/web` stays the standalone robot page; embed is the integration surface for TROZLANIO (or any host).

## Quick start (local)

```bash
# Terminal A — orchestrator
pnpm dev:orchestrator   # :8787

# Terminal B — embed host fixture (loopback bind, /api proxy)
pnpm dev:embed          # :8791
# open http://127.0.0.1:8791/
```

Fixture uses same-origin `/api` → orchestrator proxy (no browser CORS).

## Host snippet

```html
<div id="trozbot-slot"></div>
<script type="module">
  import { mountTrozbot } from "@trozbot/embed";
  // or serve packages/embed/dist from your static CDN / reverse proxy

  const handle = mountTrozbot(document.getElementById("trozbot-slot"), {
    // Production: same-origin proxy path (recommended)
    apiProxyPath: "/api/trozbot", // your host rewrites this to orchestrator

    // Local only alternative (loopback):
    // orchestratorBaseUrl: "http://127.0.0.1:8787",

    theme: "dark", // or "default"
    correlationId: "trozlanio-shell",

    // postMessage parents (never "*")
    allowedOrigins: ["https://app.trozlan.io"],

    onTicketCreated: ({ ticketId, subject }) => {
      /* host analytics / toast */
    },
    onError: ({ message }) => console.error(message),
    onAvatarState: (state) => { /* idle|listening|thinking|speaking */ },
  });

  // later
  // handle.destroy();
</script>
```

### Runtime bootstrap (optional, no secrets)

```html
<script>
  window.__TROZBOT__ = {
    apiProxyPath: "/api/trozbot",
    theme: "default",
    allowedOrigins: ["https://app.trozlan.io"],
  };
</script>
```

Merged under explicit `mountTrozbot` options (options win).

## Config fields

| Field | Purpose |
|-------|---------|
| `apiProxyPath` | Same-origin prefix; host proxies to orchestrator (**preferred**) |
| `orchestratorBaseUrl` | Direct URL; **loopback only** unless `ALLOW_PUBLIC_ORCHESTRATOR=true` |
| `theme` | `default` \| `dark` |
| `allowedOrigins` | Exact parent origins for `postMessage` (no wildcards) |
| `correlationId` | Opaque session correlation string |
| `isRobot` | Always `true` — non-human branding enforced |
| `fetchImpl` | Test injection |

Resolved branding: `identityLabel: "TROZBOT robot concierge"`, avatar states `idle|listening|thinking|speaking`.

## Origin / messaging safety

- **Default deny-wide-open:** only `http(s)://127.0.0.1`, `localhost`, `[::1]` (any port) unless `allowedOrigins` lists exact production hosts.
- Wildcards (`*`) and empty origins are **rejected** at config time.
- Optional parent→child message: `{ type: "trozbot:setAvatarState", state: "thinking" }` — ignored if `event.origin` fails allowlist.
- Prefer **direct DOM mount** + callbacks (`onTicketCreated`, `onError`). Iframe is optional; `buildIframePostMessageContract()` documents parent→child only in Phase 1 (no child→parent events emitted yet). If iframe: host origin must be on allowlist; never `*`.
- `apiProxyPath` must be a **path** (`/api/...`), never an absolute URL.

## Host reverse-proxy (TROZLANIO)

Example shape (not a monorepo PR — implement in your gateway):

```
Browser  →  https://app.trozlan.io/api/trozbot/*  →  trozbot-orchestrator:8787/*
Browser  →  static embed bundle from your CDN or /assets/trozbot-embed/
```

- Keep cookies / session on the **host** origin.
- **Production auth:** put the page that mounts TROZBOT behind existing TROZLANIO auth. The embed **does not** implement SSO/OAuth.
- Do not expose orchestrator with wide-open CORS to the public internet.

## CORS notes

| Mode | CORS |
|------|------|
| `apiProxyPath` same-origin | None required |
| Direct `orchestratorBaseUrl` | Orchestrator must allow the host origin (not configured for wildcards in Phase 1) |

## Security checklist

- [ ] Loopback-only local demo binds (see Phase 1 hardening)
- [ ] No secrets in `window.__TROZBOT__` or embed options
- [ ] Tool allowlist unchanged on orchestrator
- [ ] Production host supplies auth + TLS
- [ ] `allowedOrigins` lists real app origins only

## Programmatic handle

```ts
await handle.startSession();
await handle.kbRetrieve("how do I restart the agent?");
await handle.createTicket("Subject", "Body");
handle.setAvatarState("speaking");
handle.destroy();
```

## TROZLANIO host mount (sibling monorepo)

When product is ready, the **host** lives in MegaPhoenix92/trozlanio (not this package):

| Piece | Location (TROZLANIO) |
|-------|----------------------|
| Page | `/dashboard/trozbot/robot-concierge` |
| React shell | `client/src/components/chat/TrozbotRobotConcierge.tsx` |
| Same-origin proxy | `/api/trozbot/*` → `TROZBOT_ORCHESTRATOR_URL` (auth required) |
| Vendored browser ESM | `client/public/trozbot-embed/trozbot-embed.browser.js` |
| Sync | `scripts/sync-trozbot-embed.sh` (expects sibling `../trozbot`) |

Local host smoke:

```bash
# trozbot
pnpm dev:orchestrator   # :8787

# trozlanio
export TROZBOT_ORCHESTRATOR_URL=http://127.0.0.1:8787
# start app as usual, open /dashboard/trozbot/robot-concierge (authenticated)
```

**Do not rewrite** legacy `GlobalTrozBot` as part of embed adoption unless product explicitly migrates.

## Related

- Local three-service demo: `docs/DEMO.md`
- Blueprint: `docs/PHASE1_BLUEPRINT.md`
- DO NOTs: `docs/DO_NOT.md`
