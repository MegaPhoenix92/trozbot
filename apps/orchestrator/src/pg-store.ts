import { randomUUID } from "node:crypto";
import {
  CreateTicketInputSchema,
  CreateTicketOutputSchema,
  type CreateTicketInput,
  type CreateTicketOutput,
} from "@trozbot/core";
import { getPool } from "./db.js";
import type {
  StoredTicket,
  TicketStore,
  ToolAuditEntry,
  ToolAuditStore,
} from "./ticket-store.js";

/** Postgres-backed tickets in schema trozbot (shared TROZLANIO DB). */
export class PgTicketStore implements TicketStore {
  async create(rawInput: CreateTicketInput): Promise<CreateTicketOutput> {
    const input = CreateTicketInputSchema.parse(rawInput);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const pool = getPool();
    await pool.query(
      `INSERT INTO trozbot.tickets
        (id, session_id, tenant_id, user_id, subject, body, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'open', $7::timestamptz, $7::timestamptz)`,
      [
        id,
        input.sessionId,
        input.tenantId ?? null,
        input.userId ?? null,
        input.subject,
        input.body,
        createdAt,
      ],
    );
    return CreateTicketOutputSchema.parse({
      ticketId: id,
      status: "open",
      subject: input.subject,
      createdAt,
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
    });
  }

  async get(id: string): Promise<StoredTicket | undefined> {
    const res = await getPool().query(
      `SELECT id, session_id, subject, body, status, created_at, tenant_id, user_id
       FROM trozbot.tickets WHERE id = $1`,
      [id],
    );
    const row = res.rows[0] as
      | {
          id: string;
          session_id: string;
          subject: string;
          body: string;
          status: string;
          created_at: Date;
          tenant_id: string | null;
          user_id: string | null;
        }
      | undefined;
    if (!row) return undefined;
    return {
      id: row.id,
      sessionId: row.session_id,
      subject: row.subject,
      body: row.body,
      status: (row.status === "open" ? "open" : "open") as "open",
      createdAt: new Date(row.created_at).toISOString(),
      ...(row.tenant_id ? { tenantId: row.tenant_id } : {}),
      ...(row.user_id ? { userId: row.user_id } : {}),
    };
  }

  async listBySession(sessionId: string): Promise<StoredTicket[]> {
    const res = await getPool().query(
      `SELECT id, session_id, subject, body, status, created_at, tenant_id, user_id
       FROM trozbot.tickets WHERE session_id = $1 ORDER BY created_at DESC`,
      [sessionId],
    );
    return res.rows.map(
      (row: {
        id: string;
        session_id: string;
        subject: string;
        body: string;
        status: string;
        created_at: Date;
        tenant_id: string | null;
        user_id: string | null;
      }) => ({
        id: row.id,
        sessionId: row.session_id,
        subject: row.subject,
        body: row.body,
        // Phase 1 create_ticket only writes "open"; preserve column when present.
        status: "open" as const,
        createdAt: new Date(row.created_at).toISOString(),
        ...(row.tenant_id ? { tenantId: row.tenant_id } : {}),
        ...(row.user_id ? { userId: row.user_id } : {}),
      }),
    );
  }
}


export class PgToolAuditStore implements ToolAuditStore {
  async record(
    entry: Omit<ToolAuditEntry, "id" | "createdAt">,
  ): Promise<ToolAuditEntry> {
    const full: ToolAuditEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await getPool().query(
      `INSERT INTO trozbot.tool_calls
        (id, session_id, tool_name, input_json, output_json, status, error_code, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8::timestamptz)`,
      [
        full.id,
        full.sessionId,
        full.toolName,
        JSON.stringify(full.input ?? {}),
        full.output === null || full.output === undefined
          ? null
          : JSON.stringify(full.output),
        full.status,
        full.errorCode ?? null,
        full.createdAt,
      ],
    );
    return full;
  }

  async listBySession(sessionId: string): Promise<ToolAuditEntry[]> {
    const res = await getPool().query(
      `SELECT id, session_id, tool_name, input_json, output_json, status, error_code, created_at
       FROM trozbot.tool_calls WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId],
    );
    return res.rows.map(
      (row: {
        id: string;
        session_id: string | null;
        tool_name: string;
        input_json: unknown;
        output_json: unknown;
        status: "ok" | "denied" | "error";
        error_code: string | null;
        created_at: Date;
      }) => ({
        id: row.id,
        sessionId: row.session_id,
        toolName: row.tool_name,
        input: row.input_json,
        output: row.output_json,
        status: row.status,
        ...(row.error_code ? { errorCode: row.error_code } : {}),
        createdAt: new Date(row.created_at).toISOString(),
      }),
    );
  }
}
