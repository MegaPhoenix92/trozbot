import { describe, expect, it } from "vitest";
import { EmbedConfigError, resolveEmbedConfig } from "./config.js";

describe("resolveEmbedConfig", () => {
  it("defaults to same-origin /api proxy", () => {
    const cfg = resolveEmbedConfig({}, { pageOrigin: "http://127.0.0.1:8791" });
    expect(cfg.apiBase).toBe("http://127.0.0.1:8791/api");
    expect(cfg.isRobot).toBe(true);
    expect(cfg.identityLabel).toBe("TROZBOT robot concierge");
    expect(cfg.avatarStates).toEqual([
      "idle",
      "listening",
      "thinking",
      "speaking",
    ]);
  });

  it("accepts loopback orchestratorBaseUrl", () => {
    const cfg = resolveEmbedConfig({
      orchestratorBaseUrl: "http://127.0.0.1:8787/",
      pageOrigin: "http://127.0.0.1:8791",
    });
    expect(cfg.apiBase).toBe("http://127.0.0.1:8787");
  });

  it("rejects non-loopback orchestrator without opt-in", () => {
    expect(() =>
      resolveEmbedConfig({
        orchestratorBaseUrl: "https://api.example.com",
        pageOrigin: "http://127.0.0.1:8791",
      }),
    ).toThrow(EmbedConfigError);
  });

  it("rejects wildcard allowedOrigins", () => {
    expect(() =>
      resolveEmbedConfig({
        apiProxyPath: "/api",
        allowedOrigins: ["*"],
        pageOrigin: "http://127.0.0.1:1",
      }),
    ).toThrow(/wildcard/i);
  });

  it("rejects absolute apiProxyPath (SSRF / loopback bypass)", () => {
    expect(() =>
      resolveEmbedConfig({
        apiProxyPath: "https://evil.example/api",
        pageOrigin: "http://127.0.0.1:1",
      }),
    ).toThrow(/same-origin path/i);
    expect(() =>
      resolveEmbedConfig({
        apiProxyPath: "//evil.example/api",
        pageOrigin: "http://127.0.0.1:1",
      }),
    ).toThrow(/same-origin path/i);
  });
});
