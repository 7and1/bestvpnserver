import { NextRequest, NextResponse } from "next/server";

import { isWorkersRuntime, proxyApiRequest } from "@/lib/api/proxy";
import { withRateLimit } from "@/lib/rate-limit";

const isWorkers = isWorkersRuntime;

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (isWorkers) {
    return proxyApiRequest("/api/tools/speedtest/upload", request);
  }

  const rateLimited = await withRateLimit(request, "tools");
  if (rateLimited) return rateLimited;

  const startTime = Date.now();
  const body = await request.arrayBuffer();
  const size = body.byteLength;
  const duration = Date.now() - startTime;

  return NextResponse.json({
    size,
    duration,
    speed: (size * 8) / (duration / 1000) / 1_000_000,
  });
}
