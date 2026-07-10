import { afterEach, describe, expect, it } from "vitest";
import type http from "node:http";
import { createOrchestratorApp } from "../../orchestrator/src/create-app.js";
import { listen as orchListen } from "../../orchestrator/src/server.js";
import { createVoiceGateway, listen } from "./server.js";
import { assertMediaConfigSafe, StubSttProvider } from "./stt.js";
import { StubTtsProvider } from "./tts.js";
import { GatewayOrchestratorClient } from "./orchestrator-client.js";
import { VoiceSessionPipeline } from "./session-pipeline.js";

describe("Wave 3 voice pipeline (stub STT/TTS + real orchestrator)", () => {
  let orchServer: http.Server | undefined;
  let gwServer: http.Server | undefined;
  let orchBase = "";
  let gwBase = "";

  afterEach(async () => {
    for (const s of [gwServer, orchServer]) {
      if (!s) continue;
      await new Promise<void>((resolve, reject) => {
        s.close((err) => (err ? reject(err) : resolve()));
      });
    }
    orchServer = undefined;
    gwServer = undefined;
  });

  async function boot() {
    const orch = createOrchestratorApp();
    orchServer = orch.server;
    const ob = await orchListen(orchServer, 0);
    orchBase = `http://${ob.host}:${ob.port}`;

    const gw = createVoiceGateway({ orchestratorUrl: orchBase });
    gwServer = gw.server;
    const gb = await listen(gwServer, 0);
    gwBase = `http://${gb.host}:${gb.port}`;
    return orch;
  }

  it("session → stub STT → grounded KB → stub TTS; ticket; deny non-phase1 tools", async () => {
    const orchApp = await boot();

    const health = await fetch(`${gwBase}/health`);
    expect(health.status).toBe(200);
    const h = (await health.json()) as {
      ok: boolean;
      service: string;
      wave: number;
      media: { stt: string; tts: string };
    };
    expect(h.ok).toBe(true);
    expect(h.service).toBe("trozbot-voice-gateway");
    expect(h.wave).toBe(3);
    expect(h.media.stt).toBe("stub");
    expect(h.media.tts).toBe("stub");

    const started = await fetch(`${gwBase}/v1/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ correlationId: "wave3-test" }),
    });
    expect(started.status).toBe(201);
    const { sessionId } = (await started.json()) as { sessionId: string };
    expect(sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    const kbTurn = await fetch(`${gwBase}/v1/session/${sessionId}/turn`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "kb",
        text: "how do I restart the agent after config changes?",
      }),
    });
    expect(kbTurn.status).toBe(200);
    const kbBody = (await kbTurn.json()) as {
      ok: boolean;
      result: {
        answerText: string;
        grounded?: boolean;
        sttStubbed: boolean;
        ttsStubbed: boolean;
        tts: { contentType: string };
      };
    };
    expect(kbBody.ok).toBe(true);
    expect(kbBody.result.grounded).toBe(true);
    expect(kbBody.result.answerText.toLowerCase()).toMatch(/restart|agent/);
    expect(kbBody.result.sttStubbed).toBe(true);
    expect(kbBody.result.ttsStubbed).toBe(true);
    expect(kbBody.result.tts.contentType).toBe("audio/x-trozbot-stub");

    const ticketTurn = await fetch(`${gwBase}/v1/session/${sessionId}/turn`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "ticket",
        text: "Agent still 502 after restart",
        subject: "Voice-reported agent failure",
        body: "Tried KB restart guidance; still failing.",
      }),
    });
    expect(ticketTurn.status).toBe(200);
    const tBody = (await ticketTurn.json()) as {
      ok: boolean;
      result: { ticketId?: string };
    };
    expect(tBody.ok).toBe(true);
    expect(tBody.result.ticketId).toBeTruthy();
    expect(orchApp.tickets.get(tBody.result.ticketId!)?.subject).toBe(
      "Voice-reported agent failure",
    );

    // Direct policy check via orchestrator client used by gateway
    const client = new GatewayOrchestratorClient(orchBase);
    const denied = await client.invokeTool(sessionId, "reset_password", {});
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("TOOL_NOT_ALLOWED");
  });

  it("unit pipeline with stubs only still produces grounded path via real orch client", async () => {
    await boot();
    const pipeline = new VoiceSessionPipeline(
      new GatewayOrchestratorClient(orchBase),
      new StubSttProvider(),
      new StubTtsProvider(),
    );
    const sid = await pipeline.startSession("unit");
    const turn = await pipeline.handleKbTurn(
      sid,
      "restart agent configuration",
    );
    expect(turn.grounded).toBe(true);
    expect(turn.sttStubbed).toBe(true);
  });

  it("refuses live media boot when keys + TROZBOT_LIVE_MEDIA without vendor", () => {
    const prevLive = process.env.TROZBOT_LIVE_MEDIA;
    const prevKey = process.env.TTS_API_KEY;
    process.env.TROZBOT_LIVE_MEDIA = "1";
    process.env.TTS_API_KEY = "not-a-real-key";
    try {
      expect(() => assertMediaConfigSafe()).toThrow(/vendor adapter/i);
      expect(() => createVoiceGateway({ orchestratorUrl: orchBase })).toThrow(
        /vendor adapter/i,
      );
    } finally {
      if (prevLive === undefined) delete process.env.TROZBOT_LIVE_MEDIA;
      else process.env.TROZBOT_LIVE_MEDIA = prevLive;
      if (prevKey === undefined) delete process.env.TTS_API_KEY;
      else process.env.TTS_API_KEY = prevKey;
    }
  });
});
