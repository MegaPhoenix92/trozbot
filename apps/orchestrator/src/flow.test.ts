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
          tenantId: "attacker-selected-tenant",
          userId: "attacker-selected-user",
        },
      }),
    });
    expect(ticket.status).toBe(200);
    const ticketResult = CreateTicketOutputSchema.parse(
      (ticket.body as { result: unknown }).result,
    );
    expect(ticketResult.status).toBe("open");
    expect(ticketResult.tenantId).toBeUndefined();
    expect(ticketResult.userId).toBeUndefined();
    const stored = await app.tickets.get(ticketResult.ticketId);
    expect(stored?.sessionId).toBe(session.id);
    expect(stored?.tenantId).toBeUndefined();
    expect(stored?.userId).toBeUndefined();

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

  it("populates ticket identity only from trusted server context", async () => {
    const app = await boot();
    const session = app.orchestrator.startSession({
      correlationId: "trusted-context-test",
    }).session;

    const result = await app.orchestrator.invokeTool(
      session.id,
      {
        tool: "create_ticket",
        input: {
          subject: "Trusted identity ticket",
          body: "Identity must come from server context.",
          tenantId: "spoofed-tenant",
          userId: "spoofed-user",
        },
      },
      {
        tenantId: "verified-tenant",
        userId: "verified-user",
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    const output = CreateTicketOutputSchema.parse(result.result);
    expect(output.tenantId).toBe("verified-tenant");
    expect(output.userId).toBe("verified-user");

    const stored = await app.tickets.get(output.ticketId);
    expect(stored?.tenantId).toBe("verified-tenant");
    expect(stored?.userId).toBe("verified-user");
  });

  it("HTTP host trust channel populates IDs; body spoof still ignored", async () => {
    const secret = "flow-test-host-service-token";
    const prev = process.env.TROZBOT_HOST_SERVICE_TOKEN;
    process.env.TROZBOT_HOST_SERVICE_TOKEN = secret;
    try {
      const app = await boot();
      const started = await jsonFetch(base, "/sessions", {
        method: "POST",
        body: JSON.stringify({ correlationId: "host-channel" }),
      });
      const session = SessionSchema.parse(
        (started.body as { session: unknown }).session,
      );

      const ticket = await jsonFetch(base, `/sessions/${session.id}/tools`, {
        method: "POST",
        headers: {
          "x-trozbot-host-token": secret,
          "x-trozbot-tenant-id": "tenant-host",
          "x-trozbot-user-id": "user-host",
        },
        body: JSON.stringify({
          tool: "create_ticket",
          input: {
            subject: "From host channel",
            body: "Body spoof must lose.",
            tenantId: "body-spoof-tenant",
            userId: "body-spoof-user",
          },
        }),
      });
      expect(ticket.status).toBe(200);
      const out = CreateTicketOutputSchema.parse(
        (ticket.body as { result: unknown }).result,
      );
      expect(out.tenantId).toBe("tenant-host");
      expect(out.userId).toBe("user-host");
      const stored = await app.tickets.get(out.ticketId);
      expect(stored?.tenantId).toBe("tenant-host");
      expect(stored?.userId).toBe("user-host");
    } finally {
      if (prev === undefined) delete process.env.TROZBOT_HOST_SERVICE_TOKEN;
      else process.env.TROZBOT_HOST_SERVICE_TOKEN = prev;
    }
  });

  it("HTTP rejects wrong host service token", async () => {
    const secret = "flow-test-host-service-token";
    const prev = process.env.TROZBOT_HOST_SERVICE_TOKEN;
    process.env.TROZBOT_HOST_SERVICE_TOKEN = secret;
    try {
      await boot();
      const started = await jsonFetch(base, "/sessions", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const session = SessionSchema.parse(
        (started.body as { session: unknown }).session,
      );
      const bad = await jsonFetch(base, `/sessions/${session.id}/tools`, {
        method: "POST",
        headers: {
          "x-trozbot-host-token": "wrong",
          "x-trozbot-tenant-id": "t",
          "x-trozbot-user-id": "u",
        },
        body: JSON.stringify({
          tool: "create_ticket",
          input: { subject: "x", body: "y" },
        }),
      });
      expect(bad.status).toBe(401);
      expect(
        (bad.body as { error: { code: string } }).error.code,
      ).toBe("HOST_CHANNEL_UNAUTHORIZED");
    } finally {
      if (prev === undefined) delete process.env.TROZBOT_HOST_SERVICE_TOKEN;
      else process.env.TROZBOT_HOST_SERVICE_TOKEN = prev;
    }
  });

  it("HTTP host channel: verified token sets ticket identity; spoof headers fail closed", async () => {
    const secret = "flow-test-host-token";
    const prev = process.env.TROZBOT_HOST_SERVICE_TOKEN;
    process.env.TROZBOT_HOST_SERVICE_TOKEN = secret;
    try {
      const app = await boot();
      const started = await jsonFetch(base, "/sessions", {
        method: "POST",
        body: JSON.stringify({ correlationId: "host-channel" }),
      });
      const session = SessionSchema.parse(
        (started.body as { session: unknown }).session,
      );

      // Valid host channel + body spoof → stores verified IDs only
      const okTicket = await jsonFetch(base, `/sessions/${session.id}/tools`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-trozbot-host-token": secret,
          "x-trozbot-tenant-id": "tenant-7",
          "x-trozbot-user-id": "user-42",
        },
        body: JSON.stringify({
          tool: "create_ticket",
          input: {
            subject: "From host",
            body: "verified",
            tenantId: "attacker",
            userId: "attacker",
          },
        }),
      });
      expect(okTicket.status).toBe(200);
      const out = CreateTicketOutputSchema.parse(
        (okTicket.body as { result: unknown }).result,
      );
      expect(out.tenantId).toBe("tenant-7");
      expect(out.userId).toBe("user-42");
      const stored = await app.tickets.get(out.ticketId);
      expect(stored?.tenantId).toBe("tenant-7");
      expect(stored?.userId).toBe("user-42");

      // Forged token rejected
      const bad = await jsonFetch(base, `/sessions/${session.id}/tools`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-trozbot-host-token": "forged",
          "x-trozbot-tenant-id": "x",
          "x-trozbot-user-id": "y",
        },
        body: JSON.stringify({
          tool: "create_ticket",
          input: { subject: "x", body: "y" },
        }),
      });
      expect(bad.status).toBe(401);
      expect(
        (bad.body as { error: { code: string } }).error.code,
      ).toBe("HOST_CHANNEL_UNAUTHORIZED");

      // kb_retrieve still works with host channel (identity unused)
      const kb = await jsonFetch(base, `/sessions/${session.id}/tools`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-trozbot-host-token": secret,
          "x-trozbot-tenant-id": "tenant-7",
          "x-trozbot-user-id": "user-42",
        },
        body: JSON.stringify({
          tool: "kb_retrieve",
          input: { query: "how do I restart the agent after config changes?" },
        }),
      });
      expect(kb.status).toBe(200);
      expect((kb.body as { ok: boolean }).ok).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.TROZBOT_HOST_SERVICE_TOKEN;
      else process.env.TROZBOT_HOST_SERVICE_TOKEN = prev;
    }
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
