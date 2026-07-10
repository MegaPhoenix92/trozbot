import http from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// src/ or dist/
const publicDir = join(here, "..", "public");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

export function createWebServer(opts?: {
  orchestratorUrl?: string;
}): http.Server {
  const orchestratorUrl =
    opts?.orchestratorUrl ??
    process.env.ORCHESTRATOR_URL ??
    "http://127.0.0.1:8787";

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");

      if (req.method === "GET" && url.pathname === "/health") {
        const body = JSON.stringify({
          ok: true,
          service: "trozbot-web",
          wave: 2,
          orchestratorUrl,
        });
        res.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
        });
        res.end(body);
        return;
      }

      if (req.method === "GET" && url.pathname === "/config.json") {
        const body = JSON.stringify({
          orchestratorUrl,
          identityLabel: "TROZBOT robot concierge",
          isRobot: true,
          avatarStates: ["idle", "listening", "thinking", "speaking"],
        });
        res.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
        });
        res.end(body);
        return;
      }

      let path = url.pathname === "/" ? "/index.html" : url.pathname;
      // prevent path escape
      path = path.replace(/\.\./g, "");
      const filePath = join(publicDir, path);
      const data = await readFile(filePath);
      const type = TYPES[extname(filePath)] ?? "application/octet-stream";
      res.writeHead(200, { "content-type": type });
      res.end(data);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
    }
  });
}

export async function listen(
  server: http.Server,
  port: number,
  host = "127.0.0.1",
): Promise<{ port: number; host: string }> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
  const addr = server.address();
  if (addr && typeof addr === "object") {
    return { port: addr.port, host: addr.address };
  }
  return { port, host };
}

async function main(): Promise<void> {
  const port = Number(process.env.PORT ?? 5173);
  const server = createWebServer();
  const bound = await listen(server, port);
  console.log(
    JSON.stringify({
      msg: "trozbot-web listening",
      host: bound.host,
      port: bound.port,
      health: `http://${bound.host}:${bound.port}/health`,
      wave: 2,
    }),
  );
}

// Run when this file is the process entry (tsx src/server.ts / node dist/server.js)
const entry = process.argv[1] ? fileURLToPath(new URL(process.argv[1], "file://")) : "";
const self = fileURLToPath(import.meta.url);
if (entry && (entry === self || entry.endsWith("/server.ts") || entry.endsWith("/server.js"))) {
  void main();
}
