export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
}

export interface RateLimiter {
  check(key: string, now?: number): RateLimitResult;
  reset(): void;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_MAX_REQUESTS = 5;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const PRUNE_THRESHOLD = 500;

/**
 * Creates an in-memory fixed-window rate limiter keyed by client identifier.
 */
export function createRateLimiter(options?: {
  maxRequests?: number;
  windowMs?: number;
}): RateLimiter {
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const entries = new Map<string, RateLimitEntry>();

  function pruneExpired(now: number): void {
    for (const [entryKey, entry] of entries) {
      if (entry.resetAt <= now) {
        entries.delete(entryKey);
      }
    }
  }

  return {
    check(key: string, now: number = Date.now()): RateLimitResult {
      if (entries.size > PRUNE_THRESHOLD) {
        pruneExpired(now);
      }

      if (maxRequests <= 0) {
        const retryAfterSeconds = Math.max(1, Math.ceil(windowMs / 1000));
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds,
          resetAt: now + windowMs,
        };
      }

      const normalizedKey = key.trim() || "local";
      const existing = entries.get(normalizedKey);

      if (!existing || existing.resetAt <= now) {
        const resetAt = now + windowMs;
        entries.set(normalizedKey, { count: 1, resetAt });
        if (entries.size > PRUNE_THRESHOLD) {
          pruneExpired(now);
        }
        return {
          allowed: true,
          remaining: Math.max(0, maxRequests - 1),
          retryAfterSeconds: 0,
          resetAt,
        };
      }

      if (existing.count >= maxRequests) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((existing.resetAt - now) / 1000)
        );
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds,
          resetAt: existing.resetAt,
        };
      }

      existing.count += 1;
      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - existing.count),
        retryAfterSeconds: 0,
        resetAt: existing.resetAt,
      };
    },

    reset(): void {
      entries.clear();
    },
  };
}

/**
 * Extracts the best-effort client IP address from request headers.
 */
export function extractClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")
      .map((part) => part.trim())
      .find((part) => part.length > 0);
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "local";
}

export const contactRateLimiter = createRateLimiter();
