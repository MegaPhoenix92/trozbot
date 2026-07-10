import { afterEach, describe, expect, it } from "vitest";
import type http from "node:http";
import {
  CreateTicketOutputSchema,
  KbRetrieveOutputSchema,
  SessionSchema,
} from "@trozbot/core";
import { createOrchestratorApp } from "./create-app.js";
import { listen, healthBody } from "./server.js";

async function jsonFetch(
  base: string,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as unknown;
  return { status: res.status, body };
}

describe("Wave 1 vertical slice", () => {
  let server: http.Server | undefined;
  let base = "";

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
      server = undefined;
    }
  });

  async function boot() {
    const app = createOrchestratorApp();
    server = app.server;
    const bound = await listen(server, 0);
    base = `http://${bound.host}:${bound.port}`;
    return app;
  }

  it("GET /health returns ok (real server)", async () => {
    await boot();
    const { status, body } = await jsonFetch(base, "/health");
    expect(status).toBe(200);
    expect(body).toEqual(healthBody());
    expect((body as { ok: boolean }).ok).toBe(true);
  });

  it("session → kb_retrieve grounded fixture → create_ticket record; rejects disallowed tools", async () => {
    const app = await boot();

    // 1) Start session via real HTTP entry point
    const started = await jsonFetch(base, "/sessions", {
      method: "POST",
      body: JSON.stringify({ correlationId: "wave1-test" }),
    });
    expect(started.status).toBe(201);
    const session = SessionSchema.parse(
      (started.body as { session: unknown }).session,
    );
    expect(session.avatarState).toBe("idle");
    expect(session.correlationId).toBe("wave1-test");

    // 2) kb_retrieve returns grounded fixture answer
    const kb = await jsonFetch(base, `/sessions/${session.id}/tools`, {
      method: "POST",
      body: JSON.stringify({
        tool: "kb_retrieve",
        input: { query: "how do I restart the agent after config changes?" },
      }),
    });
    expect(kb.status).toBe(200);
    const kbBody = kb.body as { ok: boolean; tool: string; result: unknown };
    expect(kbBody.ok).toBe(true);
    expect(kbBody.tool).toBe("kb_retrieve");
    const kbResult = KbRetrieveOutputSchema.parse(kbBody.result);
    expect(kbResult.grounded).toBe(true);
    expect(kbResult.sources.length).toBeGreaterThan(0);
    expect(kbResult.answer.toLowerCase()).toMatch(/restart|agent|config/);
    expect(kbResult.sources[0]!.id).toBe("kb-restart-agent");

    // 3) create_ticket persists in store under policy
    const ticket = await jsonFetch(base, `/sessions/${session.id}/tools`, {
      method: "POST",
      body: JSON.stringify({
        tool: "create_ticket",
        input: {
          subject: "Agent still failing after restart",
          body: "Tried KB restart steps; still 502 on agent endpoint.",
          tenantId: "tenant-demo",
          userId: "user-demo",
        },
      }),
    });
    expect(ticket.status).toBe(200);
    const ticketBody = ticket.body as {
      ok: boolean;
      tool: string;
      result: unknown;
    };
    expect(ticketBody.ok).toBe(true);
    expect(ticketBody.tool).toBe("create_ticket");
    const ticketResult = CreateTicketOutputSchema.parse(ticketBody.result);
    expect(ticketResult.status).toBe("open");
    expect(ticketResult.subject).toBe("Agent still failing after restart");
    expect(ticketResult.tenantId).toBe("tenant-demo");
    expect(ticketResult.userId).toBe("user-demo");

    const stored = app.tickets.get(ticketResult.ticketId);
    expect(stored).toBeDefined();
    expect(stored!.sessionId).toBe(session.id);
    expect(stored!.body).toMatch(/502/);
    expect(stored!.tenantId).toBe("tenant-demo");
    expect(stored!.userId).toBe("user-demo");

    const bySession = app.tickets.listBySession(session.id);
    expect(bySession).toHaveLength(1);

    // 4) Disallowed write tool rejected by policy (never executes)
    const denied = await jsonFetch(base, `/sessions/${session.id}/tools`, {
      method: "POST",
      body: JSON.stringify({
        tool: "reset_password",
        input: { userId: "u-1" },
      }),
    });
    expect(denied.status).toBe(403);
    const deniedBody = denied.body as {
      ok: false;
      error: { code: string; message: string };
    };
    expect(deniedBody.ok).toBe(false);
    expect(deniedBody.error.code).toBe("TOOL_NOT_ALLOWED");

    const audit = app.audit.listBySession(session.id);
    expect(audit.some((e) => e.toolName === "kb_retrieve" && e.status === "ok")).toBe(
      true,
    );
    expect(
      audit.some((e) => e.toolName === "create_ticket" && e.status === "ok"),
    ).toBe(true);
    expect(
      audit.some(
        (e) => e.toolName === "reset_password" && e.status === "denied",
      ),
    ).toBe(true);

    // Invalid create_ticket input → 400 + audit INVALID_INPUT (not TOOL_FAILED)
    const bad = await jsonFetch(base, `/sessions/${session.id}/tools`, {
      method: "POST",
      body: JSON.stringify({
        tool: "create_ticket",
        input: { subject: "", body: "x" },
      }),
    });
    expect(bad.status).toBe(400);
    const badBody = bad.body as {
      ok: false;
      error: { code: string };
    };
    expect(badBody.error.code).toBe("INVALID_INPUT");
    expect(
      app.audit
        .listBySession(session.id)
        .some(
          (e) =>
            e.toolName === "create_ticket" &&
            e.status === "error" &&
            e.errorCode === "INVALID_INPUT",
        ),
    ).toBe(true);
  });

  it("malformed JSON returns 400 INVALID_JSON not 500", async () => {
    await boot();
    const res = await fetch(`${base}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      ok: false;
      error: { code: string };
    };
    expect(body.error.code).toBe("INVALID_JSON");
  });
});
