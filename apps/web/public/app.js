/**
 * Browser UI for TROZBOT robot concierge.
 * Same-origin /api proxy → orchestrator (no cross-origin ticket API).
 * Clearly non-human — geometric robot avatar only.
 * Local demo is unauthenticated / loopback only.
 */

const STATES = ["idle", "listening", "thinking", "speaking"];

function setAvatar(state) {
  if (!STATES.includes(state)) return;
  const el = document.getElementById("avatar");
  el.className = `avatar state-${state}`;
  el.dataset.state = state;
  el.setAttribute("aria-label", `Robot avatar state: ${state}`);
  document.getElementById("stateText").textContent = state;
}

function showError(msg) {
  const el = document.getElementById("error");
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

function showStatus(msg, kind) {
  const el = document.getElementById("status");
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    el.className = "status";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
  el.className = `status status-${kind || "info"}`;
}

function setAnswer(text, kind) {
  const el = document.getElementById("answer");
  el.textContent = text || "—";
  el.className = kind ? `answer answer-${kind}` : "answer";
}

async function main() {
  const cfgRes = await fetch("/config.json");
  const cfg = await cfgRes.json();
  document.getElementById("identity").textContent = cfg.identityLabel;

  const apiBase = (cfg.apiBase || "/api").replace(/\/$/, "");
  let sessionId = null;

  const btnStart = document.getElementById("btnStart");
  const btnAsk = document.getElementById("btnAsk");
  const btnTicket = document.getElementById("btnTicket");

  document.getElementById("voiceCurl").textContent =
    `curl -s -X POST http://127.0.0.1:8790/v1/session -H 'content-type: application/json' -d '{"correlationId":"ui"}' && echo`;

  btnStart.addEventListener("click", async () => {
    showError("");
    showStatus("");
    setAnswer("—");
    setAvatar("thinking");
    try {
      const res = await fetch(`${apiBase}/sessions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ correlationId: "web-ui" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
      sessionId = data.session.id;
      document.getElementById("sessionId").textContent = sessionId;
      setAvatar(data.session.avatarState || "idle");
      btnAsk.disabled = false;
      btnTicket.disabled = false;
      showStatus("Session started. Ask the knowledge base or create a ticket.", "ok");
    } catch (err) {
      setAvatar("idle");
      showError(
        (err.message || String(err)) +
          " — Is the orchestrator running on :8787?",
      );
    }
  });

  btnAsk.addEventListener("click", async () => {
    if (!sessionId) {
      showError("Start a session first.");
      return;
    }
    const query = document.getElementById("query").value.trim();
    if (!query) {
      showError("Enter a question for the knowledge base (empty query).");
      showStatus("Empty question", "empty");
      return;
    }
    showError("");
    showStatus("Listening / thinking…", "info");
    setAvatar("listening");
    await new Promise((r) => setTimeout(r, 120));
    setAvatar("thinking");
    try {
      const res = await fetch(`${apiBase}/sessions/${sessionId}/tools`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tool: "kb_retrieve",
          input: { query },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message || "kb_retrieve failed");
      const result = data.result;
      setAnswer(result.answer, result.hit ? "hit" : "miss");
      if (result.hit) {
        showStatus(
          `KB hit · grounded · source: ${result.sources?.[0]?.id || "—"}`,
          "ok",
        );
      } else {
        showStatus(
          "KB miss — no matching article (no invented sources). Create a ticket if you need follow-up.",
          "miss",
        );
      }
      setAvatar("speaking");
    } catch (err) {
      setAvatar("idle");
      setAnswer("—", "error");
      showError(err.message || String(err));
      showStatus("KB request failed", "error");
    }
  });

  btnTicket.addEventListener("click", async () => {
    if (!sessionId) {
      showError("Start a session first.");
      return;
    }
    const subject = document.getElementById("ticketSubject").value.trim();
    const body = document.getElementById("ticketBody").value.trim();
    if (!subject || !body) {
      showError("Ticket subject and body are both required.");
      showStatus("Empty ticket fields", "empty");
      return;
    }
    showError("");
    showStatus("Creating ticket…", "info");
    setAvatar("thinking");
    try {
      const res = await fetch(`${apiBase}/sessions/${sessionId}/tools`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tool: "create_ticket",
          input: { subject, body },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message || "create_ticket failed");
      document.getElementById("ticketResult").textContent =
        `Ticket created: ${data.result.ticketId} (${data.result.status})`;
      showStatus("Ticket open (in-memory unless DATABASE_URL is set).", "ok");
      setAvatar("speaking");
    } catch (err) {
      setAvatar("idle");
      showError(err.message || String(err));
      showStatus("Ticket create failed", "error");
    }
  });
}

main();
