/**
 * @vitest-environment node
 *
 * Optional live orchestrator proof (real HTTP client path).
 * Skips when ORCHESTRATOR_URL / default :8787 unreachable.
 */
import { describe, expect, it } from "vitest";
import { EmbedOrchestratorClient } from "./client.js";

const base =
  process.env.ORCHESTRATOR_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8787";

async function orchestratorUp(): Promise<boolean> {
  try {
    const res = await fetch(`${base}/health`, {
      signal: AbortSignal.timeout(800),
    });
    return res.ok;
  } catch {
    return false;
  }
}

describe("live embed client → orchestrator flow", () => {
  it("session → kb_retrieve → create_ticket; policy denies other tools", async () => {
    if (!(await orchestratorUp())) {
      // eslint-disable-next-line no-console
      console.log("SKIP live embed flow: orchestrator not on", base);
      return;
    }

    const client = new EmbedOrchestratorClient({ apiBase: base });
    const session = await client.startSession("embed-integration");
    const kb = await client.kbRetrieve(
      session.id,
      "how do I restart the agent after config changes?",
    );
    expect(kb.hit).toBe(true);
    expect(kb.grounded).toBe(true);
    expect(kb.sources.length).toBeGreaterThan(0);

    const ticket = await client.createTicket(
      session.id,
      "Embed integration ticket",
      "Automated live flow",
    );
    expect(ticket.status).toBe("open");
    expect(ticket.ticketId).toMatch(/^[0-9a-f-]{36}$/i);

    const denied = await client.invokeTool(session.id, "reset_password", {});
    expect(denied.ok).toBe(false);
  });
});
