import { randomUUID } from "node:crypto";
import {
  CreateTicketInputSchema,
  CreateTicketOutputSchema,
  type CreateTicketInput,
  type CreateTicketOutput,
} from "@trozbot/core";

export interface StoredTicket {
  id: string;
  sessionId: string;
  subject: string;
  body: string;
  status: "open";
  createdAt: string;
}

export interface TicketStore {
  create(input: CreateTicketInput): CreateTicketOutput;
  get(id: string): StoredTicket | undefined;
  listBySession(sessionId: string): StoredTicket[];
}

/**
 * In-memory ticket store for Wave 1 when DATABASE_URL is absent.
 * Same create_ticket surface as a future Postgres-backed store (trozbot.tickets).
 */
export class InMemoryTicketStore implements TicketStore {
  private readonly tickets = new Map<string, StoredTicket>();

  create(rawInput: CreateTicketInput): CreateTicketOutput {
    const input = CreateTicketInputSchema.parse(rawInput);
    const createdAt = new Date().toISOString();
    const ticket: StoredTicket = {
      id: randomUUID(),
      sessionId: input.sessionId,
      subject: input.subject,
      body: input.body,
      status: "open",
      createdAt,
    };
    this.tickets.set(ticket.id, ticket);
    return CreateTicketOutputSchema.parse({
      ticketId: ticket.id,
      status: ticket.status,
      subject: ticket.subject,
      createdAt: ticket.createdAt,
    });
  }

  get(id: string): StoredTicket | undefined {
    return this.tickets.get(id);
  }

  listBySession(sessionId: string): StoredTicket[] {
    return [...this.tickets.values()].filter((t) => t.sessionId === sessionId);
  }
}

export interface ToolAuditEntry {
  id: string;
  sessionId: string | null;
  toolName: string;
  input: unknown;
  output: unknown;
  status: "ok" | "denied" | "error";
  errorCode?: string;
  createdAt: string;
}

export interface ToolAuditStore {
  record(entry: Omit<ToolAuditEntry, "id" | "createdAt">): ToolAuditEntry;
  listBySession(sessionId: string): ToolAuditEntry[];
}

/** In-memory tool audit (maps to trozbot.tool_calls when DB is wired). */
export class InMemoryToolAuditStore implements ToolAuditStore {
  private readonly entries: ToolAuditEntry[] = [];

  record(entry: Omit<ToolAuditEntry, "id" | "createdAt">): ToolAuditEntry {
    const full: ToolAuditEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.entries.push(full);
    return full;
  }

  listBySession(sessionId: string): ToolAuditEntry[] {
    return this.entries.filter((e) => e.sessionId === sessionId);
  }
}
