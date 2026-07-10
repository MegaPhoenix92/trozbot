/**
 * Origin allowlist for parent postMessage / host trust decisions.
 * Default: deny wide-open — only loopback localhost patterns unless extended.
 */

/** Default patterns: loopback only (any port). */
export const DEFAULT_ORIGIN_PATTERNS: readonly RegExp[] = [
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/\[::1\](?::\d+)?$/i,
];

export function isOriginAllowed(
  origin: string,
  opts?: {
    /** Extra exact origins (e.g. https://app.trozlan.io). */
    allowlist?: readonly string[];
    /** Override default patterns (tests). Empty array = no default loopback. */
    defaultPatterns?: readonly RegExp[];
  },
): boolean {
  if (!origin || origin === "null") {
    return false;
  }

  const extras = opts?.allowlist ?? [];
  if (extras.includes(origin)) {
    return true;
  }

  const patterns = opts?.defaultPatterns ?? DEFAULT_ORIGIN_PATTERNS;
  return patterns.some((re) => re.test(origin));
}

/**
 * Validate a candidate parent origin before accepting postMessage.
 * Returns false for "*" or empty allow-all attempts.
 */
export function assertSafeOriginConfig(allowlist?: readonly string[]): void {
  if (!allowlist) return;
  for (const o of allowlist) {
    if (o === "*" || o === "null" || o.trim() === "") {
      throw new Error(
        `Invalid allowedOrigins entry "${o}": wildcards and empty origins are denied`,
      );
    }
  }
}
