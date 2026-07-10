# TROZBOT embed — host apps (TROZLANIO path)

Mount the Phase 1 **robot concierge** inside a parent application without rewriting TROZLANIO `GlobalTrozBot`.

| Piece | Location |
|-------|----------|
| Package | `@trozbot/embed` → `packages/embed` |
| API | `mountTrozbot(el, options)` / `handle.destroy()` |
| Local fixture | `pnpm dev:embed` → http://127.0.0.1:8791/ |
| Tools | Still **only** `kb_retrieve` + `create_ticket` (orchestrator policy) |

## Why `packages/embed` (not apps/web mode)

Hosts need a **small import** with testable config + origin allowlist, independent of the full static demo app. `apps/web` stays the standalone robot page; embed is the integration surface for TROZLANIO (or any host).

## Quick start (local fixture)

```bash
# Terminal A — orchestrator
pnpm dev:orchestrator   # :8787

# Terminal B — embed host fixture (loopback bind, /api proxy)
pnpm dev:embed          # :8791
# open http://127.0.0.1:8791/
```

Fixture uses same-origin `/api` → orchestrator proxy (no browser CORS).  
Fixture is **not** production host auth.

## TROZLANIO host (shipped in sibling monorepo)

**Live implementation exists** in MegaPhoenix92/trozlanio (not a “future gateway sketch”).

| Piece | Location (TROZLANIO) |
|-------|----------------------|
| Page | `/dashboard/trozbot/robot-concierge` |
| React shell | `client/src/components/chat/TrozbotRobotConcierge.tsx` |
| **Active** proxy registration | **`server/routes.ts`** → `app.use("/api/trozbot", …)` |
| Not active alone | `server/routes/index.ts` (modular helper; **not** bootstrap) |
| Vendored browser ESM | `client/public/trozbot-embed/trozbot-embed.browser.js` |
| Sync | `scripts/sync-trozbot-embed.sh` (sibling `../trozbot`) |

### Access control (host)

```text
isAuthenticated → requireTrozbotAccess → handler
```

Same TROZBOT rollout policy as `/api/chat` (`TROZBOT_ALPHA` / `BETA` / `GA`).  
Denied (401/403): **no interactive embed mount** (status message only).  
Orchestrator unset/disabled: page may show disabled status; **no** “ready” interactive mount.

### Forwarded Phase 1 paths only

| Method | Path | Notes |
|--------|------|--------|
| GET | `/status` | **Local** host status — **not** forwarded upstream |
| GET | `/health` | Forwarded |
| POST | `/sessions` | Forwarded |
| POST | `/sessions/<uuid>/tools` | Forwarded |

Not a general reverse proxy. Query strings rejected. Path traversal / encoded separators rejected. Upstream redirects refused (`redirect: manual`). Bounded timeout.

### Upstream env

| Env | Rule |
|-----|------|
| `TROZBOT_ORCHESTRATOR_URL` | Environment-only; **origin-root** only (e.g. `http://127.0.0.1:8787`) |
| Remote host | Requires explicit `TROZBOT_ORCHESTRATOR_ALLOW_REMOTE=true` |

### Trusted ticket attribution

On `create_ticket` through the host proxy:

- Caller-supplied `tenantId` / `userId` / forged `sessionId` are **stripped**
- Host injects authenticated TROZLANIO tenant + user (canonical tenant helper)
- Fail closed if identity cannot be resolved  
- Browser cannot choose another tenant’s attribution  

### Local host smoke

```bash
# trozbot
pnpm dev:orchestrator   # :8787

# trozlanio
export TROZBOT_ORCHESTRATOR_URL=http://127.0.0.1:8787
# start platform app; open /dashboard/trozbot/robot-concierge while logged in with rollout access
```

### GlobalTrozBot

**Unchanged.** Legacy GlobalTrozBot remains a separate surface. This path does not replace it.

### Open follow-up

- TROZLANIO **#3486** — P2 host/embed error-code compatibility (until closed).

Evidence level: **HOST-INTEGRATION PROVEN** in sibling (PRs #3479, #3480, #3483, #3485). See [`PHASE1_STATUS.md`](./PHASE1_STATUS.md).

---

## Host snippet (generic package API)

```html
<div id="trozbot-slot"></div>
<script type="module">
  import { mountTrozbot } from "@trozbot/embed";

  const handle = mountTrozbot(document.getElementById("trozbot-slot"), {
    apiProxyPath: "/api/trozbot", // host same-origin proxy
    theme: "dark",
    correlationId: "trozlanio-shell",
    allowedOrigins: [window.location.origin], // never "*"
    onTicketCreated: ({ ticketId, subject }) => {},
    onError: ({ message }) => console.error(message),
  });
</script>
```

### Runtime bootstrap (optional, no secrets)

```html
<script>
  window.__TROZBOT__ = {
    apiProxyPath: "/api/trozbot",
    theme: "default",
    allowedOrigins: [window.location.origin],
  };
</script>
```

## Config fields

| Field | Purpose |
|-------|---------|
| `apiProxyPath` | Same-origin prefix (**preferred**) |
| `orchestratorBaseUrl` | Direct URL; **loopback only** unless `ALLOW_PUBLIC_ORCHESTRATOR=true` |
| `theme` | `default` \| `dark` |
| `allowedOrigins` | Exact parent origins (no wildcards) |
| `correlationId` | Opaque session correlation |
| `isRobot` | Always `true` |

## Origin / messaging safety

- Default allowlist: loopback origins unless `allowedOrigins` lists exact hosts  
- Wildcards (`*`) rejected  
- Prefer DOM mount + callbacks  

## Security checklist

- [ ] Loopback-only local demo binds  
- [ ] No secrets in `window.__TROZBOT__`  
- [ ] Tool allowlist unchanged on orchestrator  
- [ ] Host supplies auth + rollout + TLS in production  
- [ ] `allowedOrigins` lists real app origins only  

## Programmatic handle

```ts
await handle.startSession();
await handle.kbRetrieve("how do I restart the agent?");
await handle.createTicket("Subject", "Body");
handle.setAvatarState("speaking");
handle.destroy();
```

## Related

- Local three-service demo: `docs/DEMO.md`  
- Evidence ledger: `docs/PHASE1_STATUS.md`  
- Blueprint: `docs/PHASE1_BLUEPRINT.md`  
- DO NOTs: `docs/DO_NOT.md`  
