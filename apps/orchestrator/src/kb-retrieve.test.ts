import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

describe("FixtureKbRetriever /goal loop doc (default kb.json)", () => {
  const fixturePath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../fixtures/kb.json",
  );
  const fixtureDocs = JSON.parse(readFileSync(fixturePath, "utf8")) as Array<{
    id: string;
    title: string;
    body: string;
    tags: string[];
  }>;
  const kb = new FixtureKbRetriever(fixtureDocs);

  it.each([
    "how does the goal loop work?",
    "what is the outer agent goal?",
    "when should the builder stop?",
  ])("grounds goal-loop query: %s", (query) => {
    const out = kb.retrieve({ query });
    expect(out.hit).toBe(true);
    expect(out.grounded).toBe(true);
    expect(out.sources[0]!.id).toBe("kb-goal-loop");
    expect(out.answer.toLowerCase()).toMatch(/review|stop|goal|builder|orchestrator/);
  });

  it("still honest-misses unrelated queries against full fixture", () => {
    const out = kb.retrieve({
      query: "xyzzy quantum flibbertigibbet unrelated 99999",
    });
    expect(out.hit).toBe(false);
    expect(out.grounded).toBe(false);
    expect(out.sources).toEqual([]);
  });
});
