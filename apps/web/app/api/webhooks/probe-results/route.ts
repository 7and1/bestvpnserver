import { NextRequest, NextResponse } from "next/server";

import { isWorkersRuntime, proxyApiRequest } from "@/lib/api/proxy";
import { verifyProbeSignature } from "@/lib/auth/probe-signature";
import { getRedis } from "@/lib/redis";
import { withRateLimit } from "@/lib/rate-limit";
import { ProbeResultSchema } from "@/lib/validation/schemas";

const isWorkers = isWorkersRuntime;

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

const allowedIps = new Set(
  (process.env.PROBE_ALLOWED_IPS || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean),
);

export async function POST(request: NextRequest) {
  if (isWorkers) {
    return proxyApiRequest("/api/webhooks/probe-results", request);
  }

  const rateLimited = await withRateLimit(request, "probes");
  if (rateLimited) return rateLimited;

  const clientIP = request.headers.get("x-forwarded-for")?.split(",")[0];
  if (
    process.env.NODE_ENV === "production" &&
    allowedIps.size > 0 &&
    clientIP &&
    !allowedIps.has(clientIP)
  ) {
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
