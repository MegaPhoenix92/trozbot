import { describe, expect, it } from "vitest";
import {
  SessionSchema,
  StartSessionRequestSchema,
  StartSessionResponseSchema,
} from "./session.js";

const validSession = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  avatarState: "idle" as const,
  createdAt: "2026-07-10T12:00:00.000Z",
  updatedAt: "2026-07-10T12:00:00.000Z",
};

describe("SessionSchema", () => {
  it("accepts a valid session with robot idle state", () => {
    expect(SessionSchema.parse(validSession)).toEqual(validSession);
  });

  it("accepts optional correlationId", () => {
    const withCorr = { ...validSession, correlationId: "web-client-1" };
    expect(SessionSchema.parse(withCorr).correlationId).toBe("web-client-1");
  });

  it("rejects non-uuid session ids", () => {
    expect(() =>
      SessionSchema.parse({ ...validSession, id: "not-a-uuid" }),
    ).toThrow();
  });

  it("rejects invalid avatar states on session", () => {
    expect(() =>
      SessionSchema.parse({ ...validSession, avatarState: "agent" }),
    ).toThrow();
  });
});

describe("StartSessionRequestSchema / Response", () => {
  it("allows empty start payload", () => {
    expect(StartSessionRequestSchema.parse({})).toEqual({});
  });

  it("parses a start response envelope", () => {
    const res = StartSessionResponseSchema.parse({ session: validSession });
    expect(res.session.id).toBe(validSession.id);
    expect(res.session.avatarState).toBe("idle");
  });
});
