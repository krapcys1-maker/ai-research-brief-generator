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

type ResolvedRateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type UpstashCommandResult = Array<{
  result?: unknown;
  error?: string;
}>;

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 1000 * 60 * 10;

const globalForRateLimit = globalThis as typeof globalThis & {
  __briefRateLimit?: Map<string, RateLimitRecord>;
};

const rateLimitStore =
  globalForRateLimit.__briefRateLimit ?? new Map<string, RateLimitRecord>();

globalForRateLimit.__briefRateLimit = rateLimitStore;

export class RateLimitConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitConfigurationError";
  }
}

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

function parseBoolean(value: string | undefined) {
  return value?.toLowerCase() === "true";
}

function resolveOptions(options: RateLimitOptions): ResolvedRateLimitOptions {
  return {
    key: options.key,
    limit:
      options.limit ??
      parsePositiveInt(process.env.BRIEF_RATE_LIMIT_MAX, DEFAULT_LIMIT),
    windowMs:
      options.windowMs ??
      parsePositiveInt(process.env.BRIEF_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS)
  };
}

function resolveBackend() {
  const rawBackend = process.env.RATE_LIMIT_BACKEND?.trim().toLowerCase();
  const explicitBackend = rawBackend ? rawBackend : undefined;
  const hasUpstashConfig = Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );

  if (explicitBackend && !["memory", "upstash", "redis"].includes(explicitBackend)) {
    throw new RateLimitConfigurationError(
      `Unsupported RATE_LIMIT_BACKEND "${explicitBackend}". Use "memory" or "upstash".`
    );
  }

  const backend = explicitBackend ?? (hasUpstashConfig ? "upstash" : "memory");
  const isProduction = process.env.NODE_ENV === "production";

  if (backend === "memory" && isProduction) {
    if (parseBoolean(process.env.ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION)) {
      return "memory";
    }

    throw new RateLimitConfigurationError(
      "Production requires a shared rate limit backend. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or explicitly set ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION=true for temporary single-instance demos."
    );
  }

  if (backend === "upstash" || backend === "redis") {
    if (!hasUpstashConfig) {
      throw new RateLimitConfigurationError(
        "RATE_LIMIT_BACKEND=upstash requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
      );
    }

    return "upstash";
  }

  return "memory";
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

function checkMemoryRateLimit(options: ResolvedRateLimitOptions): RateLimitResult {
  const now = Date.now();

  cleanupExpired(now);

  const current =
    rateLimitStore.get(options.key) ??
    ({
      count: 0,
      resetAt: now + options.windowMs
    } satisfies RateLimitRecord);

  if (current.count >= options.limit) {
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  rateLimitStore.set(options.key, current);

  return {
    allowed: true,
    limit: options.limit,
    remaining: Math.max(0, options.limit - current.count),
    resetAt: current.resetAt
  };
}

function readCommandNumber(
  results: UpstashCommandResult,
  index: number,
  label: string
) {
  const entry = results[index];

  if (!entry || entry.error) {
    throw new Error(
      `Upstash rate limit ${label} command failed${entry?.error ? `: ${entry.error}` : "."}`
    );
  }

  const numericResult = Number(entry.result);

  if (!Number.isFinite(numericResult)) {
    throw new Error(`Upstash rate limit ${label} command returned an invalid value.`);
  }

  return numericResult;
}

async function checkUpstashRateLimit(
  options: ResolvedRateLimitOptions
): Promise<RateLimitResult> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!restUrl || !token) {
    throw new RateLimitConfigurationError(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for shared rate limiting."
    );
  }

  const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));
  const response = await fetch(`${restUrl.replace(/\/$/, "")}/multi-exec`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([
      ["INCR", options.key],
      ["EXPIRE", options.key, windowSeconds, "NX"],
      ["TTL", options.key]
    ])
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit request failed with ${response.status}.`);
  }

  const results = (await response.json()) as UpstashCommandResult;
  const count = readCommandNumber(results, 0, "INCR");
  const ttl = readCommandNumber(results, 2, "TTL");
  const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;
  const resetAt = Date.now() + retryAfterSeconds * 1000;

  if (count > options.limit) {
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      resetAt,
      retryAfterSeconds
    };
  }

  return {
    allowed: true,
    limit: options.limit,
    remaining: Math.max(0, options.limit - count),
    resetAt
  };
}

export async function checkRateLimit(
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const resolvedOptions = resolveOptions(options);
  const backend = resolveBackend();

  if (backend === "upstash") {
    return checkUpstashRateLimit(resolvedOptions);
  }

  return checkMemoryRateLimit(resolvedOptions);
}

export function resetRateLimitForTests() {
  rateLimitStore.clear();
}
