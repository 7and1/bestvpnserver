import { NextRequest, NextResponse } from "next/server";

import { isWorkersRuntime, proxyApiRequest } from "@/lib/api/proxy";
import { withRateLimit } from "@/lib/rate-limit";

const isWorkers = isWorkersRuntime;

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (isWorkers) {
    return proxyApiRequest("/api/tools/speedtest", request);
  }

  const rateLimited = await withRateLimit(request, "tools");
  if (rateLimited) return rateLimited;

  return NextResponse.json({
    name: "Speed Test",
    version: "1.0.0",
    endpoints: {
      ping: "GET /api/tools/speedtest/ping",
      download: "GET /api/tools/speedtest/download",
      upload: "POST /api/tools/speedtest/upload",
    },
  });
}
