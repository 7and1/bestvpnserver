import { NextRequest, NextResponse } from "next/server";

import { getRedis } from "./redis";

type RateLimiterName = "api" | "tools" | "probes";

const RATE_LIMITS: Record<
  RateLimiterName,
  { limit: number; windowMs: number }
> = {
  api: { limit: 100, windowMs: 60_000 },
  tools: { limit: 10, windowMs: 60_000 },
  probes: { limit: 1000, windowMs: 60_000 },
};

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

async function checkFixedWindow(
  identifier: string,
  limiter: RateLimiterName,
): Promise<RateLimitResult> {
  const { limit, windowMs } = RATE_LIMITS[limiter];
  const windowId = Math.floor(Date.now() / windowMs);
  const key = `ratelimit:${limiter}:${identifier}:${windowId}`;

  try {
    const redis = getRedis();
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }
    const reset = (windowId + 1) * windowMs;
    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      reset,
    };
  } catch (error) {
    // Fail-open: if Redis is unavailable, allow the request
    console.warn("[RateLimit] Redis unavailable, allowing request:", error);
    return {
      success: true,
      remaining: limit,
      reset: (windowId + 1) * windowMs,
    };
  }
}

export async function checkRateLimit(
  identifier: string,
  limiter: RateLimiterName,
): Promise<RateLimitResult> {
  return checkFixedWindow(identifier, limiter);
}

export async function withRateLimit(
  request: NextRequest,
  limiter: RateLimiterName,
): Promise<NextResponse | null> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const { success, remaining, reset } = await checkFixedWindow(ip, limiter);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      },
    );
  }

  return null;
}
