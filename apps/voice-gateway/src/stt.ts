/**
 * Speech-to-text edge.
 * Wave 3: stub when STT_API_KEY unset; real provider plug-in later without changing session flow.
 */

export interface SttResult {
  text: string;
  provider: "stub" | "live";
  /** True when no STT credentials — interim path for Phase 1. */
  stubbed: boolean;
}

export interface SttProvider {
  transcribe(audio: Buffer | string, hint?: string): Promise<SttResult>;
}

/**
 * Stub STT: treats UTF-8 "audio" payload or explicit text hint as the transcript.
 * Used when STT_API_KEY is absent (expected for local/CI).
 */
export class StubSttProvider implements SttProvider {
  async transcribe(
    audio: Buffer | string,
    hint?: string,
  ): Promise<SttResult> {
    if (hint?.trim()) {
      return { text: hint.trim(), provider: "stub", stubbed: true };
    }
    const text =
      typeof audio === "string"
        ? audio.trim()
        : audio.toString("utf8").trim();
    if (!text) {
      throw new Error("Stub STT requires text payload or hint when no STT_API_KEY");
    }
    return { text, provider: "stub", stubbed: true };
  }
}

/**
 * Live STT placeholder — refuses to invent credentials.
 * When STT_API_KEY is set, a future PR can wire a real provider; Wave 3 documents the gap.
 */
export class LiveSttProvider implements SttProvider {
  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new Error("LiveSttProvider requires STT_API_KEY");
  }

  async transcribe(): Promise<SttResult> {
    // Do not call external APIs without a locked provider contract.
    throw new Error(
      "Live STT provider not configured for a concrete vendor in Wave 3. " +
        "Unset STT_API_KEY to use stub, or implement vendor adapter in a follow-up.",
    );
  }
}

/**
 * Wave 3 media selection:
 * - No STT_API_KEY → stub (default interim path)
 * - STT_API_KEY set without TROZBOT_LIVE_MEDIA=1 → stub + refuse live (keys alone must not enable partial live path)
 * - Both set → LiveSttProvider (throws until vendor adapter exists)
 */
export function createSttProvider(): SttProvider {
  const key = process.env.STT_API_KEY?.trim();
  if (key && process.env.TROZBOT_LIVE_MEDIA === "1") {
    return new LiveSttProvider(key);
  }
  return new StubSttProvider();
}

/** Throws if live media env is incomplete/unsafe for serving. */
export function assertMediaConfigSafe(): void {
  const stt = Boolean(process.env.STT_API_KEY?.trim());
  const tts = Boolean(process.env.TTS_API_KEY?.trim());
  const live = process.env.TROZBOT_LIVE_MEDIA === "1";
  if (live && (stt || tts)) {
    throw new Error(
      "TROZBOT_LIVE_MEDIA=1 requires a concrete STT/TTS vendor adapter (not shipped in Wave 3). " +
        "Unset TROZBOT_LIVE_MEDIA and keys to use the documented stub interim path.",
    );
  }
}
