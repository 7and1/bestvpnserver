import { sql } from "drizzle-orm";

import { getOrSetCache } from "@/lib/cache/query";
import { buildCacheKey } from "@/lib/cache/keys";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import type { UseCase } from "@/lib/pseo/use-cases";

const USE_CASE_TTL = 60 * 60; // 1 hour

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed =
    typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface UseCaseProviderRow {
  id: number;
  name: string;
  slug: string;
  serverCount: number;
  avgDownload: number | null;
  avgPing: number | null;
  uptimePct: number | null;
  unlockedCount?: number | null;
}

export async function getUseCaseRanking(
  useCase: UseCase,
  countryCode?: string,
) {
  if (!isDatabaseConfigured) return [];

  const key = buildCacheKey(
    "usecase",
    useCase.slug,
    countryCode ? countryCode.toLowerCase() : "global",
  );

  return getOrSetCache(key, USE_CASE_TTL, async () => {
    const db = getDb();
    const countryFilter = countryCode
      ? sql`AND lower(co.iso_code) = ${countryCode.toLowerCase()}`
      : sql``;

    if (useCase.streamingSlug) {
      const platformRow = await db.execute(sql`
        SELECT id
        FROM streaming_platforms
        WHERE slug = ${useCase.streamingSlug}
        LIMIT 1
      `);

      const platformId = platformRow[0]?.id as number | undefined;

      if (platformId) {
        const result = await db.execute(sql`
          SELECT
            p.id,
            p.name,
            p.slug,
            COUNT(DISTINCT s.id) AS server_count,
            COUNT(DISTINCT CASE WHEN sc.is_unlocked THEN s.id END) AS unlocked_count,
            AVG(lp.download_mbps) AS avg_download,
            AVG(lp.ping_ms) AS avg_ping,
            AVG(CASE WHEN lp.connection_success THEN 1 ELSE 0 END) * 100 AS uptime_pct
          FROM providers p
          JOIN servers s ON s.provider_id = p.id AND s.is_active = true
          JOIN cities c ON s.city_id = c.id
          JOIN countries co ON c.country_id = co.id
          LEFT JOIN mv_server_latest_performance lp ON lp.server_id = s.id
          LEFT JOIN streaming_checks sc
            ON sc.server_id = s.id
            AND sc.platform_id = ${platformId}
            AND sc.checked_at >= now() - interval '24 hours'
          WHERE p.is_active = true
          ${countryFilter}
          GROUP BY p.id
          ORDER BY unlocked_count DESC NULLS LAST, avg_download DESC NULLS LAST
          LIMIT 8
        `);

        return (
          result as unknown as {
            id: number;
            name: string;
            slug: string;
            server_count: string | number | null;
            unlocked_count: string | number | null;
            avg_download: string | number | null;
            avg_ping: string | number | null;
            uptime_pct: string | number | null;
          }[]
        ).map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          serverCount: Number(row.server_count ?? 0),
          unlockedCount: Number(row.unlocked_count ?? 0),
          avgDownload: toNumber(row.avg_download),
          avgPing: toNumber(row.avg_ping),
          uptimePct: toNumber(row.uptime_pct),
        }));
      }
    }

    const baseQuery = sql`
      SELECT
        p.id,
        p.name,
        p.slug,
        COUNT(DISTINCT s.id) AS server_count,
        AVG(lp.download_mbps) AS avg_download,
        AVG(lp.ping_ms) AS avg_ping,
        AVG(CASE WHEN lp.connection_success THEN 1 ELSE 0 END) * 100 AS uptime_pct
      FROM providers p
      JOIN servers s ON s.provider_id = p.id AND s.is_active = true
      JOIN cities c ON s.city_id = c.id
      JOIN countries co ON c.country_id = co.id
      LEFT JOIN mv_server_latest_performance lp ON lp.server_id = s.id
      WHERE p.is_active = true
      ${countryFilter}
      GROUP BY p.id
    `;

    let result;
    if (useCase.primaryMetric === "latency") {
      result = await db.execute(sql`
        ${baseQuery}
        ORDER BY avg_ping ASC NULLS LAST
        LIMIT 8
      `);
    } else if (useCase.primaryMetric === "privacy") {
      result = await db.execute(sql`
        ${baseQuery}
        ORDER BY uptime_pct DESC NULLS LAST
        LIMIT 8
      `);
    } else {
      result = await db.execute(sql`
        ${baseQuery}
        ORDER BY avg_download DESC NULLS LAST
        LIMIT 8
      `);
    }

    return (
      result as unknown as {
        id: number;
        name: string;
        slug: string;
        server_count: string | number | null;
        avg_download: string | number | null;
        avg_ping: string | number | null;
        uptime_pct: string | number | null;
      }[]
    ).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      serverCount: Number(row.server_count ?? 0),
      avgDownload: toNumber(row.avg_download),
      avgPing: toNumber(row.avg_ping),
      uptimePct: toNumber(row.uptime_pct),
    }));
  });
}
