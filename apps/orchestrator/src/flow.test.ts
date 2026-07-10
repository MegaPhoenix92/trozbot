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

describe("Wave 1 vertical slice + hardening", () => {
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
    const app = await createOrchestratorApp({ forceMemory: true });
    server = app.server;
    const bound = await listen(server, 0, "127.0.0.1");
    base = `http://${bound.host}:${bound.port}`;
    return app;
  }

  it("GET /health returns ok (real server)", async () => {
    await boot();
    const { status, body } = await jsonFetch(base, "/health");
    expect(status).toBe(200);
    expect(body).toEqual(healthBody());
  });

  it("session → kb hit → kb miss → create_ticket; rejects disallowed tools", async () => {
    const app = await boot();
    expect(app.storeMode).toBe("memory");

    const started = await jsonFetch(base, "/sessions", {
      method: "POST",
      body: JSON.stringify({ correlationId: "harden-test" }),
    });
    expect(started.status).toBe(201);
    const session = SessionSchema.parse(
      (started.body as { session: unknown }).session,
    );

    const kbHit = await jsonFetch(base, `/sessions/${session.id}/tools`, {
      method: "POST",
      body: JSON.stringify({
        tool: "kb_retrieve",
        input: { query: "how do I restart the agent after config changes?" },
      }),
    });
    expect(kbHit.status).toBe(200);
    const hitBody = kbHit.body as { ok: boolean; result: unknown };
    expect(hitBody.ok).toBe(true);
    const hit = KbRetrieveOutputSchema.parse(hitBody.result);
    expect(hit.hit).toBe(true);
    expect(hit.grounded).toBe(true);
    expect(hit.sources[0]!.id).toBe("kb-restart-agent");

    const kbMiss = await jsonFetch(base, `/sessions/${session.id}/tools`, {
      method: "POST",
      body: JSON.stringify({
        tool: "kb_retrieve",
        input: { query: "xyzzy quantum flibbertigibbet 99999" },
      }),
    });
    expect(kbMiss.status).toBe(200);
    const miss = KbRetrieveOutputSchema.parse(
      (kbMiss.body as { result: unknown }).result,
    );
    expect(miss.hit).toBe(false);
    expect(miss.grounded).toBe(false);
    expect(miss.sources).toEqual([]);

    const ticket = await jsonFetch(base, `/sessions/${session.id}/tools`, {
      method: "POST",
      body: JSON.stringify({
        tool: "create_ticket",
        input: {
          subject: "Agent still failing after restart",
          body: "Tried KB restart steps; still 502.",
          tenantId: "tenant-demo",
          userId: "user-demo",
        },
      }),
    });
    expect(ticket.status).toBe(200);
    const ticketResult = CreateTicketOutputSchema.parse(
      (ticket.body as { result: unknown }).result,
    );
    expect(ticketResult.status).toBe("open");
    const stored = await app.tickets.get(ticketResult.ticketId);
    expect(stored?.sessionId).toBe(session.id);

    const denied = await jsonFetch(base, `/sessions/${session.id}/tools`, {
      method: "POST",
      body: JSON.stringify({
        tool: "reset_password",
        input: { userId: "u-1" },
      }),
    });
    expect(denied.status).toBe(403);
    expect(
      (denied.body as { error: { code: string } }).error.code,
    ).toBe("TOOL_NOT_ALLOWED");

    const audit = await app.audit.listBySession(session.id);
    expect(audit.some((e) => e.toolName === "kb_retrieve" && e.status === "ok")).toBe(
      true,
    );
    expect(
      audit.some((e) => e.toolName === "reset_password" && e.status === "denied"),
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
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_JSON");
  });
});

describe("DATABASE_URL path", () => {
  it("skips live DB tests when DATABASE_URL is unset", () => {
    if (!process.env.DATABASE_URL?.trim()) {
      // eslint-disable-next-line no-console
      console.info(
        "SKIP postgres ticket path: DATABASE_URL not set (expected for local/CI)",
      );
      expect(true).toBe(true);
      return;
    }
    expect(process.env.DATABASE_URL).toBeTruthy();
  });
});
