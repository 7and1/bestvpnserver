import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { proxyApiRequest } from "@/lib/api/proxy";
import { isWorkers } from "@/lib/runtime";
import { getDb } from "@/lib/db";
import { getRedis } from "@/lib/redis";

export const runtime = isWorkers ? "edge" : "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 1000;

type PlatformRow = { id: number; slug: string };
type ProbeRow = { id: number; code: string };

type PerformanceRow = {
  serverId: number;
  probeId: number;
  measuredAt: Date;
  pingMs: number | null;
  downloadMbps: string | null;
  uploadMbps: string | null;
  jitterMs: number | null;
  packetLossPct: string | null;
  connectionSuccess: boolean;
  connectionTimeMs: number | undefined;
};

type StreamingRow = {
  serverId: number;
  platformId: number;
  checkedAt: Date;
  isUnlocked: boolean;
  responseTimeMs: number | undefined;
};

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

  // Use raw SQL to avoid Drizzle type conflicts
  const platformsResult = await db.execute<PlatformRow>(
    sql`SELECT id, slug FROM streaming_platforms`,
  );
  const platformMap = new Map(platformsResult.map((p) => [p.slug, p.id]));

  const probesResult = await db.execute<ProbeRow>(
    sql`SELECT id, code FROM probe_locations`,
  );
  const probeMap = new Map(probesResult.map((p) => [p.code, p.id]));

  const performanceRows: PerformanceRow[] = [];
  const streamingRows: StreamingRow[] = [];
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

  // Insert performance rows using raw SQL
  if (performanceRows.length > 0) {
    const perfValues = performanceRows.map(
      (r) =>
        sql`(${r.serverId}, ${r.probeId}, ${r.measuredAt}, ${r.pingMs}, ${r.downloadMbps}, ${r.uploadMbps}, ${r.jitterMs}, ${r.packetLossPct}, ${r.connectionSuccess}, ${r.connectionTimeMs})`,
    );
    await db.execute(sql`
      INSERT INTO performance_logs
        (server_id, probe_id, measured_at, ping_ms, download_mbps, upload_mbps, jitter_ms, packet_loss_pct, connection_success, connection_time_ms)
      VALUES ${sql.join(perfValues, sql`, `)}
    `);
  }

  // Insert streaming rows using raw SQL
  if (streamingRows.length > 0) {
    const streamValues = streamingRows.map(
      (r) =>
        sql`(${r.serverId}, ${r.platformId}, ${r.checkedAt}, ${r.isUnlocked}, ${r.responseTimeMs})`,
    );
    await db.execute(sql`
      INSERT INTO streaming_checks
        (server_id, platform_id, checked_at, is_unlocked, response_time_ms)
      VALUES ${sql.join(streamValues, sql`, `)}
    `);
  }

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
