/**
 * Dry-run migration validator for environments without DATABASE_URL.
 * Does not connect to Postgres; validates expand-only artifacts on disk.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "migrations");

const FORBIDDEN = /\b(DROP|TRUNCATE|ALTER\s+TABLE\s+\S+\s+DROP)\b/i;

function main(): void {
  const hasDbUrl = Boolean(process.env.DATABASE_URL?.trim());
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("FAIL: no .sql migration files found");
    process.exit(1);
  }

  let ok = true;
  const report: string[] = [];

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const checks = {
      schemaTrozbot: /CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS\s+trozbot/i.test(sql),
      tickets: /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+trozbot\.tickets/i.test(sql),
      toolCalls:
        /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+trozbot\.tool_calls/i.test(sql),
      expandOnly: !FORBIDDEN.test(sql),
      noSecrets: !/(password\s*=|postgresql:\/\/[^\s]+:[^\s]+@)/i.test(sql),
    };

    for (const [name, passed] of Object.entries(checks)) {
      if (!passed) {
        ok = false;
        report.push(`${file}: FAIL ${name}`);
      } else {
        report.push(`${file}: ok ${name}`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok,
        migrationsDir,
        files,
        databaseUrlPresent: hasDbUrl,
        liveApply: hasDbUrl
          ? "DATABASE_URL set — run psql apply manually (see migrations/README.md)"
          : "SKIP live apply — DATABASE_URL not set (expected for Wave 1 local/CI)",
        checks: report,
      },
      null,
      2,
    ),
  );

  if (!ok) process.exit(1);
}

main();
