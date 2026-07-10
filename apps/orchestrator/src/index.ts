import { startOrchestrator } from "./create-app.js";

const port = Number(process.env.PORT ?? 8787);

const { host, port: boundPort, storeMode } = await startOrchestrator(port);
// Robot concierge orchestrator — clearly non-human service identity.
// Local demo is unauthenticated / loopback-only unless ALLOW_PUBLIC_BIND=true.
console.log(
  JSON.stringify({
    msg: "trozbot-orchestrator listening",
    host,
    port: boundPort,
    health: `http://${host}:${boundPort}/health`,
    storeMode,
    wave: 1,
    auth: "none-local-demo",
  }),
);
