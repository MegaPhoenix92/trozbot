/**
 * Loopback bind safety for local demo services.
 * Default host is 127.0.0.1. Non-loopback requires ALLOW_PUBLIC_BIND=true.
 */

export const DEFAULT_BIND_HOST = "127.0.0.1";

const LOOPBACK = new Set(["127.0.0.1", "::1", "localhost"]);

export function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return LOOPBACK.has(h);
}

export type EnvMap = Record<string, string | undefined>;

function readProcessEnv(): EnvMap {
  // Avoid depending on @types/node in packages/core for library build.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as { process?: { env?: EnvMap } };
  return g.process?.env ?? {};
}

export function resolveBindHost(env: EnvMap = readProcessEnv()): string {
  const requested = (env.HOST ?? env.BIND_HOST ?? DEFAULT_BIND_HOST).trim();
  const host = requested.length > 0 ? requested : DEFAULT_BIND_HOST;

  if (isLoopbackHost(host)) {
    return host === "localhost" ? "127.0.0.1" : host;
  }

  // 0.0.0.0 / public interfaces
  const allow =
    env.ALLOW_PUBLIC_BIND === "true" || env.ALLOW_PUBLIC_BIND === "1";
  if (!allow) {
    throw new Error(
      `Refusing to bind non-loopback host "${host}" without ALLOW_PUBLIC_BIND=true. ` +
        `Local demo is unauthenticated and must stay on 127.0.0.1 (set HOST=127.0.0.1).`,
    );
  }
  return host;
}
