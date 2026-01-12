import { isRedisConfigured } from "@/lib/env";
import { getCache, setCache } from "@/lib/redis";

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  if (!isRedisConfigured) {
    return fetchFn();
  }

  const cached = await getCache<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetchFn();
  await setCache(key, fresh, ttlSeconds);
  return fresh;
}
