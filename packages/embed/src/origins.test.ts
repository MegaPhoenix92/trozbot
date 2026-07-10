import { describe, expect, it } from "vitest";
import {
  assertSafeOriginConfig,
  isOriginAllowed,
  DEFAULT_ORIGIN_PATTERNS,
} from "./origins.js";

describe("isOriginAllowed", () => {
  it("allows loopback defaults and denies arbitrary origins", () => {
    expect(isOriginAllowed("http://127.0.0.1:5173")).toBe(true);
    expect(isOriginAllowed("http://localhost:3000")).toBe(true);
    expect(isOriginAllowed("https://evil.example")).toBe(false);
    expect(isOriginAllowed("https://app.trozlan.io")).toBe(false);
    expect(isOriginAllowed("*")).toBe(false);
    expect(isOriginAllowed("")).toBe(false);
    expect(isOriginAllowed("null")).toBe(false);
  });

  it("allows exact extras on allowlist only", () => {
    expect(
      isOriginAllowed("https://app.trozlan.io", {
        allowlist: ["https://app.trozlan.io"],
      }),
    ).toBe(true);
    expect(
      isOriginAllowed("https://other.trozlan.io", {
        allowlist: ["https://app.trozlan.io"],
      }),
    ).toBe(false);
  });

  it("can disable default patterns for strict allowlist-only mode", () => {
    expect(
      isOriginAllowed("http://127.0.0.1:1", {
        defaultPatterns: [],
        allowlist: [],
      }),
    ).toBe(false);
  });

  it("exports non-empty default patterns (deny-wide-open baseline)", () => {
    expect(DEFAULT_ORIGIN_PATTERNS.length).toBeGreaterThan(0);
  });
});

describe("assertSafeOriginConfig", () => {
  it("rejects wildcard and empty origins", () => {
    expect(() => assertSafeOriginConfig(["*"])).toThrow(/wildcard/i);
    expect(() => assertSafeOriginConfig([""])).toThrow(/Invalid/);
    expect(() => assertSafeOriginConfig(["https://ok.example"])).not.toThrow();
  });
});
