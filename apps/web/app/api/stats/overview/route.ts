import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { isDatabaseConfigured, isRedisConfigured } from "@/lib/env";
import { getDb } from "@/lib/db";
import { getCache, setCache } from "@/lib/redis";
import { proxyApiRequest } from "@/lib/api/proxy";
import { getRuntimeConfig } from "@/lib/runtime";

export const runtime = getRuntimeConfig();
export const dynamic = "force-dynamic";

const isWorkers = runtime === "edge";

export interface StatsOverviewResponse {
  streamingUnlockRate: number;
  avgLatency: number;
  connectionSuccessRate: number;
  lastUpdated: string;
}

async function fetchStatsOverview(): Promise<StatsOverviewResponse> {
  if (!isDatabaseConfigured) {
    // Return default values when database is not configured
    return {
      streamingUnlockRate: 0,
      avgLatency: 0,
      connectionSuccessRate: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  const db = getDb();

  // Query for streaming unlock rate (last 24 hours)
  const streamingResult = await db.execute(sql`
    SELECT
      ROUND(
        AVG(CASE WHEN sc.is_unlocked THEN 100.0 ELSE 0.0 END)::numeric,
        1
      ) as unlock_rate
    FROM streaming_checks sc
    WHERE sc.checked_at >= NOW() - INTERVAL '24 hours'
  `);

  // Query for average latency from latest performance
  const latencyResult = await db.execute(sql`
    SELECT
      ROUND(AVG(lp.ping_ms)::numeric, 1) as avg_latency
    FROM mv_server_latest_performance lp
    WHERE lp.ping_ms IS NOT NULL
  `);

  // Query for connection success rate
  const connectionResult = await db.execute(sql`
    SELECT
      ROUND(
        AVG(CASE WHEN lp.connection_success THEN 100.0 ELSE 0.0 END)::numeric,
        2
      ) as success_rate
    FROM mv_server_latest_performance lp
    WHERE lp.connection_success IS NOT NULL
  `);

  // Get the most recent measurement time
  const lastUpdateResult = await db.execute(sql`
    SELECT
      GREATEST(
        (SELECT MAX(checked_at) FROM streaming_checks),
        (SELECT MAX(measured_at) FROM mv_server_latest_performance)
      ) as last_updated
  `);

  const streamingRow = streamingResult[0] as { unlock_rate: string | null } | undefined;
  const latencyRow = latencyResult[0] as { avg_latency: string | null } | undefined;
  const connectionRow = connectionResult[0] as { success_rate: string | null } | undefined;
  const lastUpdateRow = lastUpdateResult[0] as { last_updated: Date | null } | undefined;

  return {
    streamingUnlockRate: streamingRow?.unlock_rate
      ? Number.parseFloat(streamingRow.unlock_rate)
      : 0,
    avgLatency: latencyRow?.avg_latency
      ? Number.parseFloat(latencyRow.avg_latency)
      : 0,
    connectionSuccessRate: connectionRow?.success_rate
      ? Number.parseFloat(connectionRow.success_rate)
      : 0,
    lastUpdated: lastUpdateRow?.last_updated?.toISOString() ?? new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  // In Workers, try to proxy to backend API, fall back to default data
  if (isWorkers) {
    const proxyResponse = await proxyApiRequest(
      "/api/stats/overview",
      request,
    );
    // If backend is not configured (503), return default data
    if (proxyResponse.status === 503) {
      return NextResponse.json({
        streamingUnlockRate: 0,
        avgLatency: 0,
        connectionSuccessRate: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
    return proxyResponse;
  }

  const cacheKey = "stats:overview";
  const { data, hit } = isRedisConfigured
    ? await getOrSetCacheWithHitStatus(cacheKey, 60, fetchStatsOverview)
    : { data: await fetchStatsOverview(), hit: false };

  const response = NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      "X-Cache": hit ? "HIT" : "MISS",
    },
  });

  return response;
}

async function getOrSetCacheWithHitStatus<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<{ data: T; hit: boolean }> {
  const cached = await getCache<T>(key);
  if (cached !== null) return { data: cached, hit: true };

  const fresh = await fetchFn();
  await setCache(key, fresh, ttlSeconds);
  return { data: fresh, hit: false };
}
