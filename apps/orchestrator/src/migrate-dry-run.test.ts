import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "migrations",
);

describe("migrations expand-only (no live DB required)", () => {
  it("ships trozbot tickets + tool_calls SQL without destructive ops or secrets", () => {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
    expect(files.length).toBeGreaterThan(0);

    const combined = files
      .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
      .join("\n");

    expect(combined).toMatch(/CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS\s+trozbot/i);
    expect(combined).toMatch(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+trozbot\.tickets/i,
    );
    expect(combined).toMatch(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+trozbot\.tool_calls/i,
    );
    expect(combined).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(combined).not.toMatch(/\bTRUNCATE\b/i);
    expect(combined).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);

    // Explicit skip posture when no DATABASE_URL
    if (!process.env.DATABASE_URL?.trim()) {
      // eslint-disable-next-line no-console
      console.info(
        "SKIP live migration apply: DATABASE_URL not set (Wave 1 expected)",
      );
    }
  });
});
