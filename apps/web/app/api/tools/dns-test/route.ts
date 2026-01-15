import { NextRequest, NextResponse } from "next/server";

import { isWorkersRuntime, proxyApiRequest } from "@/lib/api/proxy";
import { withRateLimit } from "@/lib/rate-limit";

const isWorkers = isWorkersRuntime;

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (isWorkers) {
    return proxyApiRequest("/api/tools/dns-test", request);
  }

  const rateLimited = await withRateLimit(request, "tools");
  if (rateLimited) return rateLimited;

  return NextResponse.json({
    name: "DNS Leak Test",
    version: "1.0.0",
    endpoints: {
      start: "POST /api/tools/dns-test/start",
      results: "GET /api/tools/dns-test/results/:testId",
      log: "POST /api/tools/dns-test/log",
    },
  });
}
