import { NextRequest, NextResponse } from "next/server";

import { isWorkersRuntime, proxyApiRequest } from "@/lib/api/proxy";
import { withRateLimit } from "@/lib/rate-limit";
import { SpeedtestDownloadSchema } from "@/lib/validation/schemas";

const isWorkers = isWorkersRuntime;

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (isWorkers) {
    const proxyResponse = await proxyApiRequest(
      "/api/tools/speedtest/download",
      request,
    );
    if (proxyResponse.status === 503) {
      // Fallback: generate data locally in Workers
      const sizeParam = request.nextUrl.searchParams.get("size") ?? "1000000";
      const size = Number.parseInt(sizeParam, 10) || 1_000_000;
      const data = new Uint8Array(size);
      return new NextResponse(data, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": size.toString(),
          "Cache-Control": "no-store",
        },
      });
    }
    return proxyResponse;
  }

  const rateLimited = await withRateLimit(request, "tools");
  if (rateLimited) return rateLimited;

  const sizeParam = request.nextUrl.searchParams.get("size") ?? "1000000";
  const parsed = SpeedtestDownloadSchema.safeParse({ size: sizeParam });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }
  const actualSize = parsed.data.size;

  const data = Buffer.alloc(actualSize);

  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": actualSize.toString(),
      "Cache-Control": "no-store",
    },
  });
}
