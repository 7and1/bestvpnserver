import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { getRedis } from "@/lib/redis";
import { withRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rateLimited = await withRateLimit(request, "tools");
  if (rateLimited) return rateLimited;

  const testId = randomUUID().replace(/-/g, "").slice(0, 12);

  await getRedis().set(
    `dnstest:${testId}`,
    JSON.stringify({
      created: Date.now(),
      resolvers: [],
    }),
    { ex: 120 },
  );

  return NextResponse.json({
    testId,
    testDomains: [
      `${testId}-1.test.bestvpnserver.com`,
      `${testId}-2.test.bestvpnserver.com`,
      `${testId}-3.test.bestvpnserver.com`,
    ],
  });
}
