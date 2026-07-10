import {
  InMemoryTicketStore,
  InMemoryToolAuditStore,
  type TicketStore,
  type ToolAuditStore,
} from "./ticket-store.js";
import { applyMigrations, hasDatabaseUrl } from "./db.js";
import { PgTicketStore, PgToolAuditStore } from "./pg-store.js";

export type StoreMode = "memory" | "postgres";

export async function createTicketAndAuditStores(opts?: {
  forceMemory?: boolean;
}): Promise<{
  tickets: TicketStore;
  audit: ToolAuditStore;
  mode: StoreMode;
}> {
  if (opts?.forceMemory || !hasDatabaseUrl()) {
    return {
      tickets: new InMemoryTicketStore(),
      audit: new InMemoryToolAuditStore(),
      mode: "memory",
    };
  }

  await applyMigrations();
  return {
    tickets: new PgTicketStore(),
    audit: new PgToolAuditStore(),
    mode: "postgres",
  };
}
