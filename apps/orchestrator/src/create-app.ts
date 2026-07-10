import { resolveBindHost } from "@trozbot/core";
import { FixtureKbRetriever } from "./kb-retrieve.js";
import { Orchestrator } from "./orchestrator.js";
import { createServer, listen } from "./server.js";
import { InMemorySessionStore } from "./session-store.js";
import {
  createTicketAndAuditStores,
  type StoreMode,
} from "./store-factory.js";

export async function createOrchestratorApp(opts?: {
  /** Force in-memory even if DATABASE_URL is set (tests). */
  forceMemory?: boolean;
}) {
  const sessions = new InMemorySessionStore();
  const stores = opts?.forceMemory
    ? await createTicketAndAuditStores({ forceMemory: true })
    : await createTicketAndAuditStores();
  const kb = new FixtureKbRetriever();
  const orchestrator = new Orchestrator({
    sessions,
    kb,
    tickets: stores.tickets,
    audit: stores.audit,
  });
  const server = createServer(orchestrator);
  return {
    server,
    orchestrator,
    sessions,
    tickets: stores.tickets,
    audit: stores.audit,
    kb,
    storeMode: stores.mode as StoreMode,
  };
}

export async function startOrchestrator(
  port = Number(process.env.PORT ?? 8787),
) {
  const host = resolveBindHost();
  const app = await createOrchestratorApp();
  const bound = await listen(app.server, port, host);
  return { ...app, ...bound };
}
