# TROZBOT embed — host applications

Mount the Phase 1 **robot concierge** inside a parent application without rewriting TROZLANIO legacy `GlobalTrozBot`.

| Piece | Location |
|---|---|
| Package | `@trozbot/embed` -> `packages/embed` |
| API | `mountTrozbot(el, options)` / `handle.destroy()` |
| Local fixture | `pnpm dev:embed` -> `http://127.0.0.1:8791/` |
| Tools | only `kb_retrieve` + `create_ticket` |
| Current evidence | [`PHASE1_STATUS.md`](./PHASE1_STATUS.md) |
| Production handoff | [TROZBOT production runbook](https://github.com/MegaPhoenix92/trozlanio/blob/main/docs/TROZBOT_PRODUCTION_RUNBOOK.md) |

> **Merge-order gate for this docs PR:** TROZLANIO PR [#3492](https://github.com/MegaPhoenix92/trozlanio/pull/3492) must merge first so the canonical `main`-branch runbook link resolves before this PR lands.

## Why `packages/embed`

Hosts need a small import with testable configuration and an exact origin allowlist, independent of the full standalone demo app. `apps/web` remains the standalone robot page; `packages/embed` is the host integration surface.

---

## Local fixture

```bash
# Terminal A — orchestrator
pnpm dev:orchestrator   # :8787

# Terminal B — embed fixture host
pnpm dev:embed          # :8791
# open http://127.0.0.1:8791/
```

The fixture uses a same-origin `/api` proxy to the orchestrator. It is loopback-only and is **not** production authentication, rollout control, or live-cluster proof.

---

## TROZLANIO host implementation

The host exists in the sibling `MegaPhoenix92/trozlanio` repository.

| Piece | TROZLANIO location |
|---|---|
| Page | `/dashboard/trozbot/robot-concierge` |
| React shell | `client/src/components/chat/TrozbotRobotConcierge.tsx` |
| Active proxy registration | `server/routes.ts` -> `/api/trozbot` |
| Proxy implementation | `server/routes/trozbot-embed-proxy.ts` |
| Production 5xx sanitizer | `server/middleware/safe-error-response.ts` |
| Vendored ESM | `client/public/trozbot-embed/trozbot-embed.browser.js` |
| Provenance | `client/public/trozbot-embed/VERSION.txt` |
| Sync | `scripts/sync-trozbot-embed.sh` from sibling `../trozbot` |

`server/routes/index.ts` is not the primary production bootstrap registry. Host PR #3480 moved the live mount into `server/routes.ts`.

### Access chain

```text
isAuthenticated -> requireTrozbotAccess -> explicit route handler
```

The host uses global `TROZBOT_ALPHA`, `TROZBOT_BETA`, and `TROZBOT_GA` rollout policy. The current host also force-allows the elevated `godfather` role.

- 401/403: interactive embed is not mounted.
- Orchestrator unset/disabled: status only; no ready robot.
- Disabling ordinary-user rollout flags does not fully block force-allowed `godfather`; a complete shutdown requires host-upstream disablement or deployment rollback.

### Forwarded Phase 1 paths

| Method | Host path | Upstream behavior |
|---|---|---|
| GET | `/api/trozbot/status` | local host status; not forwarded |
| GET | `/api/trozbot/health` | -> `/health` |
| POST | `/api/trozbot/sessions` | -> `/sessions` |
| POST | `/api/trozbot/sessions/<uuid>/tools` | -> path-matched tool endpoint |

The host rejects:

- unsupported methods and paths;
- query strings;
- absolute or protocol-relative paths;
- traversal and encoded separators;
- non-root upstream base paths;
- upstream redirects.

The host upstream is set only by environment. Non-loopback origins, including Kubernetes Service DNS, require `TROZBOT_ORCHESTRATOR_ALLOW_REMOTE=true`.

### Trusted `create_ticket` identity

Through the host proxy:

- caller `tenantId`, `userId`, and forged `sessionId` are removed;
- `sessionId` comes from the validated path;
- tenant and user come from authenticated TROZLANIO server context;
- missing trusted context fails closed before fetch;
- `kb_retrieve` does not inherit forged identity fields.

The standalone orchestrator should not be exposed directly to browsers as a substitute for this host trust boundary.

### Tool error compatibility

Host-generated tool failures use only the codes accepted by the shipped embed schema:

- `TOOL_NOT_ALLOWED`
- `INVALID_INPUT`
- `SESSION_NOT_FOUND`
- `TOOL_FAILED`

TROZLANIO PR #3489 shipped the mapping. PR #3490 completed the production path: the global production 5xx sanitizer preserves a tool-error body only when both a response-local server Symbol is set and a strict bounded envelope validator passes.

This production-stack proof covers upstream unset, redirect refusal, timeout, and connection failure. Unrelated or unmarked production 5xx responses remain generically sanitized with a correlation ID. These are automated production-configuration tests, not proof that the standalone workload is already deployed live.

### Host production configuration

A cluster-internal upstream typically looks like:

```yaml
- name: TROZBOT_ORCHESTRATOR_URL
  value: http://<service>.<namespace>.svc.cluster.local:8787
- name: TROZBOT_ORCHESTRATOR_ALLOW_REMOTE
  value: 'true'
- name: TROZBOT_UPSTREAM_TIMEOUT_MS
  value: '15000'
```

The durable configuration belongs in both TROZLANIO canary and production manifests. Never put secrets or a client-selected upstream into `window.__TROZBOT__`.

### Host evidence

- #3479 — page, bundle, initial proxy
- #3480 — active bootstrap live-wire
- #3483 — rollout gate and narrow route contract
- #3485 — trusted ticket attribution
- #3489 — canonical tool-error codes
- #3490 — production 5xx middleware preservation

Complete deployment, database, smoke, observability, and rollback steps live in the [TROZBOT production runbook](https://github.com/MegaPhoenix92/trozlanio/blob/main/docs/TROZBOT_PRODUCTION_RUNBOOK.md).

---

## Generic host configuration

```ts
const handle = mountTrozbot(element, {
  apiProxyPath: '/api/trozbot',
  theme: 'dark',
  correlationId: 'host-shell',
  allowedOrigins: [window.location.origin],
  onTicketCreated: ({ ticketId, subject }) => {},
  onError: ({ message }) => console.error(message),
});
```

### Configuration fields

| Field | Purpose |
|---|---|
| `apiProxyPath` | Same-origin prefix; preferred production model |
| `orchestratorBaseUrl` | Direct URL; local/controlled hosts only |
| `theme` | `default` or `dark` |
| `allowedOrigins` | Exact parent origins; no wildcard |
| `correlationId` | Opaque session correlation |
| `isRobot` | Always `true` |

### Origin and messaging safety

- Default allowlist is loopback unless exact origins are configured.
- Wildcard `*` is rejected.
- Prefer direct DOM mount and callbacks.
- `apiProxyPath` must be a path, never an absolute upstream URL.

### Programmatic handle

```ts
await handle.startSession();
await handle.kbRetrieve('how do I restart the agent?');
await handle.createTicket('Subject', 'Body');
handle.setAvatarState('speaking');
handle.destroy();
```

---

## Security checklist

- [ ] Local fixture remains loopback-only.
- [ ] No secrets in `window.__TROZBOT__` or embed options.
- [ ] Tool allowlist remains `kb_retrieve` + `create_ticket`.
- [ ] Production host supplies auth, rollout, TLS, and trusted ticket identity.
- [ ] `allowedOrigins` lists exact real host origins.
- [ ] Vendored `VERSION.txt` matches the standalone source commit.
- [ ] Host production middleware compatibility tests are green.
- [ ] Live DB/K8s/signing claims have owner evidence before being marked production-proven.

## Related

- [`DEMO.md`](./DEMO.md) — local three-service demo
- [`PHASE1_STATUS.md`](./PHASE1_STATUS.md) — evidence ledger
- [`PHASE1_BLUEPRINT.md`](./PHASE1_BLUEPRINT.md) — mission and criteria
- [`DO_NOT.md`](./DO_NOT.md) — hard constraints
- [`SUPPLY_CHAIN.md`](./SUPPLY_CHAIN.md) — scans, SBOM, signing/registry blockers
