import { NextRequest, NextResponse } from "next/server";

import { isWorkersRuntime, proxyApiRequest } from "@/lib/api/proxy";
import { getRedis } from "@/lib/redis";
import { withRateLimit } from "@/lib/rate-limit";
import { DnsLogSchema } from "@/lib/validation/schemas";

const isWorkers = isWorkersRuntime;

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (isWorkers) {
    return proxyApiRequest("/api/tools/dns-test/log", request);
  }

  const rateLimited = await withRateLimit(request, "api");
  if (rateLimited) return rateLimited;

  const secret = request.headers.get("x-dns-secret");
  if (!secret || secret !== process.env.DNS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsedPayload = DnsLogSchema.safeParse(body);
  if (!parsedPayload.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { testId, resolver } = parsedPayload.data;

  const key = `dnstest:${testId}`;
  const data = await getRedis().get(key);
  if (!data) {
    return NextResponse.json({ error: "Test expired" }, { status: 404 });
  }

  const cached = JSON.parse(data);
  const resolvers = new Set<string>(cached.resolvers || []);
  resolvers.add(resolver);

  await getRedis().set(
    key,
    JSON.stringify({ ...cached, resolvers: Array.from(resolvers) }),
    { ex: 120 },
  );

  return NextResponse.json({ status: "ok" });
}
