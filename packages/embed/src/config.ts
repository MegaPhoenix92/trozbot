import { AVATAR_STATES, type AvatarState } from "@trozbot/core";
import { assertSafeOriginConfig } from "./origins.js";

export type TrozbotTheme = "default" | "dark";

export interface TrozbotEmbedOptions {
  /**
   * Direct orchestrator base URL (e.g. http://127.0.0.1:8787).
   * Prefer apiProxyPath on production hosts to avoid CORS and keep cookies same-origin.
   */
  orchestratorBaseUrl?: string;
  /**
   * Same-origin API proxy prefix on the host (e.g. "/api").
   * When set (default for demo host), requests go to `${origin}${apiProxyPath}/...`.
   */
  apiProxyPath?: string;
  theme?: TrozbotTheme;
  /** Extra exact origins allowed for postMessage parents (never "*"). */
  allowedOrigins?: string[];
  correlationId?: string;
  /** Runtime branding — always robot. */
  isRobot?: true;
  onTicketCreated?: (ticket: { ticketId: string; subject: string }) => void;
  onError?: (err: { message: string }) => void;
  onAvatarState?: (state: AvatarState) => void;
  /** Injectable fetch (tests). */
  fetchImpl?: typeof fetch;
  /** Override page origin for allowlist checks (tests). */
  pageOrigin?: string;
}

export interface ResolvedEmbedConfig {
  /** Absolute base for orchestrator HTTP (no trailing slash). */
  apiBase: string;
  theme: TrozbotTheme;
  allowedOrigins: string[];
  correlationId: string;
  isRobot: true;
  identityLabel: "TROZBOT robot concierge";
  avatarStates: readonly AvatarState[];
  pageOrigin: string;
}

export class EmbedConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbedConfigError";
  }
}

/**
 * Resolve and validate host options. Fails closed on bad origin allowlists
 * and missing API routing.
 */
export function resolveEmbedConfig(
  options: TrozbotEmbedOptions = {},
  env: { pageOrigin?: string } = {},
): ResolvedEmbedConfig {
  assertSafeOriginConfig(options.allowedOrigins);

  const pageOrigin =
    options.pageOrigin ??
    env.pageOrigin ??
    (typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://127.0.0.1");

  const proxy =
    options.apiProxyPath !== undefined
      ? options.apiProxyPath.replace(/\/$/, "")
      : options.orchestratorBaseUrl
        ? null
        : "/api";

  let apiBase: string;
  if (proxy !== null && proxy !== "") {
    // Same-origin path only — never absolute URLs (would bypass loopback guard).
    if (/^https?:\/\//i.test(proxy) || proxy.startsWith("//")) {
      throw new EmbedConfigError(
        "apiProxyPath must be a same-origin path (e.g. /api), not an absolute URL; use orchestratorBaseUrl for direct loopback",
      );
    }
    const path = proxy.startsWith("/") ? proxy : `/${proxy}`;
    apiBase = `${pageOrigin}${path}`;
  } else if (options.orchestratorBaseUrl) {
    apiBase = options.orchestratorBaseUrl.replace(/\/$/, "");
    if (!isLoopbackHttpUrl(apiBase) && process.env.ALLOW_PUBLIC_ORCHESTRATOR !== "true") {
      // Soft guard for local embed: non-loopback direct URLs need explicit opt-in.
      // Hosts should use apiProxyPath instead.
      throw new EmbedConfigError(
        "orchestratorBaseUrl must be loopback (127.0.0.1/localhost) unless ALLOW_PUBLIC_ORCHESTRATOR=true; prefer apiProxyPath for production hosts",
      );
    }
  } else {
    throw new EmbedConfigError(
      "Provide apiProxyPath (recommended) or orchestratorBaseUrl",
    );
  }

  if (options.isRobot === false as unknown) {
    throw new EmbedConfigError("isRobot must be true — TROZBOT is non-human only");
  }

  return {
    apiBase,
    theme: options.theme ?? "default",
    allowedOrigins: [...(options.allowedOrigins ?? [])],
    correlationId: options.correlationId ?? "embed-host",
    isRobot: true,
    identityLabel: "TROZBOT robot concierge",
    avatarStates: AVATAR_STATES,
    pageOrigin,
  };
}

function isLoopbackHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return (
      u.hostname === "127.0.0.1" ||
      u.hostname === "localhost" ||
      u.hostname === "[::1]" ||
      u.hostname === "::1"
    );
  } catch {
    return false;
  }
}

/** Merge optional window.__TROZBOT__ runtime config (no secrets). */
export function readWindowBootstrap(): Partial<TrozbotEmbedOptions> {
  if (typeof window === "undefined") return {};
  const w = window as Window & { __TROZBOT__?: Partial<TrozbotEmbedOptions> };
  const boot = w.__TROZBOT__;
  if (!boot || typeof boot !== "object") return {};
  const out: Partial<TrozbotEmbedOptions> = {};
  if (typeof boot.orchestratorBaseUrl === "string") {
    out.orchestratorBaseUrl = boot.orchestratorBaseUrl;
  }
  if (typeof boot.apiProxyPath === "string") {
    out.apiProxyPath = boot.apiProxyPath;
  }
  if (boot.theme === "default" || boot.theme === "dark") {
    out.theme = boot.theme;
  }
  if (Array.isArray(boot.allowedOrigins)) {
    out.allowedOrigins = boot.allowedOrigins.filter(
      (x): x is string => typeof x === "string",
    );
  }
  if (typeof boot.correlationId === "string") {
    out.correlationId = boot.correlationId;
  }
  return out;
}
