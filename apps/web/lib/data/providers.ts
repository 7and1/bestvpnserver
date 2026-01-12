import { sql } from "drizzle-orm";

import {
  getOrSetProviderSummary,
  type ProviderSummary,
} from "@/lib/cache/provider-summary";
import { isDatabaseConfigured } from "@/lib/env";
import { getDb } from "@/lib/db";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed =
    typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchProviderSummary(
  slug: string,
): Promise<ProviderSummary | null> {
  if (!isDatabaseConfigured) return null;

  const db = getDb();

  const result = await db.execute(sql`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.website_url,
      p.affiliate_link,
      p.logo_url,
      COUNT(DISTINCT s.id) AS server_count,
      COUNT(DISTINCT co.id) AS country_count,
      COUNT(DISTINCT c.id) AS city_count,
      AVG(lp.ping_ms) AS avg_ping,
      AVG(lp.download_mbps) AS avg_download,
      AVG(lp.upload_mbps) AS avg_upload,
      AVG(CASE WHEN lp.connection_success THEN 1 ELSE 0 END) * 100 AS uptime_pct,
      MAX(lp.measured_at) AS last_measured
    FROM providers p
    JOIN servers s ON s.provider_id = p.id AND s.is_active = true
    JOIN cities c ON s.city_id = c.id
    JOIN countries co ON c.country_id = co.id
    LEFT JOIN mv_server_latest_performance lp ON lp.server_id = s.id
    WHERE p.slug = ${slug}
      AND p.is_active = true
    GROUP BY p.id
    LIMIT 1
  `);

  const row = result[0] as
    | {
        id: number;
        name: string;
        slug: string;
        website_url: string | null;
        affiliate_link: string | null;
        logo_url: string | null;
        server_count: string | number | null;
        country_count: string | number | null;
        city_count: string | number | null;
        avg_ping: string | number | null;
        avg_download: string | number | null;
        avg_upload: string | number | null;
        uptime_pct: string | number | null;
        last_measured: Date | string | null;
      }
    | undefined;

  if (!row) return null;

  return {
    providerId: row.id,
    name: row.name,
    slug: row.slug,
    websiteUrl: row.website_url,
    affiliateLink: row.affiliate_link,
    logoUrl: row.logo_url,
    serverCount: Number(row.server_count ?? 0),
    countryCount: Number(row.country_count ?? 0),
    cityCount: Number(row.city_count ?? 0),
    avgPing: toNumber(row.avg_ping),
    avgDownload: toNumber(row.avg_download),
    avgUpload: toNumber(row.avg_upload),
    uptimePct: toNumber(row.uptime_pct),
    lastMeasured: row.last_measured
      ? new Date(row.last_measured).toISOString()
      : null,
  };
}

export async function getProviderSummaryCached(slug: string) {
  return getOrSetProviderSummary(slug, () => fetchProviderSummary(slug));
}

export async function getTopProviders(limit = 6, countryCode?: string) {
  if (!isDatabaseConfigured) return [];

  const db = getDb();
  const countryFilter = countryCode
    ? sql`AND lower(co.iso_code) = ${countryCode.toLowerCase()}`
    : sql``;

  const result = await db.execute(sql`
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
    ORDER BY avg_download DESC NULLS LAST
    LIMIT ${limit}
  `);

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
}

export type ProviderHighlight = ProviderSummary & {
  rank: number;
};

export async function getTopProviderHighlights(
  limit = 6,
  countryCode?: string,
): Promise<ProviderHighlight[]> {
  const topProviders = await getTopProviders(limit, countryCode);
  if (topProviders.length === 0) return [];

  const summaries = await Promise.all(
    topProviders.map((provider) => getProviderSummaryCached(provider.slug)),
  );

  return topProviders.map((provider, index) => {
    const summary = summaries[index];
    if (summary) {
      return {
        ...summary,
        avgDownload: summary.avgDownload ?? provider.avgDownload,
        avgPing: summary.avgPing ?? provider.avgPing,
        uptimePct: summary.uptimePct ?? provider.uptimePct,
        serverCount: summary.serverCount || provider.serverCount,
        rank: index + 1,
      };
    }

    return {
      providerId: provider.id,
      name: provider.name,
      slug: provider.slug,
      websiteUrl: null,
      affiliateLink: null,
      logoUrl: null,
      serverCount: provider.serverCount,
      countryCount: 0,
      cityCount: 0,
      avgPing: provider.avgPing,
      avgDownload: provider.avgDownload,
      avgUpload: null,
      uptimePct: provider.uptimePct,
      lastMeasured: null,
      rank: index + 1,
    };
  });
}

export async function getAvailableCountries(limit = 20) {
  if (!isDatabaseConfigured) return [];

  const db = getDb();
  const result = await db.execute(sql`
    SELECT DISTINCT co.iso_code, co.name
    FROM countries co
    JOIN cities c ON c.country_id = co.id
    JOIN servers s ON s.city_id = c.id AND s.is_active = true
    ORDER BY co.name ASC
    LIMIT ${limit}
  `);

  return (result as unknown as { iso_code: string; name: string }[]).map(
    (row) => ({
      code: row.iso_code,
      name: row.name,
    }),
  );
}

export type { ProviderSummary };
