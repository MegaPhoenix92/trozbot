import {
  CreateTicketOutputSchema,
  KbRetrieveOutputSchema,
  SessionSchema,
  ToolInvokeResponseSchema,
  type CreateTicketOutput,
  type KbRetrieveOutput,
  type Session,
  type ToolInvokeResponse,
} from "@trozbot/core";

export class GatewayOrchestratorClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
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
    if (!res.ok) throw new Error(`startSession HTTP ${res.status}`);
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
    return ToolInvokeResponseSchema.parse(await res.json());
  }

  async kbRetrieve(sessionId: string, query: string): Promise<KbRetrieveOutput> {
    const inv = await this.invokeTool(sessionId, "kb_retrieve", { query });
    if (!inv.ok) throw new Error(inv.error.message);
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
    if (!inv.ok) throw new Error(inv.error.message);
    return CreateTicketOutputSchema.parse(inv.result);
  }
}
