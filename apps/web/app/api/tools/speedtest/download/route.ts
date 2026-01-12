import { NextRequest, NextResponse } from "next/server";

import { withRateLimit } from "@/lib/rate-limit";
import { SpeedtestDownloadSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
