# deploy/k8s — Thin Kubernetes (Wave 4)

Phase 1 thin deploy: **≤3 services** in namespace `trozbot`.

| Workload | Port | Probe |
|----------|------|-------|
| `orchestrator` | 8787 | `GET /health` |
| `web` | 5173 (svc 80) | `GET /health` |
| `voice-gateway` | 8790 | `GET /health` |

## Apply

```bash
# Client-side validate (no cluster required)
kubectl apply -k deploy/k8s --dry-run=client

# Live cluster (owner GKE / kubeconfig required — not invented here)
kubectl apply -k deploy/k8s
```

## Secrets

- Manifests use `secretRef: trozbot-runtime` (optional) and in-cluster service DNS for `ORCHESTRATOR_URL`.
- **Never** commit real `DATABASE_URL` or API keys. Create secrets out-of-band (see `secret-example.yaml` comments).
- Image pull / registry credentials are owner-managed (Wave 5 signing path).

## Cluster access blocker

If you lack a GKE project / kubeconfig, dry-run client validation is the Wave 4 bar. Live `kubectl apply` without credentials is an **owner blocker** — report and do not invent cluster access.

## Out of scope

Service mesh, multi-cluster, App Engine, separate Postgres product DB.
