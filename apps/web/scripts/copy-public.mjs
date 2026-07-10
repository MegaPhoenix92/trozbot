import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const pkg = join(root, "..");
mkdirSync(join(pkg, "dist", "public"), { recursive: true });
cpSync(join(pkg, "public"), join(pkg, "dist", "public"), { recursive: true });
