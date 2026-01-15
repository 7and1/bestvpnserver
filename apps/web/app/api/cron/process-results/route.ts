import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import {
  performanceLogs,
  probeLocations,
  streamingChecks,
  streamingPlatforms,
} from "@bestvpnserver/database";
import { isWorkersRuntime, proxyApiRequest } from "@/lib/api/proxy";
import { getDb } from "@/lib/db";
import { getRedis } from "@/lib/redis";

const isWorkers = isWorkersRuntime;

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 1000;

export async function GET(request: Request) {
  if (isWorkers) {
    return proxyApiRequest("/api/cron/process-results", request);
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await getRedis().lrange(
    "probe:results:queue",
    0,
    BATCH_SIZE - 1,
  );
  if (results.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const db = getDb();
  const platforms = await db
    .select({ id: streamingPlatforms.id, slug: streamingPlatforms.slug })
    .from(streamingPlatforms);
  const platformMap = new Map(platforms.map((p) => [p.slug, p.id]));

  const probes = await db
    .select({ id: probeLocations.id, code: probeLocations.code })
    .from(probeLocations);
  const probeMap = new Map(probes.map((p) => [p.code, p.id]));

  const performanceRows: (typeof performanceLogs.$inferInsert)[] = [];
  const streamingRows: (typeof streamingChecks.$inferInsert)[] = [];
  let skipped = 0;

  for (const raw of results) {
    let parsedResult: unknown;
    try {
      parsedResult = JSON.parse(raw as string);
    } catch {
      skipped += 1;
      continue;
    }

    if (!parsedResult || typeof parsedResult !== "object") {
      skipped += 1;
      continue;
    }

    const result = parsedResult as {
      serverId: number;
      probeId: string;
      timestamp: number;
      pingMs: number;
      downloadMbps: number;
      uploadMbps: number;
      jitterMs?: number;
      packetLossPct?: number;
      connectionSuccess: boolean;
      connectionTimeMs?: number;
      streamingResults?: {
        platform: string;
        isUnlocked: boolean;
        responseMs?: number;
      }[];
    };

    if (
      typeof result.serverId !== "number" ||
      typeof result.probeId !== "string"
    ) {
      skipped += 1;
      continue;
    }
    const measuredAt = new Date(result.timestamp);

    const probeId = probeMap.get(result.probeId);
    if (!probeId) {
      skipped += 1;
      continue;
    }

    performanceRows.push({
      serverId: result.serverId,
      probeId,
      measuredAt,
      pingMs: result.pingMs,
      downloadMbps: Number.isFinite(result.downloadMbps)
        ? result.downloadMbps.toString()
        : null,
      uploadMbps: Number.isFinite(result.uploadMbps)
        ? result.uploadMbps.toString()
        : null,
      jitterMs: result.jitterMs ?? null,
      packetLossPct:
        result.packetLossPct !== undefined &&
        Number.isFinite(result.packetLossPct)
          ? result.packetLossPct.toString()
          : null,
      connectionSuccess: result.connectionSuccess,
      connectionTimeMs: result.connectionTimeMs,
    });

    if (Array.isArray(result.streamingResults)) {
      for (const item of result.streamingResults) {
        const platformId = platformMap.get(item.platform);
        if (!platformId) continue;

        streamingRows.push({
          serverId: result.serverId,
          platformId,
          checkedAt: measuredAt,
          isUnlocked: item.isUnlocked,
          responseTimeMs: item.responseMs,
        });
      }
    }
  }

  await db.transaction(async (tx) => {
    if (performanceRows.length > 0) {
      await tx.insert(performanceLogs).values(performanceRows);
    }
    if (streamingRows.length > 0) {
      await tx.insert(streamingChecks).values(streamingRows);
    }
  });

  await getRedis().ltrim("probe:results:queue", results.length, -1);

  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_server_latest_performance`,
  );
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_server_daily_stats`,
  );

  return NextResponse.json({
    processed: results.length,
    performance: performanceRows.length,
    streaming: streamingRows.length,
    skipped,
  });
}
