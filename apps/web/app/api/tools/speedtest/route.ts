import { NextRequest, NextResponse } from "next/server";

import { proxyApiRequest } from "@/lib/api/proxy";
import { isWorkers } from "@/lib/runtime";
import { withRateLimit } from "@/lib/rate-limit";

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (isWorkers) {
    const proxyResponse = await proxyApiRequest(
      "/api/tools/speedtest",
      request,
    );
    if (proxyResponse.status === 503) {
      return NextResponse.json({
        name: "Speed Test",
        version: "1.0.0",
        endpoints: {
          ping: "GET /api/tools/speedtest/ping",
          download: "GET /api/tools/speedtest/download",
          upload: "POST /api/tools/speedtest/upload",
        },
        unavailable: true,
      });
    }
    return proxyResponse;
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
