import { NextRequest, NextResponse } from "next/server";

import { getRedis } from "./redis";

type RateLimiterName = "api" | "tools" | "probes" | "cron" | "webhooks";

type LimiterConfig = {
  limit: number;
  windowMs: number;
  failClosed: boolean;
};

const RATE_LIMITS: Record<RateLimiterName, LimiterConfig> = {
  api: { limit: 100, windowMs: 60_000, failClosed: false },
  tools: { limit: 10, windowMs: 60_000, failClosed: false },
  // Critical endpoints: fail-closed to prevent abuse if Redis is down
  probes: { limit: 1000, windowMs: 60_000, failClosed: true },
  cron: { limit: 10, windowMs: 60_000, failClosed: true },
  webhooks: { limit: 100, windowMs: 60_000, failClosed: true },
};

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Circuit breaker state for Redis failures
 * Tracks consecutive failures and cooldown period
 */
interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const CIRCUIT_BREAKER_THRESHOLD = 5; // Open after N consecutive failures
const CIRCUIT_BREAKER_COOLDOWN_MS = 60_000; // 1 minute cooldown

const circuitBreaker: CircuitBreakerState = {
  failureCount: 0,
  lastFailureTime: 0,
  isOpen: false,
};

/**
 * Checks if the circuit breaker should allow requests to Redis
 */
function shouldAllowRedisAttempt(): boolean {
  const now = Date.now();

  // If circuit is open, check if cooldown has elapsed
  if (circuitBreaker.isOpen) {
    if (now - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_COOLDOWN_MS) {
      // Attempt recovery - reset and allow
      circuitBreaker.isOpen = false;
      circuitBreaker.failureCount = 0;
      console.info("[RateLimit] Circuit breaker cooldown elapsed, attempting recovery");
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Records a Redis failure and updates circuit breaker state
 */
function recordRedisFailure(): void {
  circuitBreaker.failureCount++;
  circuitBreaker.lastFailureTime = Date.now();

  if (circuitBreaker.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true;
    console.error(
      `[RateLimit] Circuit breaker OPEN after ${circuitBreaker.failureCount} consecutive Redis failures`,
    );
  }
}

/**
 * Records a successful Redis operation and resets circuit breaker
 */
function recordRedisSuccess(): void {
  if (circuitBreaker.failureCount > 0) {
    circuitBreaker.failureCount = 0;
    circuitBreaker.isOpen = false;
  }
}

/**
 * Extracts and validates client IP from request headers
 * Uses CF-Connecting-IP in Workers, x-forwarded-for otherwise
 */
function getClientIP(request: NextRequest): string {
  // In Cloudflare Workers, use CF-Connecting-IP which is set by Cloudflare
  const cfConnectingIP = request.headers.get("CF-Connecting-IP");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to x-forwarded-for with validation
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIP = xForwardedFor.split(",")[0]?.trim();
    if (firstIP && /^[a-fA-F0-9.:]+$/.test(firstIP)) {
      return firstIP;
    }
  }

  return "unknown";
}

async function checkFixedWindow(
  identifier: string,
  limiter: RateLimiterName,
): Promise<RateLimitResult> {
  const { limit, windowMs, failClosed } = RATE_LIMITS[limiter];
  const windowId = Math.floor(Date.now() / windowMs);
  const key = `ratelimit:${limiter}:${identifier}:${windowId}`;

  // Check circuit breaker before attempting Redis
  if (!shouldAllowRedisAttempt()) {
    // Circuit breaker is open - fail based on limiter config
    console.warn(`[RateLimit] Circuit breaker OPEN for ${limiter}, failClosed=${failClosed}`);
    return {
      success: !failClosed,
      remaining: 0,
      reset: (windowId + 1) * windowMs,
    };
  }

  try {
    const redis = getRedis();
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }

    recordRedisSuccess();

    const reset = (windowId + 1) * windowMs;
    const success = count <= limit;

    if (!success) {
      console.warn(`[RateLimit] Exceeded for ${limiter}:${identifier}`);
    }

    return {
      success,
      remaining: Math.max(0, limit - count),
      reset,
    };
  } catch (error) {
    recordRedisFailure();

    // Fail-closed for critical endpoints (webhooks, cron, etc.)
    if (failClosed) {
      console.error(
        `[RateLimit] Redis unavailable for critical endpoint ${limiter}, blocking request:`,
        error,
      );
      return {
        success: false,
        remaining: 0,
        reset: (windowId + 1) * windowMs,
      };
    }

    // Fail-open for non-critical endpoints
    console.warn(
      `[RateLimit] Redis unavailable for ${limiter}, allowing request (fail-open):`,
      error,
    );
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
  const ip = getClientIP(request);
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
