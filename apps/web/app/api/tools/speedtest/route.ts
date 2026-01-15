import { NextRequest, NextResponse } from "next/server";

import { withRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
