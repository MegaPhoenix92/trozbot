import * as esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  entryPoints: [join(root, "src/index.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: join(root, "dist/trozbot-embed.browser.js"),
  sourcemap: true,
  target: ["es2022"],
});

console.log("wrote dist/trozbot-embed.browser.js");
