import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { isDatabaseConfigured } from "@/lib/env";
import { getDb } from "@/lib/db";
import { buildCacheKey, hashKey } from "@/lib/cache/keys";
import { getOrSetCache } from "@/lib/cache/query";
import { withRateLimit } from "@/lib/rate-limit";
import { ServerQuerySchema } from "@/lib/validation/schemas";
import { proxyApiRequest } from "@/lib/api/proxy";
import { getRuntimeConfig } from "@/lib/runtime";

export const runtime = getRuntimeConfig();
export const dynamic = "force-dynamic";

const isWorkers = runtime === "edge";

const CACHE_TTL_SECONDS = 120;

const protocolLookup: Record<string, string> = {
  wireguard: "WireGuard",
  "openvpn-udp": "OpenVPN-UDP",
  "openvpn-tcp": "OpenVPN-TCP",
  ikev2: "IKEv2",
};

export async function GET(request: NextRequest) {
  // In Workers, try to proxy to backend API, fall back to empty data
  if (isWorkers) {
    const proxyResponse = await proxyApiRequest("/api/servers", request);
    // If backend is not configured (503), return empty data
    if (proxyResponse.status === 503) {
      return NextResponse.json({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
    }
    return proxyResponse;
  }

  const rateLimited = await withRateLimit(request, "api");
  if (rateLimited) return rateLimited;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = ServerQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    provider,
    country,
    city,
    protocol,
    streaming,
    minSpeed,
    maxLatency,
    limit,
    offset,
  } = parsed.data;

  // Return empty data when database is not configured
  if (!isDatabaseConfigured) {
    return NextResponse.json({
      data: [],
      total: 0,
      limit,
      offset,
    });
  }

  const db = getDb();
  const conditions = [sql`s.is_active = true`];

  if (provider) {
    conditions.push(sql`p.slug = ${provider}`);
  }

  if (country) {
    conditions.push(sql`co.iso_code = ${country}`);
  }

  if (city) {
    conditions.push(
      sql`lower(replace(c.name, ' ', '-')) = ${city.toLowerCase()}`,
    );
  }

  if (minSpeed !== undefined) {
    conditions.push(sql`lp.download_mbps >= ${minSpeed}`);
  }

  if (maxLatency !== undefined) {
    conditions.push(sql`lp.ping_ms <= ${maxLatency}`);
  }

  const joins = protocol
    ? sql`JOIN server_protocols sp ON s.id = sp.server_id
       JOIN protocols pr ON sp.protocol_id = pr.id`
    : sql``;

  if (protocol) {
    const protocolName = protocolLookup[protocol];
    if (protocolName) {
      conditions.push(sql`pr.name = ${protocolName}`);
    }
  }

  if (streaming) {
    conditions.push(sql`
      EXISTS (
        SELECT 1
        FROM streaming_checks sc
        JOIN streaming_platforms sp ON sc.platform_id = sp.id
        WHERE sc.server_id = s.id
          AND sp.slug = ${streaming}
          AND sc.is_unlocked = true
          AND sc.checked_at >= now() - interval '24 hours'
      )
    `);
  }

  const whereClause = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

  // Count total matching servers
  const countQuery = sql`
    SELECT COUNT(*) as total
    FROM servers s
    JOIN providers p ON s.provider_id = p.id
    JOIN cities c ON s.city_id = c.id
    JOIN countries co ON c.country_id = co.id
    ${joins}
    ${whereClause}
  `;

  const query = sql`
    SELECT
      s.id,
      s.hostname,
      s.ip_address,
      s.is_active,
      p.name AS provider_name,
      p.slug AS provider_slug,
      c.name AS city_name,
      co.name AS country_name,
      co.iso_code AS country_code,
      lp.ping_ms,
      lp.download_mbps,
      lp.upload_mbps,
      lp.connection_success,
      lp.measured_at
    FROM servers s
    JOIN providers p ON s.provider_id = p.id
    JOIN cities c ON s.city_id = c.id
    JOIN countries co ON c.country_id = co.id
    LEFT JOIN mv_server_latest_performance lp ON s.id = lp.server_id
    ${joins}
    ${whereClause}
    ORDER BY lp.download_mbps DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `;

  const cacheKey = buildCacheKey("servers", hashKey(parsed.data));
  const payload = await getOrSetCache(cacheKey, CACHE_TTL_SECONDS, async () => {
    const [result, countResult] = await Promise.all([
      db.execute(query),
      db.execute(countQuery),
    ]);
    const total = Number(countResult[0]?.total) || 0;
    return {
      data: result,
      total,
      limit,
      offset,
    };
  });

  return NextResponse.json(payload);
}
