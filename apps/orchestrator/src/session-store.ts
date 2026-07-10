import { randomUUID } from "node:crypto";
import type { AvatarState, Session } from "@trozbot/core";
import { SessionSchema } from "@trozbot/core";

export interface SessionStore {
  create(correlationId?: string): Session;
  get(id: string): Session | undefined;
  setAvatarState(id: string, state: AvatarState): Session | undefined;
}

/** In-memory session store (Wave 1). Redis can replace this later without changing callers. */
export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();

  create(correlationId?: string): Session {
    const now = new Date().toISOString();
    const session = SessionSchema.parse({
      id: randomUUID(),
      avatarState: "idle",
      createdAt: now,
      updatedAt: now,
      ...(correlationId !== undefined ? { correlationId } : {}),
    });
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  setAvatarState(id: string, state: AvatarState): Session | undefined {
    const existing = this.sessions.get(id);
    if (!existing) return undefined;
    const updated = SessionSchema.parse({
      ...existing,
      avatarState: state,
      updatedAt: new Date().toISOString(),
    });
    this.sessions.set(id, updated);
    return updated;
  }
}
