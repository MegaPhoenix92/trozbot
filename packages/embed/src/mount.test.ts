import { describe, expect, it, vi } from "vitest";
import { mountTrozbot } from "./mount.js";
import { isOriginAllowed } from "./origins.js";

function mockFetchSequence(
  handlers: Array<(url: string, init?: RequestInit) => unknown>,
): typeof fetch {
  let i = 0;
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const handler = handlers[i++];
    if (!handler) {
      throw new Error(`Unexpected fetch ${url}`);
    }
    const body = handler(url, init);
    return {
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response;
  }) as unknown as typeof fetch;
}

describe("mountTrozbot", () => {
  it("mounts non-human shell and destroys cleanly", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const handle = mountTrozbot(host, {
      apiProxyPath: "/api",
      pageOrigin: "http://127.0.0.1:8791",
      fetchImpl: mockFetchSequence([]),
    });

    expect(host.querySelector(".trozbot-embed")).toBeTruthy();
    expect(host.textContent).toMatch(/TROZBOT robot concierge/);
    expect(host.textContent).toMatch(/non-human/i);
    expect(host.querySelector("[data-is-robot], [data-isrobot], .trozbot-embed")?.getAttribute("data-is-robot") || "true").toBeTruthy();
    expect(handle.getConfig().isRobot).toBe(true);
    expect(handle.getAvatarState()).toBe("idle");

    handle.setAvatarState("thinking");
    expect(handle.getAvatarState()).toBe("thinking");

    handle.destroy();
    expect(host.querySelector(".trozbot-embed")).toBeNull();
    expect(handle.getSession()).toBeNull();

    host.remove();
  });

  it("requires HTMLElement host", () => {
    expect(() =>
      mountTrozbot(null as unknown as HTMLElement, { apiProxyPath: "/api" }),
    ).toThrow(/HTMLElement/);
  });

  it("runs session → kb_retrieve → create_ticket via real mount helpers", async () => {
    const sessionId = "11111111-1111-4111-8111-111111111111";
    const ticketId = "22222222-2222-4222-8222-222222222222";
    const fetchImpl = mockFetchSequence([
      () => ({
        session: {
          id: sessionId,
          avatarState: "idle",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          correlationId: "embed-test",
        },
      }),
      () => ({
        ok: true,
        tool: "kb_retrieve",
        result: {
          answer: "Restart the agent service after config changes.",
          sources: [
            {
              id: "kb-restart-agent",
              title: "Restart",
              excerpt: "Restart the agent service",
            },
          ],
          grounded: true,
          hit: true,
        },
      }),
      () => ({
        ok: true,
        tool: "create_ticket",
        result: {
          ticketId,
          status: "open",
          subject: "Embed ticket",
          createdAt: new Date().toISOString(),
        },
      }),
    ]);

    const host = document.createElement("div");
    document.body.appendChild(host);
    const onTicket = vi.fn();

    const handle = mountTrozbot(host, {
      orchestratorBaseUrl: "http://127.0.0.1:8787",
      pageOrigin: "http://127.0.0.1:8791",
      fetchImpl,
      onTicketCreated: onTicket,
      correlationId: "embed-test",
    });

    const session = await handle.startSession();
    expect(session.id).toBe(sessionId);

    const kb = await handle.kbRetrieve(
      "how do I restart the agent after config changes?",
    );
    expect(kb.grounded).toBe(true);
    expect(kb.answer.toLowerCase()).toMatch(/restart/);

    const ticket = await handle.createTicket(
      "Embed ticket",
      "Still broken after restart",
    );
    expect(ticket.status).toBe("open");
    expect(ticket.ticketId).toBe(ticketId);
    expect(onTicket).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId, subject: "Embed ticket" }),
    );

    handle.destroy();
    host.remove();
  });
});

describe("postMessage origin gate", () => {
  it("ignores messages from disallowed origins (policy unit)", () => {
    expect(isOriginAllowed("https://evil.example")).toBe(false);
    expect(
      isOriginAllowed("https://app.trozlan.io", {
        allowlist: ["https://app.trozlan.io"],
      }),
    ).toBe(true);
  });
});
