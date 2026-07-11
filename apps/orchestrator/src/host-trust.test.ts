import { describe, expect, it } from "vitest";
import {
  deriveTrustedToolContextFromHeaders,
  HOST_TENANT_HEADER,
  HOST_TOKEN_HEADER,
  HOST_USER_HEADER,
} from "./host-trust.js";

describe("deriveTrustedToolContextFromHeaders", () => {
  const secret = "test-host-service-token-not-real";

  it("returns empty context when no trust headers present", () => {
    const r = deriveTrustedToolContextFromHeaders({}, {});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.context).toEqual({});
  });

  it("rejects trust headers when service token env is unset", () => {
    const r = deriveTrustedToolContextFromHeaders(
      {
        [HOST_TOKEN_HEADER]: "anything",
        [HOST_TENANT_HEADER]: "7",
        [HOST_USER_HEADER]: "42",
      },
      {},
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(401);
      expect(r.code).toBe("HOST_CHANNEL_NOT_CONFIGURED");
    }
  });

  it("rejects wrong service token", () => {
    const r = deriveTrustedToolContextFromHeaders(
      {
        [HOST_TOKEN_HEADER]: "wrong-token",
        [HOST_TENANT_HEADER]: "7",
        [HOST_USER_HEADER]: "42",
      },
      { TROZBOT_HOST_SERVICE_TOKEN: secret },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(401);
      expect(r.code).toBe("HOST_CHANNEL_UNAUTHORIZED");
    }
  });

  it("rejects valid token without tenant/user", () => {
    const r = deriveTrustedToolContextFromHeaders(
      { [HOST_TOKEN_HEADER]: secret },
      { TROZBOT_HOST_SERVICE_TOKEN: secret },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.code).toBe("HOST_CHANNEL_INCOMPLETE");
    }
  });

  it("accepts verified host channel", () => {
    const r = deriveTrustedToolContextFromHeaders(
      {
        [HOST_TOKEN_HEADER]: secret,
        [HOST_TENANT_HEADER]: "7",
        [HOST_USER_HEADER]: "42",
      },
      { TROZBOT_HOST_SERVICE_TOKEN: secret },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.context).toEqual({ tenantId: "7", userId: "42" });
    }
  });

  it("rejects whitespace-only trust headers as incomplete/unauthorized", () => {
    const blankTenant = deriveTrustedToolContextFromHeaders(
      {
        [HOST_TOKEN_HEADER]: secret,
        [HOST_TENANT_HEADER]: "   ",
        [HOST_USER_HEADER]: "42",
      },
      { TROZBOT_HOST_SERVICE_TOKEN: secret },
    );
    expect(blankTenant.ok).toBe(false);
    if (!blankTenant.ok) expect(blankTenant.code).toBe("HOST_CHANNEL_INCOMPLETE");

    const blankToken = deriveTrustedToolContextFromHeaders(
      {
        [HOST_TOKEN_HEADER]: "   ",
        [HOST_TENANT_HEADER]: "7",
        [HOST_USER_HEADER]: "42",
      },
      { TROZBOT_HOST_SERVICE_TOKEN: secret },
    );
    expect(blankToken.ok).toBe(false);
    if (!blankToken.ok) expect(blankToken.code).toBe("HOST_CHANNEL_UNAUTHORIZED");
  });
});
