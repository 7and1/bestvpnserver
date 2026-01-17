import { isRedisConfigured } from "@/lib/env";
import { getCache, setCache } from "@/lib/redis";

const SUMMARY_TTL_SECONDS = 60 * 60; // 1 hour

export interface ProviderSummary {
  providerId: number;
  name: string;
  slug: string;
  websiteUrl: string | null;
  affiliateLink: string | null;
  logoUrl: string | null;
  serverCount: number;
  countryCount: number;
  cityCount: number;
  avgPing: number | null;
  avgDownload: number | null;
  avgUpload: number | null;
  uptimePct: number | null;
  lastMeasured: string | null;
  foundedYear: number | null;
  headquarters: string | null;
  protocols: string | null;
  refundPolicy: string | null;
  deviceLimit: string | null;
  pricingTier: string | null;
}

export async function getProviderSummary(slug: string) {
  return getCache<ProviderSummary>(`provider:${slug}:summary`);
}

export async function setProviderSummary(
  slug: string,
  summary: ProviderSummary,
) {
  await setCache(`provider:${slug}:summary`, summary, SUMMARY_TTL_SECONDS);
}

export async function getOrSetProviderSummary(
  slug: string,
  fetchFn: () => Promise<ProviderSummary | null>,
) {
  if (!isRedisConfigured) {
    return fetchFn();
  }

  const cached = await getProviderSummary(slug);
  if (cached !== null) return cached;

  const fresh = await fetchFn();
  if (fresh) {
    await setProviderSummary(slug, fresh);
  }
  return fresh;
}

export interface ProviderHighlight extends ProviderSummary {
  rank: number;
}

const HIGHLIGHTS_TTL_SECONDS = 5 * 60; // 5 minutes

async function getProviderHighlights(
  limit: number,
  country: string | undefined,
) {
  const countryKey = country || "all";
  return getCache<ProviderHighlight[]>(`providers:highlights:${limit}:${countryKey}`);
}

async function setProviderHighlights(
  limit: number,
  country: string | undefined,
  highlights: ProviderHighlight[],
) {
  const countryKey = country || "all";
  await setCache(
    `providers:highlights:${limit}:${countryKey}`,
    highlights,
    HIGHLIGHTS_TTL_SECONDS,
  );
}

export async function getOrSetProviderHighlights(
  limit: number,
  country: string | undefined,
  fetchFn: () => Promise<ProviderHighlight[]>,
): Promise<ProviderHighlight[]> {
  if (!isRedisConfigured) {
    return fetchFn();
  }

  const cached = await getProviderHighlights(limit, country);
  if (cached !== null) return cached;

  const fresh = await fetchFn();
  await setProviderHighlights(limit, country, fresh);
  return fresh;
}
