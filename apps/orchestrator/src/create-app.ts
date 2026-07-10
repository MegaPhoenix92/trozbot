import { FixtureKbRetriever } from "./kb-retrieve.js";
import { Orchestrator } from "./orchestrator.js";
import { createServer, listen } from "./server.js";
import { InMemorySessionStore } from "./session-store.js";
import {
  InMemoryTicketStore,
  InMemoryToolAuditStore,
} from "./ticket-store.js";

export function createOrchestratorApp() {
  const sessions = new InMemorySessionStore();
  const tickets = new InMemoryTicketStore();
  const audit = new InMemoryToolAuditStore();
  const kb = new FixtureKbRetriever();
  const orchestrator = new Orchestrator({ sessions, kb, tickets, audit });
  const server = createServer(orchestrator);
  return { server, orchestrator, sessions, tickets, audit, kb };
}

export async function startOrchestrator(port = Number(process.env.PORT ?? 8787)) {
  const app = createOrchestratorApp();
  const bound = await listen(app.server, port);
  return { ...app, ...bound };
}
