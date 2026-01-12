import { NextRequest, NextResponse } from "next/server";

import { withRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimited = await withRateLimit(request, "tools");
  if (rateLimited) return rateLimited;

  return NextResponse.json(
    { ok: true, ts: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
