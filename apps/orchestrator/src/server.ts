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

const MAX_BODY_BYTES = 64 * 1024;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Request body too large");
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}

/** Local browser UI (Wave 2) may call orchestrator cross-origin. */
const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function sendJson(
  res: http.ServerResponse,
  status: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    ...CORS_HEADERS,
  });
  res.end(payload);
}

/**
 * Minimal HTTP surface:
 *   GET  /health
 *   POST /sessions
 *   POST /sessions/:id/tools
 *   OPTIONS * (CORS preflight for Wave 2 web UI)
 */
export function createServer(orchestrator: Orchestrator): http.Server {
  return http.createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", "http://localhost");

      if (method === "OPTIONS") {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return;
      }

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
      if (err instanceof HttpError) {
        sendJson(res, err.status, {
          ok: false,
          error: { code: err.code, message: err.message },
        });
        return;
      }
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
