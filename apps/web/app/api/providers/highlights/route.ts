import { NextRequest, NextResponse } from "next/server";

import { getTopProviderHighlights } from "@/lib/data/providers";
import { proxyApiRequest } from "@/lib/api/proxy";

// Detect Workers environment
const isWorkers = typeof caches !== "undefined" && "default" in caches;

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // In Workers, proxy to backend API
  if (isWorkers) {
    return proxyApiRequest("/api/providers/highlights", request);
  }

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const limit = Number(searchParams.limit ?? "6");
  const country = searchParams.country;

  const highlights = await getTopProviderHighlights(limit, country);
  return NextResponse.json(highlights);
}
