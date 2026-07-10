import { z } from "zod";

/**
 * Robot avatar presentation states (Phase 1).
 * Non-human robot only — never implies a human agent.
 */
export const AvatarStateSchema = z.enum([
  "idle",
  "listening",
  "thinking",
  "speaking",
]);

export type AvatarState = z.infer<typeof AvatarStateSchema>;

export const AVATAR_STATES: readonly AvatarState[] = AvatarStateSchema.options;
