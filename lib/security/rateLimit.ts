type RateLimitRecord = {
  count: number;
  resetAt: number;
};

export type RateLimitResult =
  | {
      allowed: true;
      limit: number;
      remaining: number;
      resetAt: number;
    }
  | {
      allowed: false;
      limit: number;
      remaining: 0;
      resetAt: number;
      retryAfterSeconds: number;
    };

type RateLimitOptions = {
  key: string;
  limit?: number;
  windowMs?: number;
};

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 1000 * 60 * 10;

const globalForRateLimit = globalThis as typeof globalThis & {
  __briefRateLimit?: Map<string, RateLimitRecord>;
};

const rateLimitStore =
  globalForRateLimit.__briefRateLimit ?? new Map<string, RateLimitRecord>();

globalForRateLimit.__briefRateLimit = rateLimitStore;

function cleanupExpired(now: number) {
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();

  return (
    firstForwardedIp ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "local"
  );
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const limit =
    options.limit ??
    parsePositiveInt(process.env.BRIEF_RATE_LIMIT_MAX, DEFAULT_LIMIT);
  const windowMs =
    options.windowMs ??
    parsePositiveInt(process.env.BRIEF_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
  const now = Date.now();

  cleanupExpired(now);

  const current =
    rateLimitStore.get(options.key) ??
    ({
      count: 0,
      resetAt: now + windowMs
    } satisfies RateLimitRecord);

  if (current.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  rateLimitStore.set(options.key, current);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt
  };
}

export function resetRateLimitForTests() {
  rateLimitStore.clear();
}
