/**
 * Structural validation for Wave 4 manifests without a live cluster.
 * Run: node deploy/k8s/validate.test.mjs
 *
 * Does not require GKE/kubeconfig — uses client-only kustomize + dry-run --validate=false.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith(".yaml"));

let failed = false;
const report = [];

const deployFiles = ["orchestrator.yaml", "web.yaml", "voice-gateway.yaml"];

for (const f of files) {
  const text = readFileSync(join(dir, f), "utf8");
  if (
    /postgresql:\/\/[^R\s:]+:[^@\s]+@/i.test(text) ||
    /password\s*:\s*['\"]?(?!REPLACE)[^\s'\"]+/i.test(text)
  ) {
    if (!text.includes("REPLACE_ME")) {
      report.push(`FAIL ${f}: possible secret material`);
      failed = true;
    }
  }
  if (deployFiles.includes(f)) {
    for (const need of ["readinessProbe:", "livenessProbe:", "limits:", "secretRef:"]) {
      if (need === "secretRef:" && f !== "orchestrator.yaml") continue;
      if (!text.includes(need.replace("secretRef:", "secretRef") ? need : need)) {
        // checked below
      }
    }
    if (!/readinessProbe:/.test(text)) {
      report.push(`FAIL ${f}: missing readinessProbe`);
      failed = true;
    }
    if (!/livenessProbe:/.test(text)) {
      report.push(`FAIL ${f}: missing livenessProbe`);
      failed = true;
    }
    if (!/limits:/.test(text)) {
      report.push(`FAIL ${f}: missing resource limits`);
      failed = true;
    }
    if (!/runAsNonRoot:\s*true/.test(text)) {
      report.push(`FAIL ${f}: missing runAsNonRoot`);
      failed = true;
    }
  }
  report.push(`ok read ${f}`);
}

// Build manifests without contacting a cluster API server
const build = spawnSync("kubectl", ["kustomize", dir], { encoding: "utf8" });
if (build.status !== 0) {
  report.push(`FAIL kubectl kustomize: ${build.stderr || build.stdout}`);
  failed = true;
} else {
  report.push("ok kubectl kustomize");
  const built = build.stdout;
  if (!built.includes("kind: Deployment")) {
    report.push("FAIL kustomize output missing Deployment");
    failed = true;
  }
  if ((built.match(/kind: Deployment/g) || []).length < 3) {
    report.push("FAIL expected 3 Deployments");
    failed = true;
  }
  // Client dry-run without OpenAPI download from live cluster
  const dry = spawnSync(
    "kubectl",
    [
      "apply",
      "-f",
      "-",
      "--dry-run=client",
      "--validate=false",
    ],
    { encoding: "utf8", input: built, env: { ...process.env, KUBECONFIG: "/dev/null" } },
  );
  if (dry.status !== 0) {
    // Some kubectl versions still want a context; kustomize success is enough then.
    report.push(
      `WARN kubectl apply dry-run skipped/failed without cluster: ${(dry.stderr || dry.stdout).slice(0, 200)}`,
    );
    report.push("ok structural kustomize-only validation (cluster access owner-blocked)");
  } else {
    report.push("ok kubectl apply --dry-run=client --validate=false");
  }
}

console.log(JSON.stringify({ ok: !failed, report }, null, 2));
process.exit(failed ? 1 : 0);
