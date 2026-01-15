import { NextRequest, NextResponse } from "next/server";

import { getTopProviderHighlights } from "@/lib/data/providers";
import { proxyApiRequest } from "@/lib/api/proxy";

// Detect Workers environment
const isWorkers = typeof caches !== "undefined" && "default" in caches;

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // In Workers, try to proxy to backend API, fall back to empty data
  if (isWorkers) {
    const proxyResponse = await proxyApiRequest(
      "/api/providers/highlights",
      request,
    );
    // If backend is not configured (503), return empty data
    if (proxyResponse.status === 503) {
      // Return empty array with same structure
      return NextResponse.json([]);
    }
    return proxyResponse;
  }

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const limit = Number(searchParams.limit ?? "6");
  const country = searchParams.country;

  const highlights = await getTopProviderHighlights(limit, country);
  return NextResponse.json(highlights);
}
