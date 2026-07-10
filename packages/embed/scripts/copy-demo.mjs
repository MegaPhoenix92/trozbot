import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// demo-host.html stays at package root; ensure dist exists after tsc
mkdirSync(join(root, "dist"), { recursive: true });
copyFileSync(join(root, "demo-host.html"), join(root, "dist", "demo-host.html"));
