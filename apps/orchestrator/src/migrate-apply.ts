/**
 * Apply expand-only migrations when DATABASE_URL is set.
 * Does not invent credentials — exits 0 with skip message if unset.
 */
import { applyMigrations, hasDatabaseUrl, closePool } from "./db.js";

async function main(): Promise<void> {
  if (!hasDatabaseUrl()) {
    console.log(
      JSON.stringify({
        ok: true,
        applied: [],
        liveApply: "SKIP — DATABASE_URL not set (in-memory path remains)",
      }),
    );
    return;
  }
  const applied = await applyMigrations();
  await closePool();
  console.log(
    JSON.stringify({
      ok: true,
      applied,
      liveApply: "ok",
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
