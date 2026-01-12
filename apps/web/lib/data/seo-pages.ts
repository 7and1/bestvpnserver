import { sql } from "drizzle-orm";

import { getOrSetSEOPageData, type SEOPageData } from "@/lib/cache/seo-pages";
import { getDb } from "@/lib/db";
import {
  getProviderSummaryCached,
  type ProviderSummary,
} from "@/lib/data/providers";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed =
    typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export interface ProviderPagePayload {
  provider: ProviderSummary;
  topCountries: {
    code: string;
    name: string;
    serverCount: number;
    avgDownload: number | null;
    avgPing: number | null;
  }[];
}

type ProviderStats = {
  serverCount: number;
  countryCount: number;
  avgDownload: number | null;
  avgPing: number | null;
  uptimePct: number | null;
};

export interface ProviderCountryPayload {
  provider: ProviderSummary;
  country: { code: string; name: string };
  topCities: {
    name: string;
    slug: string;
    serverCount: number;
    avgDownload: number | null;
    avgPing: number | null;
  }[];
}

type ProviderCountryStats = {
  serverCount: number;
  avgDownload: number | null;
  avgPing: number | null;
};

export interface ProviderCityPayload {
  provider: ProviderSummary;
  country: { code: string; name: string };
  city: { name: string; slug: string };
  unlockedServices: { name: string; slug: string; region: string | null }[];
  otherCities: { name: string; slug: string; countryCode: string }[];
  competingProviders: { name: string; slug: string }[];
}

type ProviderCityStats = {
  serverCount: number;
  avgDownload: number | null;
  avgPing: number | null;
};

export async function getProviderPageData(providerSlug: string) {
  const normalizedProvider = providerSlug.toLowerCase();
  return getOrSetSEOPageData<ProviderPagePayload, ProviderStats>(
    `provider:${normalizedProvider}`,
    async () => {
      const summary = await getProviderSummaryCached(normalizedProvider);
      if (!summary) return null;

      const db = getDb();
      const countryRows = await db.execute(sql`
      SELECT
        co.iso_code,
        co.name,
        COUNT(DISTINCT s.id) AS server_count,
        AVG(lp.download_mbps) AS avg_download,
        AVG(lp.ping_ms) AS avg_ping
      FROM providers p
      JOIN servers s ON s.provider_id = p.id AND s.is_active = true
      JOIN cities c ON s.city_id = c.id
      JOIN countries co ON c.country_id = co.id
      LEFT JOIN mv_server_latest_performance lp ON lp.server_id = s.id
      WHERE p.slug = ${normalizedProvider}
        AND p.is_active = true
      GROUP BY co.iso_code, co.name
      ORDER BY server_count DESC
      LIMIT 8
    `);

      const topCountries = (
        countryRows as unknown as {
          iso_code: string;
          name: string;
          server_count: string | number | null;
          avg_download: string | number | null;
          avg_ping: string | number | null;
        }[]
      ).map((row) => ({
        code: row.iso_code,
        name: row.name,
        serverCount: Number(row.server_count ?? 0),
        avgDownload: toNumber(row.avg_download),
        avgPing: toNumber(row.avg_ping),
      }));

      const title = `${summary.name} VPN Servers - Live Performance`;
      const description =
        `${summary.name} operates ${summary.serverCount} monitored servers across ` +
        `${summary.countryCount} countries. Average download ${summary.avgDownload?.toFixed(1) ?? "-"} Mbps ` +
        `with ${summary.avgPing?.toFixed(0) ?? "-"} ms latency.`;

      const stats = {
        serverCount: summary.serverCount,
        countryCount: summary.countryCount,
        avgDownload: summary.avgDownload,
        avgPing: summary.avgPing,
        uptimePct: summary.uptimePct,
      };

      return {
        title,
        description,
        stats,
        lastUpdated: summary.lastMeasured,
        data: {
          provider: summary,
          topCountries,
        },
      } satisfies SEOPageData<ProviderPagePayload, ProviderStats>;
    },
  );
}

export async function getProviderCountryPageData(
  providerSlug: string,
  countryCode: string,
) {
  const normalizedProvider = providerSlug.toLowerCase();
  const normalizedCountry = countryCode.toUpperCase();
  return getOrSetSEOPageData<ProviderCountryPayload, ProviderCountryStats>(
    `provider:${normalizedProvider}:country:${normalizedCountry}`,
    async () => {
      const summary = await getProviderSummaryCached(normalizedProvider);
      if (!summary) return null;

      const db = getDb();
      const statRows = await db.execute(sql`
        SELECT
          co.iso_code,
          co.name,
          COUNT(DISTINCT s.id) AS server_count,
          AVG(lp.download_mbps) AS avg_download,
          AVG(lp.ping_ms) AS avg_ping
        FROM providers p
        JOIN servers s ON s.provider_id = p.id AND s.is_active = true
        JOIN cities c ON s.city_id = c.id
        JOIN countries co ON c.country_id = co.id
        LEFT JOIN mv_server_latest_performance lp ON lp.server_id = s.id
        WHERE p.slug = ${normalizedProvider}
          AND p.is_active = true
          AND co.iso_code = ${normalizedCountry}
        GROUP BY co.iso_code, co.name
        LIMIT 1
      `);

      const stat = statRows[0] as
        | {
            iso_code: string;
            name: string;
            server_count: string | number | null;
            avg_download: string | number | null;
            avg_ping: string | number | null;
          }
        | undefined;

      if (!stat) return null;

      const cityRows = await db.execute(sql`
        SELECT
          c.name,
          COUNT(DISTINCT s.id) AS server_count,
          AVG(lp.download_mbps) AS avg_download,
          AVG(lp.ping_ms) AS avg_ping
        FROM servers s
        JOIN providers p ON s.provider_id = p.id
        JOIN cities c ON s.city_id = c.id
        JOIN countries co ON c.country_id = co.id
        LEFT JOIN mv_server_latest_performance lp ON lp.server_id = s.id
        WHERE p.slug = ${normalizedProvider}
          AND p.is_active = true
          AND co.iso_code = ${normalizedCountry}
        GROUP BY c.id
        ORDER BY server_count DESC
        LIMIT 10
      `);

      const topCities = (
        cityRows as unknown as {
          name: string;
          server_count: string | number | null;
          avg_download: string | number | null;
          avg_ping: string | number | null;
        }[]
      ).map((row) => ({
        name: row.name,
        slug: slugify(row.name),
        serverCount: Number(row.server_count ?? 0),
        avgDownload: toNumber(row.avg_download),
        avgPing: toNumber(row.avg_ping),
      }));

      const title = `Best ${summary.name} Servers in ${stat.name}`;
      const description =
        `${summary.name} has ${Number(stat.server_count ?? 0)} servers in ${stat.name}. ` +
        `Average download ${toNumber(stat.avg_download)?.toFixed(1) ?? "-"} Mbps ` +
        `with ${toNumber(stat.avg_ping)?.toFixed(0) ?? "-"} ms latency.`;

      return {
        title,
        description,
        stats: {
          serverCount: Number(stat.server_count ?? 0),
          avgDownload: toNumber(stat.avg_download),
          avgPing: toNumber(stat.avg_ping),
        },
        lastUpdated: summary.lastMeasured,
        data: {
          provider: summary,
          country: { code: stat.iso_code, name: stat.name },
          topCities,
        },
      } satisfies SEOPageData<ProviderCountryPayload, ProviderCountryStats>;
    },
  );
}

export async function getProviderCityPageData(
  providerSlug: string,
  countryCode: string,
  citySlug: string,
) {
  const normalizedProvider = providerSlug.toLowerCase();
  const normalizedCountry = countryCode.toUpperCase();
  const normalizedCity = citySlug.toLowerCase();

  return getOrSetSEOPageData<ProviderCityPayload, ProviderCityStats>(
    `provider:${normalizedProvider}:country:${normalizedCountry}:city:${normalizedCity}`,
    async () => {
      const summary = await getProviderSummaryCached(normalizedProvider);
      if (!summary) return null;

      const db = getDb();
      const statsRows = await db.execute(sql`
        SELECT
          c.name AS city_name,
          co.name AS country_name,
          co.iso_code AS country_code,
          COUNT(DISTINCT s.id) AS server_count,
          AVG(lp.download_mbps) AS avg_download,
          AVG(lp.ping_ms) AS avg_ping
        FROM servers s
        JOIN providers p ON s.provider_id = p.id
        JOIN cities c ON s.city_id = c.id
        JOIN countries co ON c.country_id = co.id
        LEFT JOIN mv_server_latest_performance lp ON lp.server_id = s.id
        WHERE p.slug = ${normalizedProvider}
          AND p.is_active = true
          AND co.iso_code = ${normalizedCountry}
          AND lower(replace(c.name, ' ', '-')) = ${normalizedCity}
        GROUP BY c.name, co.name, co.iso_code
        LIMIT 1
      `);

      const stats = statsRows[0] as
        | {
            city_name: string;
            country_name: string;
            country_code: string;
            server_count: string | number | null;
            avg_download: string | number | null;
            avg_ping: string | number | null;
          }
        | undefined;

      if (!stats) return null;

      const streamingRows = await db.execute(sql`
        SELECT sp.slug, sp.name, sp.region
        FROM streaming_checks sc
        JOIN streaming_platforms sp ON sc.platform_id = sp.id
        JOIN servers s ON sc.server_id = s.id
        JOIN providers p ON s.provider_id = p.id
        JOIN cities c ON s.city_id = c.id
        JOIN countries co ON c.country_id = co.id
        WHERE p.slug = ${normalizedProvider}
          AND p.is_active = true
          AND co.iso_code = ${normalizedCountry}
          AND lower(replace(c.name, ' ', '-')) = ${normalizedCity}
          AND sc.is_unlocked = true
          AND sc.checked_at >= now() - interval '24 hours'
        GROUP BY sp.slug, sp.name, sp.region
        ORDER BY sp.name ASC
      `);

      const unlockedServices = (
        streamingRows as unknown as {
          slug: string;
          name: string;
          region: string | null;
        }[]
      ).map((row) => ({
        slug: row.slug,
        name: row.name,
        region: row.region,
      }));

      const otherCitiesRows = await db.execute(sql`
        SELECT DISTINCT c.name AS city_name, co.iso_code AS country_code
        FROM servers s
        JOIN providers p ON s.provider_id = p.id
        JOIN cities c ON s.city_id = c.id
        JOIN countries co ON c.country_id = co.id
        WHERE p.slug = ${normalizedProvider}
          AND p.is_active = true
          AND lower(replace(c.name, ' ', '-')) <> ${normalizedCity}
        ORDER BY city_name ASC
        LIMIT 8
      `);

      const otherCities = (
        otherCitiesRows as unknown as {
          city_name: string;
          country_code: string;
        }[]
      ).map((row) => ({
        name: row.city_name,
        slug: slugify(row.city_name),
        countryCode: row.country_code.toLowerCase(),
      }));

      const competingRows = await db.execute(sql`
        SELECT DISTINCT p.slug, p.name
        FROM servers s
        JOIN providers p ON s.provider_id = p.id
        JOIN cities c ON s.city_id = c.id
        JOIN countries co ON c.country_id = co.id
        WHERE lower(replace(c.name, ' ', '-')) = ${normalizedCity}
          AND co.iso_code = ${normalizedCountry}
          AND p.slug <> ${normalizedProvider}
          AND p.is_active = true
        ORDER BY p.name ASC
        LIMIT 6
      `);

      const competingProviders = (
        competingRows as unknown as {
          slug: string;
          name: string;
        }[]
      ).map((row) => ({
        slug: row.slug,
        name: row.name,
      }));

      const title = `${summary.name} VPN Servers in ${stats.city_name} - Speed Test`;
      const description =
        `${summary.name} has ${Number(stats.server_count ?? 0)} servers in ${stats.city_name}. ` +
        `Average download ${toNumber(stats.avg_download)?.toFixed(1) ?? "-"} Mbps ` +
        `with ${toNumber(stats.avg_ping)?.toFixed(0) ?? "-"} ms latency.`;

      return {
        title,
        description,
        stats: {
          serverCount: Number(stats.server_count ?? 0),
          avgDownload: toNumber(stats.avg_download),
          avgPing: toNumber(stats.avg_ping),
        },
        lastUpdated: summary.lastMeasured,
        data: {
          provider: summary,
          country: { code: stats.country_code, name: stats.country_name },
          city: { name: stats.city_name, slug: normalizedCity },
          unlockedServices,
          otherCities,
          competingProviders,
        },
      } satisfies SEOPageData<ProviderCityPayload, ProviderCityStats>;
    },
  );
}
