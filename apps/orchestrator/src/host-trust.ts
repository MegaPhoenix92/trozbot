/**
 * Host→orchestrator trusted identity channel (Phase 1).
 *
 * Browsers must not be able to forge tenant/user into create_ticket storage.
 * The TROZLANIO host (after isAuthenticated + requireTrozbotAccess) sends:
 *   X-Trozbot-Host-Token: <TROZBOT_HOST_SERVICE_TOKEN>
 *   X-Trozbot-Tenant-Id: <verified tenant string>
 *   X-Trozbot-User-Id: <verified user string>
 *
 * Body tool input tenantId/userId remain non-authoritative (#24).
 */
import { timingSafeEqual } from "node:crypto";
import type { TrustedToolContext } from "./orchestrator.js";

export const HOST_TOKEN_HEADER = "x-trozbot-host-token";
export const HOST_TENANT_HEADER = "x-trozbot-tenant-id";
export const HOST_USER_HEADER = "x-trozbot-user-id";

export type HostTrustResult =
  | { ok: true; context: TrustedToolContext }
  | { ok: false; status: number; code: string; message: string };

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (raw === undefined) return undefined;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function secretsEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    // Still run a compare to reduce trivial timing leaks on length.
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/**
 * Derive TrustedToolContext from request headers + configured service token.
 * - No trust headers → empty context (ok; IDs undefined).
 * - Any trust header without configured token → reject (secret not configured).
 * - Token mismatch → reject.
 * - Valid token requires non-empty tenant + user strings.
 */
export function deriveTrustedToolContextFromHeaders(
  headers: Record<string, string | string[] | undefined>,
  env: NodeJS.ProcessEnv = process.env,
): HostTrustResult {
  const expected = env.TROZBOT_HOST_SERVICE_TOKEN?.trim() || "";
  const token = headerValue(headers, HOST_TOKEN_HEADER);
  const tenantId = headerValue(headers, HOST_TENANT_HEADER);
  const userId = headerValue(headers, HOST_USER_HEADER);

  const anyTrustHeader =
    token !== undefined || tenantId !== undefined || userId !== undefined;

  if (!anyTrustHeader) {
    return { ok: true, context: {} };
  }

  if (!expected) {
    return {
      ok: false,
      status: 401,
      code: "HOST_CHANNEL_NOT_CONFIGURED",
      message:
        "Host trust headers present but TROZBOT_HOST_SERVICE_TOKEN is not configured",
    };
  }

  if (!token || !secretsEqual(token, expected)) {
    return {
      ok: false,
      status: 401,
      code: "HOST_CHANNEL_UNAUTHORIZED",
      message: "Invalid or missing host service token",
    };
  }

  if (!tenantId || !userId) {
    return {
      ok: false,
      status: 400,
      code: "HOST_CHANNEL_INCOMPLETE",
      message:
        "Valid host token requires both X-Trozbot-Tenant-Id and X-Trozbot-User-Id",
    };
  }

  return { ok: true, context: { tenantId, userId } };
}
