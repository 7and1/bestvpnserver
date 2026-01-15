import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { isWorkersRuntime, proxyApiRequest } from "@/lib/api/proxy";
import { withRateLimit } from "@/lib/rate-limit";
import { IpInfoSchema } from "@/lib/validation/schemas";

const isWorkers = isWorkersRuntime;

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";

async function lookupGeo(ip: string | null) {
  const token = process.env.IPINFO_TOKEN;
  if (!token || !ip || ip === "Unknown") return null;

  const response = await fetch(`https://ipinfo.io/${ip}/json?token=${token}`, {
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = await response.json();
  const parsed = IpInfoSchema.safeParse(data);
  if (!parsed.success) return null;

  const { city, region, country, loc, org, timezone } = parsed.data;
  const [lat, lon] = loc?.split(",") ?? [];
  const latitude = lat ? Number.parseFloat(lat) : null;
  const longitude = lon ? Number.parseFloat(lon) : null;

  return {
    country: country ?? "Unknown",
    countryCode: country ?? "Unknown",
    city: city ?? "Unknown",
    region: region ?? "Unknown",
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    timezone: timezone ?? "Unknown",
    isp: org ?? "Unknown",
    organization: org ?? "Unknown",
  };
}

export async function GET(request: NextRequest) {
  if (isWorkers) {
    return proxyApiRequest("/api/tools/my-ip", request);
  }

  const rateLimited = await withRateLimit(request, "tools");
  if (rateLimited) return rateLimited;

  const headersList = headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0].trim() ||
    headersList.get("x-real-ip") ||
    request.ip ||
    "Unknown";

  const geo = await lookupGeo(ip);

  return NextResponse.json({
    ip,
    geo,
    isVPN: false,
    headers: {
      userAgent: headersList.get("user-agent"),
      acceptLanguage: headersList.get("accept-language"),
    },
  });
}
