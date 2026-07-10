import http from "node:http";
import { assertMediaConfigSafe, createSttProvider } from "./stt.js";
import { createTtsProvider } from "./tts.js";
import { GatewayOrchestratorClient } from "./orchestrator-client.js";
import { VoiceSessionPipeline } from "./session-pipeline.js";

const MAX_BODY = 256 * 1024;

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_BODY) throw new Error("body too large");
    chunks.push(buf);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

export function createVoiceGateway(opts?: {
  orchestratorUrl?: string;
}): { server: http.Server; pipeline: VoiceSessionPipeline } {
  // Refuse partial live config that could mutate tickets then fail on TTS.
  assertMediaConfigSafe();
  const orchestratorUrl =
    opts?.orchestratorUrl ??
    process.env.ORCHESTRATOR_URL ??
    "http://127.0.0.1:8787";
  const orch = new GatewayOrchestratorClient(orchestratorUrl);
  const pipeline = new VoiceSessionPipeline(
    orch,
    createSttProvider(),
    createTtsProvider(),
  );

  const server = http.createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", "http://localhost");

      if (method === "GET" && url.pathname === "/health") {
        const live = process.env.TROZBOT_LIVE_MEDIA === "1";
        send(res, 200, {
          ok: true,
          service: "trozbot-voice-gateway",
          wave: 3,
          orchestratorUrl,
          media: {
            stt: live ? "live-blocked-no-vendor" : "stub",
            tts: live ? "live-blocked-no-vendor" : "stub",
            mode: live ? "rejected-at-boot" : "stub",
            interimDoc: "apps/voice-gateway/README.md",
          },
        });
        return;
      }

      if (method === "POST" && url.pathname === "/v1/session") {
        const body = (await readJson(req)) as { correlationId?: string };
        const sessionId = await pipeline.startSession(
          body.correlationId ?? "voice-gateway",
        );
        send(res, 201, { sessionId });
        return;
      }

      // POST /v1/session/:id/turn  { mode: "kb"|"ticket", text?: string, subject?, body? }
      const turnMatch = url.pathname.match(
        /^\/v1\/session\/([0-9a-fA-F-]{36})\/turn$/,
      );
      if (method === "POST" && turnMatch) {
        const sessionId = turnMatch[1]!;
        const body = (await readJson(req)) as {
          mode?: string;
          text?: string;
          subject?: string;
          body?: string;
        };
        const mode = body.mode ?? "kb";
        if (mode === "kb") {
          if (!body.text?.trim()) {
            send(res, 400, {
              ok: false,
              error: {
                code: "INVALID_INPUT",
                message: "text required for stub STT kb turn",
              },
            });
            return;
          }
          const result = await pipeline.handleKbTurn(
            sessionId,
            body.text,
            body.text,
          );
          send(res, 200, { ok: true, result });
          return;
        }
        if (mode === "ticket") {
          if (!body.text?.trim() && !body.body?.trim()) {
            send(res, 400, {
              ok: false,
              error: {
                code: "INVALID_INPUT",
                message: "text or body required for ticket turn",
              },
            });
            return;
          }
          const result = await pipeline.handleTicketTurn(
            sessionId,
            body.text ?? body.body ?? "",
            {
              subject: body.subject,
              body: body.body ?? body.text,
              textHint: body.text ?? body.body,
            },
          );
          send(res, 200, { ok: true, result });
          return;
        }
        send(res, 400, {
          ok: false,
          error: { code: "INVALID_INPUT", message: "mode must be kb or ticket" },
        });
        return;
      }

      send(res, 404, {
        ok: false,
        error: { code: "NOT_FOUND", message: "Not found" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "internal";
      send(res, 500, {
        ok: false,
        error: { code: "INTERNAL", message },
      });
    }
  });

  return { server, pipeline };
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
