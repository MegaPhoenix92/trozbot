import { afterEach, describe, expect, it } from "vitest";
import type http from "node:http";
import { createWebServer, listen } from "./server.js";

describe("trozbot-web server", () => {
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

  it("serves /health and index with robot identity config", async () => {
    server = createWebServer({
      orchestratorUrl: "http://127.0.0.1:8787",
    });
    const bound = await listen(server, 0);
    base = `http://${bound.host}:${bound.port}`;

    const health = await fetch(`${base}/health`);
    expect(health.status).toBe(200);
    const h = (await health.json()) as {
      ok: boolean;
      service: string;
      wave: number;
      apiProxy?: string;
    };
    expect(h.ok).toBe(true);
    expect(h.service).toBe("trozbot-web");
    expect(h.wave).toBe(2);
    expect(h.apiProxy).toBe("/api");

    const cfg = await fetch(`${base}/config.json`);
    const config = (await cfg.json()) as {
      isRobot: boolean;
      identityLabel: string;
      avatarStates: string[];
      apiBase: string;
    };
    expect(config.isRobot).toBe(true);
    expect(config.identityLabel).toMatch(/robot/i);
    expect(config.apiBase).toBe("/api");
    expect(config.avatarStates).toEqual([
      "idle",
      "listening",
      "thinking",
      "speaking",
    ]);

    const page = await fetch(`${base}/`);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toMatch(/TROZBOT/);
    expect(html).toMatch(/non-human|robot/i);
    expect(html.toLowerCase()).not.toMatch(/i'?m a support rep/);

    // Path traversal blocked
    const trav = await fetch(`${base}/....//etc/passwd`);
    expect([400, 404]).toContain(trav.status);
  });
});
