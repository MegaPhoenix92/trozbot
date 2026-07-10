import http from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// src/ or dist/ → package public/
const publicDir = resolve(join(here, "..", "public"));

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function safePublicPath(urlPath: string): string | null {
  const cleaned = urlPath.split("?")[0] ?? "/";
  const relative = cleaned === "/" ? "index.html" : cleaned.replace(/^\/+/, "");
  const candidate = resolve(publicDir, normalize(relative));
  const rootWithSep = publicDir.endsWith(sep) ? publicDir : publicDir + sep;
  if (candidate !== publicDir && !candidate.startsWith(rootWithSep)) {
    return null;
  }
  return candidate;
}

async function proxyToOrchestrator(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  orchestratorUrl: string,
  apiPath: string,
): Promise<void> {
  const target = new URL(apiPath, orchestratorUrl);
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);
  const upstream = await fetch(target, {
    method: req.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: body.length ? body : undefined,
  });
  const text = await upstream.text();
  res.writeHead(upstream.status, {
    "content-type":
      upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
  });
  res.end(text);
}

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
          apiProxy: "/api",
        });
        res.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
        });
        res.end(body);
        return;
      }

      if (req.method === "GET" && url.pathname === "/config.json") {
        // Browser uses same-origin /api proxy — no cross-origin orchestrator URL needed.
        const body = JSON.stringify({
          apiBase: "/api",
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

      // Same-origin proxy to orchestrator (avoids wildcard CORS on ticket API)
      if (url.pathname === "/api/health" && req.method === "GET") {
        await proxyToOrchestrator(req, res, orchestratorUrl, "/health");
        return;
      }
      if (url.pathname === "/api/sessions" && req.method === "POST") {
        await proxyToOrchestrator(req, res, orchestratorUrl, "/sessions");
        return;
      }
      const toolMatch = url.pathname.match(
        /^\/api\/sessions\/([0-9a-fA-F-]{36})\/tools$/,
      );
      if (toolMatch && req.method === "POST") {
        await proxyToOrchestrator(
          req,
          res,
          orchestratorUrl,
          `/sessions/${toolMatch[1]!}/tools`,
        );
        return;
      }

      const filePath = safePublicPath(url.pathname);
      if (!filePath) {
        res.writeHead(400, { "content-type": "text/plain" });
        res.end("Bad path");
        return;
      }
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
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolvePromise());
  });
  const addr = server.address();
  if (addr && typeof addr === "object") {
    return { port: addr.port, host: addr.address };
  }
  return { port, host };
}

async function main(): Promise<void> {
  const { resolveBindHost } = await import("@trozbot/core");
  const port = Number(process.env.PORT ?? 5173);
  const host = resolveBindHost();
  const server = createWebServer();
  const bound = await listen(server, port, host);
  console.log(
    JSON.stringify({
      msg: "trozbot-web listening",
      host: bound.host,
      port: bound.port,
      health: `http://${bound.host}:${bound.port}/health`,
      wave: 2,
      auth: "none-local-demo",
    }),
  );
}

const entry = process.argv[1]
  ? fileURLToPath(new URL(process.argv[1], "file://"))
  : "";
const self = fileURLToPath(import.meta.url);
if (
  entry &&
  (entry === self ||
    entry.endsWith("/server.ts") ||
    entry.endsWith("/server.js"))
) {
  void main();
}
