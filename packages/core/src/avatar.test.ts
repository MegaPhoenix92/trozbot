import { describe, expect, it } from "vitest";
import { AvatarStateSchema, AVATAR_STATES } from "./avatar.js";

describe("AvatarStateSchema", () => {
  it("accepts the four robot presentation states", () => {
    for (const state of ["idle", "listening", "thinking", "speaking"] as const) {
      expect(AvatarStateSchema.parse(state)).toBe(state);
    }
  });

  it("rejects human-masquerade or unknown states", () => {
    expect(() => AvatarStateSchema.parse("human_agent")).toThrow();
    expect(() => AvatarStateSchema.parse("typing")).toThrow();
    expect(() => AvatarStateSchema.parse("")).toThrow();
  });

  it("exports a stable allowlist matching the schema", () => {
    expect([...AVATAR_STATES].sort()).toEqual(
      ["idle", "listening", "speaking", "thinking"].sort(),
    );
  });
});
