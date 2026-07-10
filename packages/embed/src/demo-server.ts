import http from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const distDir = resolve(pkgRoot, "dist");
const coreDistDir = resolve(pkgRoot, "..", "core", "dist");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

async function proxy(
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

export function createEmbedDemoServer(opts?: {
  orchestratorUrl?: string;
  host?: string;
}): http.Server {
  const orchestratorUrl =
    opts?.orchestratorUrl ??
    process.env.ORCHESTRATOR_URL ??
    "http://127.0.0.1:8787";
  const bindHost = opts?.host ?? process.env.HOST ?? "127.0.0.1";

  if (bindHost !== "127.0.0.1" && bindHost !== "localhost" && bindHost !== "::1") {
    if (process.env.ALLOW_PUBLIC_BIND !== "true") {
      throw new Error(
        `Refusing non-loopback bind ${bindHost}; set ALLOW_PUBLIC_BIND=true to override`,
      );
    }
  }

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");

      if (req.method === "GET" && url.pathname === "/health") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            service: "trozbot-embed-host",
            orchestratorUrl,
            apiProxy: "/api",
          }),
        );
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        const apiPath = url.pathname.slice("/api".length) + url.search;
        await proxy(req, res, orchestratorUrl, apiPath || "/");
        return;
      }

      if (url.pathname === "/" || url.pathname === "/embed-host.html") {
        const html = await readFile(join(pkgRoot, "demo-host.html"), "utf8");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      if (url.pathname.startsWith("/dist/")) {
        const rel = url.pathname.slice("/dist/".length);
        const file = resolve(distDir, rel);
        if (!file.startsWith(distDir)) {
          res.writeHead(403).end("forbidden");
          return;
        }
        const data = await readFile(file);
        res.writeHead(200, {
          "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        });
        res.end(data);
        return;
      }

      // Browser import map: @trozbot/core → /vendor/core/*
      if (url.pathname.startsWith("/vendor/core/")) {
        const rel = url.pathname.slice("/vendor/core/".length);
        const file = resolve(coreDistDir, rel);
        if (!file.startsWith(coreDistDir)) {
          res.writeHead(403).end("forbidden");
          return;
        }
        const data = await readFile(file);
        res.writeHead(200, {
          "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        });
        res.end(data);
        return;
      }

      res.writeHead(404).end("not found");
    } catch (e) {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end(e instanceof Error ? e.message : String(e));
    }
  });
}

async function listen(
  server: http.Server,
  port: number,
  host: string,
): Promise<void> {
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolveListen());
  });
}

export async function main(): Promise<void> {
  const port = Number(process.env.PORT ?? 8791);
  const host = process.env.HOST ?? "127.0.0.1";
  const server = createEmbedDemoServer({ host });
  await listen(server, port, host);
  // eslint-disable-next-line no-console
  console.log(
    `trozbot embed host http://${host}:${port}/ (proxy → orchestrator)`,
  );
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
