/**
 * Browser UI for TROZBOT robot concierge (Wave 2).
 * Uses orchestrator HTTP API directly (CORS enabled on orchestrator).
 * Clearly non-human — geometric robot avatar only.
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

async function main() {
  const cfgRes = await fetch("/config.json");
  const cfg = await cfgRes.json();
  document.getElementById("identity").textContent = cfg.identityLabel;

  const baseUrl = cfg.orchestratorUrl.replace(/\/$/, "");
  let sessionId = null;

  const btnStart = document.getElementById("btnStart");
  const btnAsk = document.getElementById("btnAsk");
  const btnTicket = document.getElementById("btnTicket");

  btnStart.addEventListener("click", async () => {
    showError("");
    setAvatar("thinking");
    try {
      const res = await fetch(`${baseUrl}/sessions`, {
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
    } catch (err) {
      setAvatar("idle");
      showError(err.message || String(err));
    }
  });

  btnAsk.addEventListener("click", async () => {
    if (!sessionId) return;
    const query = document.getElementById("query").value.trim();
    if (!query) {
      showError("Enter a question for the knowledge base");
      return;
    }
    showError("");
    setAvatar("listening");
    await new Promise((r) => setTimeout(r, 120));
    setAvatar("thinking");
    try {
      const res = await fetch(`${baseUrl}/sessions/${sessionId}/tools`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tool: "kb_retrieve",
          input: { query },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message || "kb_retrieve failed");
      document.getElementById("answer").textContent = data.result.answer;
      setAvatar("speaking");
    } catch (err) {
      setAvatar("idle");
      showError(err.message || String(err));
    }
  });

  btnTicket.addEventListener("click", async () => {
    if (!sessionId) return;
    const subject = document.getElementById("ticketSubject").value.trim();
    const body = document.getElementById("ticketBody").value.trim();
    if (!subject || !body) {
      showError("Ticket subject and body are required");
      return;
    }
    showError("");
    setAvatar("thinking");
    try {
      const res = await fetch(`${baseUrl}/sessions/${sessionId}/tools`, {
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
      setAvatar("speaking");
    } catch (err) {
      setAvatar("idle");
      showError(err.message || String(err));
    }
  });
}

main();
