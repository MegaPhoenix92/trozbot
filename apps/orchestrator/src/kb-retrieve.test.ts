import { describe, expect, it } from "vitest";
import { FixtureKbRetriever } from "./kb-retrieve.js";

const docs = [
  {
    id: "kb-restart-agent",
    title: "Restart the agent service",
    body: "After changing agent configuration, restart the agent service.",
    tags: ["restart", "agent", "config"],
  },
  {
    id: "kb-service-status",
    title: "Check service status",
    body: "Call GET /health for status.",
    tags: ["status", "health"],
  },
];

describe("FixtureKbRetriever hit/miss", () => {
  const kb = new FixtureKbRetriever(docs);

  it("returns grounded hit for matching query", () => {
    const out = kb.retrieve({ query: "restart agent config" });
    expect(out.hit).toBe(true);
    expect(out.grounded).toBe(true);
    expect(out.sources[0]!.id).toBe("kb-restart-agent");
    expect(out.answer.toLowerCase()).toMatch(/restart/);
  });

  it("returns honest miss with no invented sources", () => {
    const out = kb.retrieve({
      query: "xyzzy quantum flibbertigibbet unrelated 99999",
    });
    expect(out.hit).toBe(false);
    expect(out.grounded).toBe(false);
    expect(out.sources).toEqual([]);
    expect(out.answer.toLowerCase()).toMatch(/did not find|no matching/);
  });
});
