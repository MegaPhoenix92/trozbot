import type { SttProvider } from "./stt.js";
import type { TtsProvider, TtsResult } from "./tts.js";
import type { GatewayOrchestratorClient } from "./orchestrator-client.js";

export type VoiceTurnIntent =
  | { kind: "kb"; query: string }
  | { kind: "ticket"; subject: string; body: string };

export interface VoiceTurnResult {
  sessionId: string;
  transcript: string;
  intent: VoiceTurnIntent;
  answerText: string;
  tts: TtsResult;
  ticketId?: string;
  sttStubbed: boolean;
  ttsStubbed: boolean;
  grounded?: boolean;
}

/**
 * One duplex turn: STT → intent → orchestrator tool → TTS.
 * Tools remain Phase 1 only (kb_retrieve / create_ticket) — policy enforced server-side.
 */
export class VoiceSessionPipeline {
  constructor(
    private readonly orch: GatewayOrchestratorClient,
    private readonly stt: SttProvider,
    private readonly tts: TtsProvider,
  ) {}

  async startSession(correlationId = "voice-gateway"): Promise<string> {
    const session = await this.orch.startSession(correlationId);
    return session.id;
  }

  /**
   * Process a user audio (or stub text) turn for KB answer.
   */
  async handleKbTurn(
    sessionId: string,
    audio: Buffer | string,
    textHint?: string,
  ): Promise<VoiceTurnResult> {
    const stt = await this.stt.transcribe(audio, textHint);
    const kb = await this.orch.kbRetrieve(sessionId, stt.text);
    const tts = await this.tts.synthesize(kb.answer);
    return {
      sessionId,
      transcript: stt.text,
      intent: { kind: "kb", query: stt.text },
      answerText: kb.answer,
      tts,
      sttStubbed: stt.stubbed,
      ttsStubbed: tts.stubbed,
      grounded: kb.grounded,
    };
  }

  /**
   * Process a turn that creates a support ticket (after STT of ticket request).
   */
  async handleTicketTurn(
    sessionId: string,
    audio: Buffer | string,
    opts: { subject?: string; body?: string; textHint?: string },
  ): Promise<VoiceTurnResult> {
    const stt = await this.stt.transcribe(audio, opts.textHint);
    const subject = opts.subject ?? `Voice ticket: ${stt.text.slice(0, 80)}`;
    const body = opts.body ?? stt.text;
    const ticket = await this.orch.createTicket(sessionId, subject, body);
    const spoken = `Ticket ${ticket.ticketId} created with status ${ticket.status}.`;
    const tts = await this.tts.synthesize(spoken);
    return {
      sessionId,
      transcript: stt.text,
      intent: { kind: "ticket", subject, body },
      answerText: spoken,
      tts,
      ticketId: ticket.ticketId,
      sttStubbed: stt.stubbed,
      ttsStubbed: tts.stubbed,
    };
  }
}
