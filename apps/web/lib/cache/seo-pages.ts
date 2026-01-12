import { isRedisConfigured } from "@/lib/env";
import { getCache, setCache } from "@/lib/redis";

const SEO_TTL_SECONDS = 60 * 60 * 6; // 6 hours

export interface SEOPageData<
  TData = Record<string, unknown>,
  TStats = Record<string, string | number | null>,
> {
  title: string;
  description: string;
  stats: TStats;
  lastUpdated: string | null;
  data: TData;
}

export async function getSEOPageData<
  TData = Record<string, unknown>,
  TStats = Record<string, string | number | null>,
>(pageSlug: string) {
  return getCache<SEOPageData<TData, TStats>>(`seo:page:${pageSlug}:data`);
}

export async function setSEOPageData<TData, TStats>(
  pageSlug: string,
  data: SEOPageData<TData, TStats>,
) {
  await setCache(`seo:page:${pageSlug}:data`, data, SEO_TTL_SECONDS);
}

export async function getOrSetSEOPageData<TData, TStats>(
  pageSlug: string,
  fetchFn: () => Promise<SEOPageData<TData, TStats> | null>,
) {
  if (!isRedisConfigured) {
    return fetchFn();
  }

  const cached = await getSEOPageData<TData, TStats>(pageSlug);
  if (cached !== null) return cached;

  const fresh = await fetchFn();
  if (fresh) {
    await setSEOPageData(pageSlug, fresh);
  }
  return fresh;
}
