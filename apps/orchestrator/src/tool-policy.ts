import { isAllowedPhase1Tool, type Phase1ToolName } from "@trozbot/core";

export type PolicyDecision =
  | { allowed: true; tool: Phase1ToolName }
  | { allowed: false; tool: string; reason: string };

/**
 * Phase 1 tool policy gate: only kb_retrieve + create_ticket.
 * Disallowed tools (including any other write tools) are rejected before execution.
 */
export function evaluateToolPolicy(toolName: string): PolicyDecision {
  if (isAllowedPhase1Tool(toolName)) {
    return { allowed: true, tool: toolName };
  }
  return {
    allowed: false,
    tool: toolName,
    reason: `Tool "${toolName}" is not allowed in Phase 1. Allowed: kb_retrieve, create_ticket.`,
  };
}
