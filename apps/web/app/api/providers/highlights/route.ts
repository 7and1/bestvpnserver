import { NextRequest, NextResponse } from "next/server";

import { getTopProviderHighlightsBatch } from "@/lib/data/providers";
import { getOrSetProviderHighlights } from "@/lib/cache/provider-summary";
import { proxyApiRequest } from "@/lib/api/proxy";
import { getRuntimeConfig } from "@/lib/runtime";

export const runtime = getRuntimeConfig();
export const dynamic = "force-dynamic";

const isWorkers = runtime === "edge";

export async function GET(request: NextRequest) {
  // In Workers, try to proxy to backend API, fall back to empty data
  if (isWorkers) {
    const proxyResponse = await proxyApiRequest(
      "/api/providers/highlights",
      request,
    );
    // If backend is not configured (503), return empty data
    if (proxyResponse.status === 503) {
      return NextResponse.json([]);
    }
    return proxyResponse;
  }

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const limit = Number(searchParams.limit ?? "6");
  const country = searchParams.country;

  const data = await getOrSetProviderHighlights(limit, country, () =>
    getTopProviderHighlightsBatch(limit, country),
  );

  const response = NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });

  return response;
}
