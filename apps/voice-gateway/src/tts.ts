/**
 * Text-to-speech edge.
 * Wave 3: stub when TTS_API_KEY unset; returns pseudo-audio metadata for the robot "speaking" path.
 */

export interface TtsResult {
  /** Pseudo media descriptor (stub) or future audio bytes base64. */
  audioBase64: string;
  contentType: string;
  provider: "stub" | "live";
  stubbed: boolean;
  spokenText: string;
}

export interface TtsProvider {
  synthesize(text: string): Promise<TtsResult>;
}

export class StubTtsProvider implements TtsProvider {
  async synthesize(text: string): Promise<TtsResult> {
    const spokenText = text.trim();
    if (!spokenText) throw new Error("TTS requires non-empty text");
    // Deterministic pseudo-audio for tests (not real speech).
    const audioBase64 = Buffer.from(`TROZBOT-STUB-AUDIO:${spokenText}`, "utf8").toString(
      "base64",
    );
    return {
      audioBase64,
      contentType: "audio/x-trozbot-stub",
      provider: "stub",
      stubbed: true,
      spokenText,
    };
  }
}

export class LiveTtsProvider implements TtsProvider {
  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new Error("LiveTtsProvider requires TTS_API_KEY");
  }

  async synthesize(): Promise<TtsResult> {
    throw new Error(
      "Live TTS provider not configured for a concrete vendor in Wave 3. " +
        "Unset TTS_API_KEY to use stub, or implement vendor adapter in a follow-up.",
    );
  }
}

export function createTtsProvider(): TtsProvider {
  const key = process.env.TTS_API_KEY?.trim();
  if (key && process.env.TROZBOT_LIVE_MEDIA === "1") {
    return new LiveTtsProvider(key);
  }
  return new StubTtsProvider();
}
