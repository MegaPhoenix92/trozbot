import { describe, expect, it } from "vitest";
import {
  PHASE1_TOOL_NAMES,
  isAllowedPhase1Tool,
  KbRetrieveInputSchema,
  KbRetrieveOutputSchema,
  CreateTicketInputSchema,
  CreateTicketOutputSchema,
  ToolInvokeRequestSchema,
  ToolInvokeResponseSchema,
} from "./tools.js";

const sessionId = "550e8400-e29b-41d4-a716-446655440000";

describe("Phase 1 tool allowlist", () => {
  it("only allows kb_retrieve and create_ticket", () => {
    expect(PHASE1_TOOL_NAMES).toEqual(["kb_retrieve", "create_ticket"]);
    expect(isAllowedPhase1Tool("kb_retrieve")).toBe(true);
    expect(isAllowedPhase1Tool("create_ticket")).toBe(true);
    expect(isAllowedPhase1Tool("reset_password")).toBe(false);
    expect(isAllowedPhase1Tool("delete_account")).toBe(false);
    expect(isAllowedPhase1Tool("execute_billing_change")).toBe(false);
  });
});

describe("kb_retrieve contracts", () => {
  it("accepts a grounded fixture-shaped output", () => {
    const out = KbRetrieveOutputSchema.parse({
      answer: "Restart the agent service after config changes.",
      sources: [
        {
          id: "kb-001",
          title: "Agent config",
          excerpt: "After editing config, restart the agent service.",
        },
      ],
      grounded: true,
    });
    expect(out.grounded).toBe(true);
    expect(out.sources).toHaveLength(1);
  });

  it("rejects ungrounded or empty sources", () => {
    expect(() =>
      KbRetrieveOutputSchema.parse({
        answer: "guess",
        sources: [],
        grounded: true,
      }),
    ).toThrow();
    expect(() =>
      KbRetrieveOutputSchema.parse({
        answer: "guess",
        sources: [{ id: "x", title: "t", excerpt: "e" }],
        grounded: false,
      }),
    ).toThrow();
  });

  it("validates query input", () => {
    expect(KbRetrieveInputSchema.parse({ query: "how to restart?" }).query).toBe(
      "how to restart?",
    );
    expect(() => KbRetrieveInputSchema.parse({ query: "" })).toThrow();
  });
});

describe("create_ticket contracts", () => {
  it("accepts valid ticket create input/output", () => {
    const input = CreateTicketInputSchema.parse({
      sessionId,
      subject: "Cannot login",
      body: "User reports 401 after password reset.",
    });
    expect(input.sessionId).toBe(sessionId);

    const output = CreateTicketOutputSchema.parse({
      ticketId: "660e8400-e29b-41d4-a716-446655440000",
      status: "open",
      subject: "Cannot login",
      createdAt: "2026-07-10T12:00:00.000Z",
    });
    expect(output.status).toBe("open");
  });

  it("rejects empty subject/body", () => {
    expect(() =>
      CreateTicketInputSchema.parse({
        sessionId,
        subject: "",
        body: "x",
      }),
    ).toThrow();
  });
});

describe("tool invoke envelope", () => {
  it("parses request and success/error responses", () => {
    expect(
      ToolInvokeRequestSchema.parse({
        tool: "kb_retrieve",
        input: { query: "help" },
      }).tool,
    ).toBe("kb_retrieve");

    const ok = ToolInvokeResponseSchema.parse({
      ok: true,
      tool: "create_ticket",
      result: { ticketId: sessionId },
    });
    expect(ok.ok).toBe(true);

    const denied = ToolInvokeResponseSchema.parse({
      ok: false,
      error: {
        code: "TOOL_NOT_ALLOWED",
        message: "Tool reset_password is not allowed in Phase 1",
      },
    });
    expect(denied.ok).toBe(false);
  });
});
