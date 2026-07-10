import type { AvatarState, Session } from "@trozbot/core";
import { AvatarStateSchema } from "@trozbot/core";
import type { OrchestratorClient } from "./orchestrator-client.js";

export type RobotListener = (snapshot: RobotSnapshot) => void;

export interface RobotSnapshot {
  avatarState: AvatarState;
  session: Session | null;
  lastAnswer: string | null;
  lastSources: Array<{ id: string; title: string; excerpt: string }>;
  lastTicketId: string | null;
  error: string | null;
  /** Always true — TROZBOT is a robot, never a human agent. */
  isRobot: true;
  identityLabel: "TROZBOT robot concierge";
}

/**
 * UI controller: owns avatar state machine and orchestrator session wire.
 * Text path only in Wave 2 (listening = user typing / ready for input).
 */
export class RobotController {
  private avatarState: AvatarState = "idle";
  private session: Session | null = null;
  private lastAnswer: string | null = null;
  private lastSources: RobotSnapshot["lastSources"] = [];
  private lastTicketId: string | null = null;
  private error: string | null = null;
  private readonly listeners = new Set<RobotListener>();

  constructor(private readonly client: OrchestratorClient) {}

  subscribe(listener: RobotListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): RobotSnapshot {
    return {
      avatarState: this.avatarState,
      session: this.session,
      lastAnswer: this.lastAnswer,
      lastSources: this.lastSources,
      lastTicketId: this.lastTicketId,
      error: this.error,
      isRobot: true,
      identityLabel: "TROZBOT robot concierge",
    };
  }

  setAvatarState(state: AvatarState): void {
    this.avatarState = AvatarStateSchema.parse(state);
    this.emit();
  }

  /** Enter listening (user is about to speak/type — still a robot surface). */
  beginListening(): void {
    if (!this.session) {
      this.error = "Start a session before listening";
      this.emit();
      return;
    }
    this.error = null;
    this.avatarState = "listening";
    this.emit();
  }

  async startSession(correlationId = "web-ui"): Promise<Session> {
    this.error = null;
    this.avatarState = "thinking";
    this.emit();
    try {
      const session = await this.client.startSession(correlationId);
      this.session = session;
      this.avatarState = "idle";
      this.emit();
      return session;
    } catch (err) {
      this.error = err instanceof Error ? err.message : "startSession failed";
      this.avatarState = "idle";
      this.emit();
      throw err;
    }
  }

  async askKnowledgeBase(query: string): Promise<string> {
    if (!this.session) {
      throw new Error("No active session");
    }
    this.error = null;
    this.avatarState = "listening";
    this.emit();
    this.avatarState = "thinking";
    this.emit();
    try {
      const result = await this.client.kbRetrieve(this.session.id, query);
      this.lastAnswer = result.answer;
      this.lastSources = result.sources;
      this.avatarState = "speaking";
      this.emit();
      return result.answer;
    } catch (err) {
      this.error = err instanceof Error ? err.message : "kb_retrieve failed";
      this.avatarState = "idle";
      this.emit();
      throw err;
    }
  }

  async createSupportTicket(subject: string, body: string): Promise<string> {
    if (!this.session) {
      throw new Error("No active session");
    }
    this.error = null;
    this.avatarState = "thinking";
    this.emit();
    try {
      const result = await this.client.createTicket(
        this.session.id,
        subject,
        body,
      );
      this.lastTicketId = result.ticketId;
      this.avatarState = "speaking";
      this.emit();
      return result.ticketId;
    } catch (err) {
      this.error = err instanceof Error ? err.message : "create_ticket failed";
      this.avatarState = "idle";
      this.emit();
      throw err;
    }
  }

  /** Return to idle after speaking (UI timer or explicit). */
  returnToIdle(): void {
    this.avatarState = "idle";
    this.emit();
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap);
  }
}
