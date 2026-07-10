import { startOrchestrator } from "./create-app.js";

const port = Number(process.env.PORT ?? 8787);

const { host, port: boundPort } = await startOrchestrator(port);
// Robot concierge orchestrator — clearly non-human service identity.
console.log(
  JSON.stringify({
    msg: "trozbot-orchestrator listening",
    host,
    port: boundPort,
    health: `http://${host}:${boundPort}/health`,
    wave: 1,
  }),
);
