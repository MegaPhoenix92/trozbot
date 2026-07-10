/**
 * Structural validation for Wave 4 manifests without a live cluster.
 * Run: node deploy/k8s/validate.test.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith(".yaml"));

let failed = false;
const report = [];

for (const f of files) {
  const text = readFileSync(join(dir, f), "utf8");
  if (/(password\s*[:=]\s*['\"]?[^R\s][^'\"]+)|(postgresql:\/\/[^:]+:[^@]+@)/i.test(text) && !text.includes("REPLACE_ME")) {
    report.push(`FAIL ${f}: possible secret material`);
    failed = true;
  }
  if (f.includes("orchestrator") || f === "web.yaml" || f.includes("voice")) {
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
  }
  report.push(`ok read ${f}`);
}

const dry = spawnSync(
  "kubectl",
  ["apply", "-k", dir, "--dry-run=client"],
  { encoding: "utf8" },
);
if (dry.status !== 0) {
  report.push(`FAIL kubectl dry-run: ${dry.stderr || dry.stdout}`);
  failed = true;
} else {
  report.push("ok kubectl apply -k --dry-run=client");
  report.push(dry.stdout.trim().split("\n").slice(0, 12).join(" | "));
}

console.log(JSON.stringify({ ok: !failed, report }, null, 2));
process.exit(failed ? 1 : 0);
