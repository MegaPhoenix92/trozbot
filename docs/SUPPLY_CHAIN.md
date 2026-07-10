# TROZBOT supply chain (Wave 5)

## What CI does today

| Control | Workflow job | Status |
|---------|--------------|--------|
| Secrets scan | `security-baseline` → `secrets-scan` (Gitleaks) | **Real** — fails on leaks |
| Dependency audit | `deps-audit` (`pnpm audit --audit-level=high`) | **Real** |
| Dockerfile lint | `dockerfile-lint` (Hadolint recursive) | **Real** |
| SBOM | `sbom-and-image-path` (Syft filesystem SPDX) | **Real** artifact |
| Image build | `docker-build-orchestrator` (no push) | **Real** local build |
| Image CVE scan | Trivy on built orchestrator image | **Real** — table CRITICAL/HIGH; gate fails on CRITICAL with fixes |
| Cosign sign | Key check only | **Skip** without owner `COSIGN_PRIVATE_KEY` |
| Registry push | — | **Owner gap** |
| Cluster admission verify | — | **Owner gap** (needs signed images + policy install) |

## Owner-only gaps (do not invent)

1. **Container registry credentials** (GHCR/GCR) for push of `trozbot-*` images referenced in `deploy/k8s`.
2. **Cosign key material** or keyless OIDC identity for the production sign path (`secrets.COSIGN_PRIVATE_KEY` or workload identity).
3. **Admission controller** on the target cluster to verify signatures (Kyverno/Gatekeeper/Policy Controller).
4. **Live GKE kubeconfig** for `kubectl apply` (Wave 4 dry-run is client-side only).

## Local commands

```bash
# Secrets (if gitleaks installed)
gitleaks detect --source . --verbose

# Deps
pnpm audit --audit-level=high

# Dockerfiles
hadolint apps/*/Dockerfile

# Build image without push
docker build -f apps/orchestrator/Dockerfile -t trozbot-orchestrator:local .

# SBOM
syft dir:. -o spdx-json > /tmp/trozbot.spdx.json
```

## Sign path (when keys exist)

```bash
# Example only — do not commit keys
cosign sign --key env://COSIGN_PRIVATE_KEY \
  ghcr.io/OWNER/trozbot-orchestrator:TAG
```

Until keys and registry exist, CI **documents skip** rather than fake-signing.
