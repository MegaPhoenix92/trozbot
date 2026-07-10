import {
  AvatarStateSchema,
  type AvatarState,
  type KbRetrieveOutput,
  type Session,
} from "@trozbot/core";
import { EmbedOrchestratorClient } from "./client.js";
import {
  readWindowBootstrap,
  resolveEmbedConfig,
  type ResolvedEmbedConfig,
  type TrozbotEmbedOptions,
} from "./config.js";
import { isOriginAllowed } from "./origins.js";

export interface TrozbotHandle {
  destroy(): void;
  setAvatarState(state: AvatarState): void;
  getAvatarState(): AvatarState;
  getSession(): Session | null;
  /** Programmatic Phase 1 flow helpers (also used by fixture). */
  startSession(): Promise<Session>;
  kbRetrieve(query: string): Promise<KbRetrieveOutput>;
  createTicket(
    subject: string,
    body: string,
  ): Promise<{ ticketId: string; status: "open" }>;
  getConfig(): ResolvedEmbedConfig;
}

const STYLE_ID = "trozbot-embed-styles";

function ensureStyles(theme: string): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.trozbot-embed{font-family:ui-sans-serif,system-ui,sans-serif;border:1px solid #2a3344;border-radius:12px;padding:16px;max-width:420px;background:${theme === "dark" ? "#0f1419" : "#f7f9fc"};color:${theme === "dark" ? "#e7ecf3" : "#122"} }
.trozbot-embed .badge{display:inline-block;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#0b6;margin:0 0 8px}
.trozbot-embed .avatar{width:88px;height:88px;border-radius:16px;background:#1b2433;display:flex;align-items:center;justify-content:center;margin:8px 0;position:relative}
.trozbot-embed .robot-face{width:64px;height:48px;position:relative}
.trozbot-embed .eye{width:10px;height:10px;border-radius:50%;background:#7fdbff;position:absolute;top:12px}
.trozbot-embed .eye.left{left:12px}.trozbot-embed .eye.right{right:12px}
.trozbot-embed .mouth{width:28px;height:6px;border-radius:3px;background:#7fdbff;position:absolute;left:18px;bottom:8px}
.trozbot-embed .state{font-size:13px;opacity:.85}
.trozbot-embed button{margin:4px 4px 4px 0;padding:8px 12px;border-radius:8px;border:0;background:#2563eb;color:#fff;cursor:pointer}
.trozbot-embed button:disabled{opacity:.5;cursor:not-allowed}
.trozbot-embed textarea,.trozbot-embed input{width:100%;box-sizing:border-box;margin:4px 0 8px;padding:8px;border-radius:8px;border:1px solid #334}
.trozbot-embed .answer{white-space:pre-wrap;font-size:13px;background:#111827;color:#e5e7eb;padding:10px;border-radius:8px;min-height:48px}
.trozbot-embed .error{color:#f66;font-size:13px}
.trozbot-embed .muted{font-size:12px;opacity:.75}
`;
  document.head.appendChild(style);
}

/**
 * Mount TROZBOT robot shell into a host element.
 * Non-human branding only. Phase 1 tools via orchestrator only.
 */
export function mountTrozbot(
  el: HTMLElement,
  options: TrozbotEmbedOptions = {},
): TrozbotHandle {
  if (!el || !(el instanceof HTMLElement)) {
    throw new Error("mountTrozbot requires a host HTMLElement");
  }

  const merged: TrozbotEmbedOptions = {
    ...readWindowBootstrap(),
    ...options,
  };
  const config = resolveEmbedConfig(merged);
  const client = new EmbedOrchestratorClient({
    apiBase: config.apiBase,
    fetchImpl: merged.fetchImpl,
  });

  ensureStyles(config.theme);

  let destroyed = false;
  let avatarState: AvatarState = "idle";
  let session: Session | null = null;
  const root = document.createElement("div");
  root.className = "trozbot-embed";
  root.dataset.trozbot = "1";
  root.dataset.isRobot = "true";
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", config.identityLabel);

  root.innerHTML = `
    <p class="badge">${config.identityLabel}</p>
    <p class="muted">Clearly non-human robot · Phase 1 tools: kb_retrieve + create_ticket</p>
    <div class="avatar" data-state="idle" role="img" aria-label="Robot avatar state: idle">
      <div class="robot-face" aria-hidden="true">
        <div class="eye left"></div><div class="eye right"></div><div class="mouth"></div>
      </div>
    </div>
    <p class="state">State: <strong data-state-text>idle</strong> · Session: <code data-session>none</code></p>
    <button type="button" data-action="start">Start session</button>
    <label class="muted">Ask KB<textarea data-query rows="2" placeholder="How do I restart the agent?"></textarea></label>
    <button type="button" data-action="ask" disabled>Get KB answer</button>
    <label class="muted">Ticket subject<input data-subject type="text" /></label>
    <label class="muted">Ticket body<textarea data-body rows="2"></textarea></label>
    <button type="button" data-action="ticket" disabled>Create ticket</button>
    <pre class="answer" data-answer>—</pre>
    <p class="muted" data-ticket>—</p>
    <p class="error" data-error hidden></p>
  `;

  el.replaceChildren(root);

  const stateText = root.querySelector("[data-state-text]") as HTMLElement;
  const sessionEl = root.querySelector("[data-session]") as HTMLElement;
  const answerEl = root.querySelector("[data-answer]") as HTMLElement;
  const ticketEl = root.querySelector("[data-ticket]") as HTMLElement;
  const errorEl = root.querySelector("[data-error]") as HTMLElement;
  const avatarEl = root.querySelector(".avatar") as HTMLElement;
  const btnStart = root.querySelector('[data-action="start"]') as HTMLButtonElement;
  const btnAsk = root.querySelector('[data-action="ask"]') as HTMLButtonElement;
  const btnTicket = root.querySelector(
    '[data-action="ticket"]',
  ) as HTMLButtonElement;
  const queryEl = root.querySelector("[data-query]") as HTMLTextAreaElement;
  const subjectEl = root.querySelector("[data-subject]") as HTMLInputElement;
  const bodyEl = root.querySelector("[data-body]") as HTMLTextAreaElement;

  function setError(msg: string | null): void {
    if (msg) {
      errorEl.hidden = false;
      errorEl.textContent = msg;
      merged.onError?.({ message: msg });
    } else {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
  }

  function setAvatarState(state: AvatarState): void {
    avatarState = AvatarStateSchema.parse(state);
    stateText.textContent = avatarState;
    avatarEl.dataset.state = avatarState;
    avatarEl.setAttribute("aria-label", `Robot avatar state: ${avatarState}`);
    merged.onAvatarState?.(avatarState);
  }

  function refreshSessionUi(): void {
    sessionEl.textContent = session?.id ?? "none";
    btnAsk.disabled = !session;
    btnTicket.disabled = !session;
  }

  async function startSession(): Promise<Session> {
    if (destroyed) throw new Error("embed destroyed");
    setError(null);
    setAvatarState("thinking");
    try {
      const next = await client.startSession(config.correlationId);
      if (destroyed) throw new Error("embed destroyed");
      session = next;
      setAvatarState("idle");
      refreshSessionUi();
      return session;
    } catch (e) {
      if (!destroyed) setAvatarState("idle");
      const msg = e instanceof Error ? e.message : String(e);
      if (!destroyed) setError(msg);
      throw e;
    }
  }

  async function kbRetrieve(query: string): Promise<KbRetrieveOutput> {
    if (destroyed) throw new Error("embed destroyed");
    if (!session) throw new Error("Start a session first");
    setError(null);
    setAvatarState("listening");
    setAvatarState("thinking");
    try {
      const result = await client.kbRetrieve(session.id, query);
      if (destroyed) throw new Error("embed destroyed");
      setAvatarState("speaking");
      answerEl.textContent = result.answer;
      setAvatarState("idle");
      return result;
    } catch (e) {
      if (!destroyed) setAvatarState("idle");
      const msg = e instanceof Error ? e.message : String(e);
      if (!destroyed) setError(msg);
      throw e;
    }
  }

  async function createTicket(
    subject: string,
    body: string,
  ): Promise<{ ticketId: string; status: "open" }> {
    if (destroyed) throw new Error("embed destroyed");
    if (!session) throw new Error("Start a session first");
    setError(null);
    setAvatarState("thinking");
    try {
      const result = await client.createTicket(session.id, subject, body);
      if (destroyed) throw new Error("embed destroyed");
      setAvatarState("speaking");
      ticketEl.textContent = `Ticket ${result.ticketId} (${result.status})`;
      merged.onTicketCreated?.({
        ticketId: result.ticketId,
        subject: result.subject,
      });
      setAvatarState("idle");
      return { ticketId: result.ticketId, status: "open" };
    } catch (e) {
      if (!destroyed) setAvatarState("idle");
      const msg = e instanceof Error ? e.message : String(e);
      if (!destroyed) setError(msg);
      throw e;
    }
  }

  const onMessage = (ev: MessageEvent): void => {
    if (destroyed) return;
    if (!isOriginAllowed(ev.origin, { allowlist: config.allowedOrigins })) {
      return;
    }
    const data = ev.data as { type?: string; state?: string } | null;
    if (!data || typeof data !== "object") return;
    if (data.type === "trozbot:setAvatarState" && typeof data.state === "string") {
      try {
        setAvatarState(AvatarStateSchema.parse(data.state));
      } catch {
        /* ignore invalid */
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("message", onMessage);
  }

  btnStart.addEventListener("click", () => {
    void startSession();
  });
  btnAsk.addEventListener("click", () => {
    void kbRetrieve(queryEl.value.trim() || "help");
  });
  btnTicket.addEventListener("click", () => {
    void createTicket(
      subjectEl.value.trim() || "Embed ticket",
      bodyEl.value.trim() || "Created from embed host",
    );
  });

  refreshSessionUi();

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("message", onMessage);
      }
      root.remove();
      session = null;
    },
    setAvatarState,
    getAvatarState: () => avatarState,
    getSession: () => session,
    startSession,
    kbRetrieve,
    createTicket,
    getConfig: () => config,
  };
}

/**
 * Optional iframe helper: build a srcdoc/shell URL contract.
 * Prefer same-origin mount; iframe parents must pass allowlist origins.
 */
export function buildIframePostMessageContract(): {
  inboundType: "trozbot:setAvatarState";
  emittedEvents: readonly [];
  note: string;
} {
  return {
    inboundType: "trozbot:setAvatarState",
    emittedEvents: [],
    note: "Phase 1 embed emits callbacks directly; no child-to-parent postMessage events are emitted. Parent-to-child messages require an exact origin allowlist.",
  };
}
