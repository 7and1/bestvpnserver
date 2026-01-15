import { NextRequest, NextResponse } from "next/server";

import { isWorkersRuntime, proxyApiRequest } from "@/lib/api/proxy";
import { getRedis } from "@/lib/redis";
import { withRateLimit } from "@/lib/rate-limit";
import { DnsTestIdSchema } from "@/lib/validation/schemas";

const isWorkers = isWorkersRuntime;

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

const VPN_RESOLVERS: Record<string, string[]> = {
  nordvpn: ["103.86.96.0/22", "103.86.99.0/24"],
  expressvpn: ["198.54.128.0/24"],
  surfshark: ["162.252.172.0/24"],
};

export async function GET(request: NextRequest) {
  if (isWorkers) {
    return proxyApiRequest("/api/tools/dns-test/results", request);
  }

  const rateLimited = await withRateLimit(request, "tools");
  if (rateLimited) return rateLimited;

  const testIdParam = request.nextUrl.searchParams.get("testId") ?? "";
  const testIdResult = DnsTestIdSchema.safeParse(testIdParam);
  if (!testIdResult.success) {
    return NextResponse.json({ error: "Invalid testId" }, { status: 400 });
  }
  const testId = testIdResult.data;

  const data = await getRedis().get(`dnstest:${testId}`);
  if (!data) {
    return NextResponse.json(
      { error: "Test expired or not found" },
      { status: 404 },
    );
  }

  const { resolvers } = JSON.parse(data);

  const analysis = (resolvers as string[]).map((resolver) => ({
    ip: resolver,
    provider: identifyProvider(resolver),
    isVPN: isVPNResolver(resolver),
  }));

  const hasLeak = analysis.some((r) => !r.isVPN);

  return NextResponse.json({
    testId,
    resolvers: analysis,
    hasLeak,
    recommendation: hasLeak
      ? "Your DNS requests are not going through your VPN. Configure your VPN to use its own DNS servers."
      : "Your DNS requests are properly routed through your VPN.",
  });
}

function identifyProvider(ip: string) {
  for (const [provider, ranges] of Object.entries(VPN_RESOLVERS)) {
    if (ranges.some((range) => isIPInRange(ip, range))) {
      return provider;
    }
  }
  return "Unknown";
}

function isVPNResolver(ip: string) {
  return Object.values(VPN_RESOLVERS).some((ranges) =>
    ranges.some((range) => isIPInRange(ip, range)),
  );
}

function isIPInRange(ip: string, cidr: string) {
  const [range, bits] = cidr.split("/");
  const maskBits = Number.parseInt(bits, 10);
  if (Number.isNaN(maskBits)) return false;

  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(range);
  if (ipInt === null || rangeInt === null) return false;

  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function ipToInt(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}
