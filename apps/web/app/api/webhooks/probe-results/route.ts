import { NextRequest, NextResponse } from "next/server";

import { proxyApiRequest } from "@/lib/api/proxy";
import { isWorkers } from "@/lib/runtime";
import { verifyProbeSignature } from "@/lib/auth/probe-signature";
import { getRedis } from "@/lib/redis";
import { withRateLimit } from "@/lib/rate-limit";
import { ProbeResultSchema } from "@/lib/validation/schemas";

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

const allowedIps = new Set(
  (process.env.PROBE_ALLOWED_IPS || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean),
);

/**
 * Validates and extracts a client IP address from headers.
 * Prevents IP injection attacks by validating the format.
 */
function getClientIP(request: NextRequest): string | null {
  // In Cloudflare Workers, use CF-Connecting-IP which is set by Cloudflare
  // This header cannot be spoofed as it's set by the edge
  const cfConnectingIP = request.headers.get("CF-Connecting-IP");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to x-forwarded-for for non-Workers environments
  // Take the first (leftmost) IP which is the original client
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((ip) => ip.trim());
    const firstIP = ips[0];

    // Basic IP validation to prevent injection attacks
    // Reject if contains non-IP characters (newlines, etc.)
    if (firstIP && /^[a-fA-F0-9.:]+$/.test(firstIP)) {
      return firstIP;
    }

    // Log suspicious input
    console.warn(
      "[ProbeWebhook] Suspicious x-forwarded-for value rejected:",
      JSON.stringify(xForwardedFor),
    );
  }

  return null;
}

export async function POST(request: NextRequest) {
  if (isWorkers) {
    return proxyApiRequest("/api/webhooks/probe-results", request);
  }

  const rateLimited = await withRateLimit(request, "probes");
  if (rateLimited) return rateLimited;

  const clientIP = getClientIP(request);
  if (
    process.env.NODE_ENV === "production" &&
    allowedIps.size > 0 &&
    clientIP &&
    !allowedIps.has(clientIP)
  ) {
    console.warn("[ProbeWebhook] Unauthorized IP attempt:", clientIP);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const signature = request.headers.get("x-probe-signature");
  const rawBody = await request.text();

  if (!verifyProbeSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ProbeResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const maxAge = 5 * 60 * 1000;
  if (Math.abs(Date.now() - parsed.data.timestamp) > maxAge) {
    return NextResponse.json({ error: "Stale request" }, { status: 400 });
  }

  await getRedis().lpush(
    "probe:results:queue",
    JSON.stringify({
      ...parsed.data,
      receivedAt: Date.now(),
    }),
  );

  return NextResponse.json({ status: "queued" });
}
