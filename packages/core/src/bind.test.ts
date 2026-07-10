import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_BIND_HOST, isLoopbackHost, resolveBindHost } from "./bind.js";

describe("bind safety", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env.HOST = prev.HOST;
    process.env.BIND_HOST = prev.BIND_HOST;
    process.env.ALLOW_PUBLIC_BIND = prev.ALLOW_PUBLIC_BIND;
    if (prev.HOST === undefined) delete process.env.HOST;
    if (prev.BIND_HOST === undefined) delete process.env.BIND_HOST;
    if (prev.ALLOW_PUBLIC_BIND === undefined) delete process.env.ALLOW_PUBLIC_BIND;
  });

  it("defaults to loopback", () => {
    delete process.env.HOST;
    delete process.env.BIND_HOST;
    delete process.env.ALLOW_PUBLIC_BIND;
    expect(resolveBindHost({})).toBe(DEFAULT_BIND_HOST);
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
    expect(isLoopbackHost("0.0.0.0")).toBe(false);
  });

  it("allows 127.0.0.1 and localhost without override", () => {
    expect(resolveBindHost({ HOST: "127.0.0.1" })).toBe("127.0.0.1");
    expect(resolveBindHost({ HOST: "localhost" })).toBe("127.0.0.1");
    expect(resolveBindHost({ BIND_HOST: "::1" })).toBe("::1");
  });

  it("rejects 0.0.0.0 without ALLOW_PUBLIC_BIND", () => {
    expect(() => resolveBindHost({ HOST: "0.0.0.0" })).toThrow(
      /ALLOW_PUBLIC_BIND/,
    );
  });

  it("allows 0.0.0.0 when ALLOW_PUBLIC_BIND=true", () => {
    expect(
      resolveBindHost({ HOST: "0.0.0.0", ALLOW_PUBLIC_BIND: "true" }),
    ).toBe("0.0.0.0");
  });
});
