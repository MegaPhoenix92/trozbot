import {
  StartSessionRequestSchema,
  ToolInvokeRequestSchema,
  type Session,
  type StartSessionResponse,
  type ToolInvokeResponse,
} from "@trozbot/core";
import type { SessionStore } from "./session-store.js";
import { evaluateToolPolicy } from "./tool-policy.js";
import type { KbRetriever } from "./kb-retrieve.js";
import type { TicketStore, ToolAuditStore } from "./ticket-store.js";

export interface OrchestratorDeps {
  sessions: SessionStore;
  kb: KbRetriever;
  tickets: TicketStore;
  audit: ToolAuditStore;
}

/**
 * Server-established identity only. Never populate this object from tool input.
 * HTTP path: populated only via host trust channel (see host-trust.ts).
 * Direct in-process callers may pass context for tests / internal adapters.
 */
export interface TrustedToolContext {
  tenantId?: string;
  userId?: string;
}

export class Orchestrator {
  constructor(private readonly deps: OrchestratorDeps) {}

  startSession(body: unknown = {}): StartSessionResponse {
    const req = StartSessionRequestSchema.parse(body ?? {});
    const session = this.deps.sessions.create(req.correlationId);
    return { session };
  }

  getSession(id: string): Session | undefined {
    return this.deps.sessions.get(id);
  }

  async invokeTool(
    sessionId: string,
    body: unknown,
    trustedContext: TrustedToolContext = {},
  ): Promise<ToolInvokeResponse> {
    const session = this.deps.sessions.get(sessionId);
    if (!session) {
      return {
        ok: false,
        error: {
          code: "SESSION_NOT_FOUND",
          message: `Session ${sessionId} not found`,
        },
      };
    }

    let tool: string;
    let input: unknown;
    try {
      const req = ToolInvokeRequestSchema.parse(body);
      tool = req.tool;
      input = req.input;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid tool request";
      await this.deps.audit.record({
        sessionId,
        toolName: "unknown",
        input: body,
        output: null,
        status: "error",
        errorCode: "INVALID_INPUT",
      });
      return {
        ok: false,
        error: { code: "INVALID_INPUT", message },
      };
    }

    const decision = evaluateToolPolicy(tool);
    if (!decision.allowed) {
      await this.deps.audit.record({
        sessionId,
        toolName: decision.tool,
        input,
        output: null,
        status: "denied",
        errorCode: "TOOL_NOT_ALLOWED",
      });
      return {
        ok: false,
        error: {
          code: "TOOL_NOT_ALLOWED",
          message: decision.reason,
        },
      };
    }

    this.deps.sessions.setAvatarState(sessionId, "thinking");

    try {
      if (decision.tool === "kb_retrieve") {
        const base =
          typeof input === "object" && input !== null
            ? (input as Record<string, unknown>)
            : {};
        const result = this.deps.kb.retrieve({
          query: typeof base.query === "string" ? base.query : "",
          sessionId,
        });
        await this.deps.audit.record({
          sessionId,
          toolName: "kb_retrieve",
          input,
          output: result,
          status: "ok",
        });
        this.deps.sessions.setAvatarState(sessionId, "speaking");
        return { ok: true, tool: "kb_retrieve", result };
      }

      const base =
        typeof input === "object" && input !== null
          ? (input as Record<string, unknown>)
          : {};

      // Identity is deliberately sourced from trusted server context, never
      // from caller-controlled tool input. HTTP hosts must use the trust
      // channel (token + identity headers); body fields are ignored.
      const result = await this.deps.tickets.create({
        sessionId,
        subject: typeof base.subject === "string" ? base.subject : "",
        body: typeof base.body === "string" ? base.body : "",
        ...(typeof trustedContext?.tenantId === "string"
          ? { tenantId: trustedContext.tenantId }
          : {}),
        ...(typeof trustedContext?.userId === "string"
          ? { userId: trustedContext.userId }
          : {}),
      });
      await this.deps.audit.record({
        sessionId,
        toolName: "create_ticket",
        input,
        output: result,
        status: "ok",
      });
      this.deps.sessions.setAvatarState(sessionId, "speaking");
      return { ok: true, tool: "create_ticket", result };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tool failed";
      const code =
        err instanceof Error && err.name === "ZodError"
          ? "INVALID_INPUT"
          : "TOOL_FAILED";
      await this.deps.audit.record({
        sessionId,
        toolName: decision.tool,
        input,
        output: null,
        status: "error",
        errorCode: code,
      });
      this.deps.sessions.setAvatarState(sessionId, "idle");
      return {
        ok: false,
        error: { code, message },
      };
    }
  }
}
