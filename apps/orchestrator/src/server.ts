import http from "node:http";
import type { Orchestrator } from "./orchestrator.js";

export interface HealthBody {
  ok: true;
  service: "trozbot-orchestrator";
  wave: 1;
}

export function healthBody(): HealthBody {
  return {
    ok: true,
    service: "trozbot-orchestrator",
    wave: 1,
  };
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw) as unknown;
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

/**
 * Minimal HTTP surface for Wave 1:
 *   GET  /health
 *   POST /sessions
 *   POST /sessions/:id/tools
 */
export function createServer(orchestrator: Orchestrator): http.Server {
  return http.createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", "http://localhost");

      if (method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, healthBody());
        return;
      }

      if (method === "POST" && url.pathname === "/sessions") {
        const body = await readJson(req);
        const result = orchestrator.startSession(body);
        sendJson(res, 201, result);
        return;
      }

      const toolMatch = url.pathname.match(
        /^\/sessions\/([0-9a-fA-F-]{36})\/tools$/,
      );
      if (method === "POST" && toolMatch) {
        const sessionId = toolMatch[1]!;
        const body = await readJson(req);
        const result = orchestrator.invokeTool(sessionId, body);
        const status = result.ok
          ? 200
          : result.error.code === "SESSION_NOT_FOUND"
            ? 404
            : result.error.code === "TOOL_NOT_ALLOWED"
              ? 403
              : result.error.code === "INVALID_INPUT"
                ? 400
                : 500;
        sendJson(res, status, result);
        return;
      }

      sendJson(res, 404, {
        ok: false,
        error: { code: "NOT_FOUND", message: "Not found" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      sendJson(res, 500, {
        ok: false,
        error: { code: "INTERNAL", message },
      });
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
