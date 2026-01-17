import { NextRequest, NextResponse } from "next/server";

import { proxyApiRequest } from "@/lib/api/proxy";
import { isWorkers } from "@/lib/runtime";
import { withRateLimit } from "@/lib/rate-limit";

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (isWorkers) {
    const proxyResponse = await proxyApiRequest(
      "/api/tools/speedtest/ping",
      request,
    );
    if (proxyResponse.status === 503) {
      return NextResponse.json(
        { ok: true, ts: Date.now() },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return proxyResponse;
  }

  const rateLimited = await withRateLimit(request, "tools");
  if (rateLimited) return rateLimited;

  return NextResponse.json(
    { ok: true, ts: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
