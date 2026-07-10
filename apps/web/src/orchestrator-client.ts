import {
  CreateTicketOutputSchema,
  KbRetrieveOutputSchema,
  SessionSchema,
  ToolInvokeResponseSchema,
  type AvatarState,
  type CreateTicketOutput,
  type KbRetrieveOutput,
  type Session,
  type ToolInvokeResponse,
} from "@trozbot/core";

export interface OrchestratorClientOptions {
  baseUrl: string;
  /** Injectable fetch for tests. */
  fetchImpl?: typeof fetch;
}

/**
 * Real HTTP client for Wave 1 orchestrator surface.
 * Does not reimplement tool policy — server enforces allowlist.
 */
export class OrchestratorClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: OrchestratorClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async health(): Promise<{ ok: true; service: string; wave: number }> {
    const res = await this.fetchImpl(`${this.baseUrl}/health`);
    if (!res.ok) {
      throw new Error(`health failed: HTTP ${res.status}`);
    }
    return (await res.json()) as { ok: true; service: string; wave: number };
  }

  async startSession(correlationId?: string): Promise<Session> {
    const res = await this.fetchImpl(`${this.baseUrl}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        correlationId !== undefined ? { correlationId } : {},
      ),
    });
    const body = (await res.json()) as { session?: unknown };
    if (!res.ok) {
      throw new Error(`startSession failed: HTTP ${res.status}`);
    }
    return SessionSchema.parse(body.session);
  }

  async invokeTool(
    sessionId: string,
    tool: string,
    input: unknown,
  ): Promise<ToolInvokeResponse> {
    const res = await this.fetchImpl(
      `${this.baseUrl}/sessions/${sessionId}/tools`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool, input }),
      },
    );
    const body = ToolInvokeResponseSchema.parse(await res.json());
    return body;
  }

  async kbRetrieve(
    sessionId: string,
    query: string,
  ): Promise<KbRetrieveOutput> {
    const inv = await this.invokeTool(sessionId, "kb_retrieve", { query });
    if (!inv.ok) {
      throw new Error(inv.error.message);
    }
    return KbRetrieveOutputSchema.parse(inv.result);
  }

  async createTicket(
    sessionId: string,
    subject: string,
    body: string,
  ): Promise<CreateTicketOutput> {
    const inv = await this.invokeTool(sessionId, "create_ticket", {
      subject,
      body,
    });
    if (!inv.ok) {
      throw new Error(inv.error.message);
    }
    return CreateTicketOutputSchema.parse(inv.result);
  }
}

export type RobotUiState = {
  avatarState: AvatarState;
  sessionId: string | null;
  lastAnswer: string | null;
  lastTicketId: string | null;
  error: string | null;
};
