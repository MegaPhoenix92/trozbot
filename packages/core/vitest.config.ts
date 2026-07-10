import { defineConfig } from "vitest/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Pin root so Vite does not walk into parent monorepos (e.g. TROZLANIO postcss).
  root,
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
