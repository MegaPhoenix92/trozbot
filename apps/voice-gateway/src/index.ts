import { resolveBindHost } from "@trozbot/core";
import { createVoiceGateway, listen } from "./server.js";

const port = Number(process.env.PORT ?? 8790);
const host = resolveBindHost();
const { server } = createVoiceGateway();
const bound = await listen(server, port, host);
console.log(
  JSON.stringify({
    msg: "trozbot-voice-gateway listening",
    host: bound.host,
    port: bound.port,
    health: `http://${bound.host}:${bound.port}/health`,
    wave: 3,
    auth: "none-local-demo",
    media:
      process.env.STT_API_KEY || process.env.TTS_API_KEY
        ? "keys-present-vendor-pending"
        : "stub-stt-tts",
  }),
);
