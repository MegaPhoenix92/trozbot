import { describe, expect, it } from "vitest";
import { healthBody } from "./server.js";

describe("healthBody", () => {
  it("returns consistent ok payload for the orchestrator", () => {
    const a = healthBody();
    const b = healthBody();
    expect(a).toEqual(b);
    expect(a.ok).toBe(true);
    expect(a.service).toBe("trozbot-orchestrator");
    expect(a.wave).toBe(1);
  });
});
