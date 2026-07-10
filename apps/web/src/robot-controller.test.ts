import { afterEach, describe, expect, it } from "vitest";
import type http from "node:http";
import { createOrchestratorApp } from "../../orchestrator/src/create-app.js";
import { listen as orchListen } from "../../orchestrator/src/server.js";
import { OrchestratorClient } from "./orchestrator-client.js";
import { RobotController } from "./robot-controller.js";

describe("RobotController + OrchestratorClient (real orchestrator)", () => {
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

  async function bootOrch() {
    const app = await createOrchestratorApp({ forceMemory: true });
    server = app.server;
    const bound = await orchListen(server, 0, "127.0.0.1");
    base = `http://${bound.host}:${bound.port}`;
    return app;
  }

  it("wires session → avatar states → kb grounded → create_ticket; identity is robot", async () => {
    await bootOrch();
    const client = new OrchestratorClient({ baseUrl: base });
    const robot = new RobotController(client);

    const snaps: string[] = [];
    robot.subscribe((s) => snaps.push(s.avatarState));

    expect(robot.snapshot().isRobot).toBe(true);
    expect(robot.snapshot().identityLabel).toMatch(/robot/i);
    expect(robot.snapshot().identityLabel.toLowerCase()).not.toMatch(
      /human|support rep|agent person/,
    );

    const session = await robot.startSession("wave2-test");
    expect(session.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(robot.snapshot().avatarState).toBe("idle");
    expect(robot.snapshot().session?.id).toBe(session.id);

    robot.beginListening();
    expect(robot.snapshot().avatarState).toBe("listening");

    const answer = await robot.askKnowledgeBase(
      "how do I restart the agent after config changes?",
    );
    expect(answer.toLowerCase()).toMatch(/restart|agent|config/);
    expect(robot.snapshot().avatarState).toBe("speaking");
    expect(robot.snapshot().lastSources.length).toBeGreaterThan(0);
    expect(robot.snapshot().lastSources[0]!.id).toBe("kb-restart-agent");

    const ticketId = await robot.createSupportTicket(
      "Still broken after restart",
      "Followed KB restart steps; agent still 502.",
    );
    expect(ticketId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(robot.snapshot().lastTicketId).toBe(ticketId);
    expect(robot.snapshot().avatarState).toBe("speaking");

    // Disallowed tool rejected by orchestrator policy (client path)
    const denied = await client.invokeTool(session.id, "reset_password", {
      userId: "x",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.error.code).toBe("TOOL_NOT_ALLOWED");
    }

    // State machine visited expected transitions
    expect(snaps).toContain("thinking");
    expect(snaps).toContain("listening");
    expect(snaps).toContain("speaking");
    expect(snaps).toContain("idle");
  });

  it("rejects unknown avatar states", () => {
    const client = new OrchestratorClient({
      baseUrl: "http://127.0.0.1:9",
    });
    const robot = new RobotController(client);
    expect(() => robot.setAvatarState("human_agent" as "idle")).toThrow();
  });
});
