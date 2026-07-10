import { z } from "zod";
import { AvatarStateSchema } from "./avatar.js";

export const SessionIdSchema = z.string().uuid();

export const SessionSchema = z.object({
  id: SessionIdSchema,
  avatarState: AvatarStateSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /** Opaque client/tenant correlation; not TROZLANIO user table copy. */
  correlationId: z.string().min(1).max(128).optional(),
});

export type Session = z.infer<typeof SessionSchema>;

export const StartSessionRequestSchema = z.object({
  correlationId: z.string().min(1).max(128).optional(),
});

export type StartSessionRequest = z.infer<typeof StartSessionRequestSchema>;

export const StartSessionResponseSchema = z.object({
  session: SessionSchema,
});

export type StartSessionResponse = z.infer<typeof StartSessionResponseSchema>;
