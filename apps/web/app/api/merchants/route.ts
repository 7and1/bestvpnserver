import { NextRequest, NextResponse } from "next/server";

import { proxyApiRequest } from "@/lib/api/proxy";
import { isWorkers } from "@/lib/runtime";
import { proxyGridSearch } from "@/lib/proxy-grid";
import { withRateLimit } from "@/lib/rate-limit";
import { MerchantQuerySchema } from "@/lib/validation/schemas";

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request: NextRequest) {
  const secret = process.env.MERCHANT_API_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (isWorkers) {
    return proxyApiRequest("/api/merchants", request);
  }

  const rateLimited = await withRateLimit(request, "api");
  if (rateLimited) return rateLimited;

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = MerchantQuerySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { type, query, url, force } = parsed.data;

  try {
    const data = await proxyGridSearch({ type, query, url, force });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Proxy Grid request failed" },
      { status: 502 },
    );
  }
}
