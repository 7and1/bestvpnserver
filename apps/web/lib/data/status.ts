import { sql } from "drizzle-orm";

import { getOrSetCache } from "@/lib/cache/query";
import { buildCacheKey } from "@/lib/cache/keys";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";

const STATUS_TTL_SECONDS = 120;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed =
    typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface ProviderStatus {
  providerName: string;
  providerSlug: string;
  totalServers: number;
  onlineServers: number;
  avgPing: number | null;
  avgDownload: number | null;
  uptimePct: number | null;
  lastMeasured: string | null;
}

export async function getProviderStatus(providerSlug: string) {
  if (!isDatabaseConfigured) return null;

  const key = buildCacheKey("status", providerSlug);
  return getOrSetCache(key, STATUS_TTL_SECONDS, async () => {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT
        p.name AS provider_name,
        p.slug AS provider_slug,
        COUNT(DISTINCT s.id) AS total_servers,
        COUNT(DISTINCT CASE WHEN lp.connection_success THEN s.id END) AS online_servers,
        AVG(lp.ping_ms) AS avg_ping,
        AVG(lp.download_mbps) AS avg_download,
        AVG(CASE WHEN lp.connection_success THEN 1 ELSE 0 END) * 100 AS uptime_pct,
        MAX(lp.measured_at) AS last_measured
      FROM providers p
      JOIN servers s ON s.provider_id = p.id AND s.is_active = true
      LEFT JOIN mv_server_latest_performance lp ON lp.server_id = s.id
      WHERE p.slug = ${providerSlug}
        AND p.is_active = true
      GROUP BY p.name, p.slug
      LIMIT 1
    `);

    const row = result[0] as
      | {
          provider_name: string;
          provider_slug: string;
          total_servers: string | number | null;
          online_servers: string | number | null;
          avg_ping: string | number | null;
          avg_download: string | number | null;
          uptime_pct: string | number | null;
          last_measured: Date | string | null;
        }
      | undefined;

    if (!row) return null;

    return {
      providerName: row.provider_name,
      providerSlug: row.provider_slug,
      totalServers: Number(row.total_servers ?? 0),
      onlineServers: Number(row.online_servers ?? 0),
      avgPing: toNumber(row.avg_ping),
      avgDownload: toNumber(row.avg_download),
      uptimePct: toNumber(row.uptime_pct),
      lastMeasured: row.last_measured
        ? new Date(row.last_measured).toISOString()
        : null,
    } satisfies ProviderStatus;
  });
}
