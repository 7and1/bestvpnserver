import { NextRequest, NextResponse } from "next/server";

import { isWorkersRuntime, proxyApiRequest } from "@/lib/api/proxy";
import { withRateLimit } from "@/lib/rate-limit";

const isWorkers = isWorkersRuntime;

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (isWorkers) {
    return proxyApiRequest("/api/tools/speedtest/ping", request);
  }

  const rateLimited = await withRateLimit(request, "tools");
  if (rateLimited) return rateLimited;

  return NextResponse.json(
    { ok: true, ts: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
