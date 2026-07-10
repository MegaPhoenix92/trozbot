import { describe, expect, it } from "vitest";
import { evaluateToolPolicy } from "./tool-policy.js";

describe("evaluateToolPolicy", () => {
  it("allows Phase 1 tools only", () => {
    expect(evaluateToolPolicy("kb_retrieve")).toEqual({
      allowed: true,
      tool: "kb_retrieve",
    });
    expect(evaluateToolPolicy("create_ticket")).toEqual({
      allowed: true,
      tool: "create_ticket",
    });
  });

  it("rejects write tools beyond create_ticket", () => {
    const denied = evaluateToolPolicy("reset_password");
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) {
      expect(denied.reason).toMatch(/not allowed/i);
    }
    expect(evaluateToolPolicy("delete_account").allowed).toBe(false);
    expect(evaluateToolPolicy("execute_billing_change").allowed).toBe(false);
  });
});
