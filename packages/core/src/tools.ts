import { z } from "zod";
import { SessionIdSchema } from "./session.js";

/**
 * Phase 1 tool allowlist — KB read + create_ticket only.
 * Any other write tool must be rejected by policy.
 */
export const PHASE1_TOOL_NAMES = ["kb_retrieve", "create_ticket"] as const;
export type Phase1ToolName = (typeof PHASE1_TOOL_NAMES)[number];

export const Phase1ToolNameSchema = z.enum(PHASE1_TOOL_NAMES);

export function isAllowedPhase1Tool(name: string): name is Phase1ToolName {
  return (PHASE1_TOOL_NAMES as readonly string[]).includes(name);
}

// --- kb_retrieve ---

export const KbRetrieveInputSchema = z.object({
  query: z.string().min(1).max(2000),
  sessionId: SessionIdSchema.optional(),
});

export type KbRetrieveInput = z.infer<typeof KbRetrieveInputSchema>;

export const KbSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().min(1),
});

export type KbSource = z.infer<typeof KbSourceSchema>;

export const KbRetrieveOutputSchema = z.object({
  answer: z.string().min(1),
  sources: z.array(KbSourceSchema).min(1),
  /** True when answer is grounded in fixture/KB sources (Wave 1 always true on hit). */
  grounded: z.literal(true),
});

export type KbRetrieveOutput = z.infer<typeof KbRetrieveOutputSchema>;

// --- create_ticket ---

export const CreateTicketInputSchema = z.object({
  sessionId: SessionIdSchema,
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
  /** Opaque TROZLANIO tenant reference — do not invent local tenants. */
  tenantId: z.string().min(1).max(128).optional(),
  /** Opaque TROZLANIO user reference — do not invent local users. */
  userId: z.string().min(1).max(128).optional(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketInputSchema>;

export const CreateTicketOutputSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.literal("open"),
  subject: z.string().min(1),
  createdAt: z.string().datetime(),
  tenantId: z.string().min(1).max(128).optional(),
  userId: z.string().min(1).max(128).optional(),
});

export type CreateTicketOutput = z.infer<typeof CreateTicketOutputSchema>;

// --- tool invoke envelope ---

export const ToolInvokeRequestSchema = z.object({
  tool: z.string().min(1),
  input: z.unknown(),
});

export type ToolInvokeRequest = z.infer<typeof ToolInvokeRequestSchema>;

export const ToolInvokeSuccessSchema = z.object({
  ok: z.literal(true),
  tool: Phase1ToolNameSchema,
  result: z.unknown(),
});

export const ToolInvokeErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.enum([
      "TOOL_NOT_ALLOWED",
      "INVALID_INPUT",
      "SESSION_NOT_FOUND",
      "TOOL_FAILED",
    ]),
    message: z.string(),
  }),
});

export const ToolInvokeResponseSchema = z.union([
  ToolInvokeSuccessSchema,
  ToolInvokeErrorSchema,
]);

export type ToolInvokeResponse = z.infer<typeof ToolInvokeResponseSchema>;
