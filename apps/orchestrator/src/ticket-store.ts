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
  tenantId?: string;
  userId?: string;
}

export interface TicketStore {
  create(input: CreateTicketInput): Promise<CreateTicketOutput>;
  get(id: string): Promise<StoredTicket | undefined>;
  listBySession(sessionId: string): Promise<StoredTicket[]>;
}

/** In-memory ticket store when DATABASE_URL is absent. */
export class InMemoryTicketStore implements TicketStore {
  private readonly tickets = new Map<string, StoredTicket>();

  async create(rawInput: CreateTicketInput): Promise<CreateTicketOutput> {
    const input = CreateTicketInputSchema.parse(rawInput);
    const createdAt = new Date().toISOString();
    const ticket: StoredTicket = {
      id: randomUUID(),
      sessionId: input.sessionId,
      subject: input.subject,
      body: input.body,
      status: "open",
      createdAt,
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
    };
    this.tickets.set(ticket.id, ticket);
    return CreateTicketOutputSchema.parse({
      ticketId: ticket.id,
      status: ticket.status,
      subject: ticket.subject,
      createdAt: ticket.createdAt,
      ...(ticket.tenantId !== undefined ? { tenantId: ticket.tenantId } : {}),
      ...(ticket.userId !== undefined ? { userId: ticket.userId } : {}),
    });
  }

  async get(id: string): Promise<StoredTicket | undefined> {
    return this.tickets.get(id);
  }

  async listBySession(sessionId: string): Promise<StoredTicket[]> {
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
  record(entry: Omit<ToolAuditEntry, "id" | "createdAt">): Promise<ToolAuditEntry>;
  listBySession(sessionId: string): Promise<ToolAuditEntry[]>;
}

/** In-memory tool audit (maps to trozbot.tool_calls when DB is wired). */
export class InMemoryToolAuditStore implements ToolAuditStore {
  private readonly entries: ToolAuditEntry[] = [];

  async record(
    entry: Omit<ToolAuditEntry, "id" | "createdAt">,
  ): Promise<ToolAuditEntry> {
    const full: ToolAuditEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.entries.push(full);
    return full;
  }

  async listBySession(sessionId: string): Promise<ToolAuditEntry[]> {
    return this.entries.filter((e) => e.sessionId === sessionId);
  }
}
