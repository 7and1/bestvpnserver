# Redis Cache Strategy - BestVPNServer.com

## Overview

- **Provider**: Redis (VPS) or Upstash Redis (managed)
- **Purpose**: Caching, rate limiting, job queues
- **Cost**: ~$10/month (pay-as-you-go)

If you deploy with the VPS data layer, Redis is self-hosted via `REDIS_URL` and rate limiting uses a Redis-based fixed window.

---

## 1. Cache Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CACHE LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Browser    │────▶│   CDN Edge   │────▶│  App Server  │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                              │                     │            │
│                              │ HTML (5min TTL)     │            │
│                              ▼                     ▼            │
│                        ┌──────────────────────────────┐         │
│                        │          REDIS               │         │
│                        │  ┌─────────────────────────┐ │         │
│                        │  │ L1: Hot Data (1-5 min)  │ │         │
│                        │  │ - Dashboard rankings    │ │         │
│                        │  │ - Latest measurements   │ │         │
│                        │  └─────────────────────────┘ │         │
│                        │  ┌─────────────────────────┐ │         │
│                        │  │ L2: Warm Data (1 hour)  │ │         │
│                        │  │ - Provider summaries    │ │         │
│                        │  │ - Country aggregates    │ │         │
│                        │  └─────────────────────────┘ │         │
│                        │  ┌─────────────────────────┐ │         │
│                        │  │ L3: SEO Pages (6 hours) │ │         │
│                        │  │ - Pre-rendered data     │ │         │
│                        │  │ - JSON-LD structured    │ │         │
│                        │  └─────────────────────────┘ │         │
│                        └──────────────────────────────┘         │
│                                     │                           │
│                                     ▼                           │
│                        ┌──────────────────────────────┐         │
│                        │        PostgreSQL            │         │
│                        └──────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Naming Convention

```
{domain}:{entity}:{id}:{view}
```

### Key Structure

```typescript
const CACHE_KEYS = {
  // L1: Real-time dashboard (TTL: 60-120s)
  "dashboard:rankings:global": "ZSET of server_ids by score",
  "dashboard:rankings:country:{iso}": "ZSET of server_ids by score",
  "server:{id}:latest": "HASH with latest metrics",
  "server:{id}:probe:{probe_id}:latest": "HASH with probe-specific latest",

  // L2: Aggregated data (TTL: 3600s)
  "provider:{slug}:summary": "HASH with avg speeds, uptime, server count",
  "country:{iso}:summary": "HASH with best servers, avg latency",
  "streaming:{platform}:servers": "SET of server_ids that unlock",

  // L3: SEO page data (TTL: 21600s / 6 hours)
  "seo:page:{slug}:data": "JSON blob for page rendering",
  "seo:page:{slug}:html": "Pre-rendered HTML fragment",

  // Job queues
  "probe:jobs:{region}": "LIST of pending test jobs",
  "probe:results:queue": "LIST of results awaiting batch insert",

  // Rate limiting
  "ratelimit:{ip}:{endpoint}": "Counter with TTL",

  // Cache invalidation tracking
  "invalidation:server:{id}": "Timestamp of last update",
};
```

---

## 3. Implementation

### Upstash Client Setup

```typescript
// lib/redis.ts
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Helper for typed cache operations
export async function getCache<T>(key: string): Promise<T | null> {
  return redis.get<T>(key);
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  await redis.set(key, value, { ex: ttlSeconds });
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### Dashboard Rankings

```typescript
// lib/cache/rankings.ts
import { redis } from "@/lib/redis";

const RANKING_TTL = 120; // 2 minutes

interface ServerScore {
  serverId: number;
  score: number; // Composite score based on speed, latency, uptime
}

export async function updateServerRanking(server: ServerScore): Promise<void> {
  await redis.zadd("dashboard:rankings:global", {
    score: server.score,
    member: server.serverId.toString(),
  });
  await redis.expire("dashboard:rankings:global", RANKING_TTL);
}

export async function getTopServers(limit: number = 10): Promise<number[]> {
  const results = await redis.zrange(
    "dashboard:rankings:global",
    0,
    limit - 1,
    {
      rev: true,
    },
  );
  return results.map((id) => parseInt(id as string));
}

export async function getCountryRanking(
  countryCode: string,
  limit: number = 10,
): Promise<number[]> {
  const key = `dashboard:rankings:country:${countryCode.toLowerCase()}`;
  const results = await redis.zrange(key, 0, limit - 1, { rev: true });
  return results.map((id) => parseInt(id as string));
}
```

### Server Latest Metrics

```typescript
// lib/cache/server-metrics.ts
import { redis } from "@/lib/redis";

const LATEST_TTL = 120; // 2 minutes

interface LatestMetrics {
  pingMs: number;
  downloadMbps: number;
  uploadMbps: number;
  connectionSuccess: boolean;
  measuredAt: string;
}

export async function setServerLatest(
  serverId: number,
  metrics: LatestMetrics,
): Promise<void> {
  const key = `server:${serverId}:latest`;
  await redis.hset(key, metrics);
  await redis.expire(key, LATEST_TTL);
}

export async function getServerLatest(
  serverId: number,
): Promise<LatestMetrics | null> {
  const key = `server:${serverId}:latest`;
  return redis.hgetall<LatestMetrics>(key);
}

export async function getMultipleServerLatest(
  serverIds: number[],
): Promise<Map<number, LatestMetrics>> {
  const pipeline = redis.pipeline();

  for (const id of serverIds) {
    pipeline.hgetall(`server:${id}:latest`);
  }

  const results = await pipeline.exec<(LatestMetrics | null)[]>();
  const map = new Map<number, LatestMetrics>();

  serverIds.forEach((id, index) => {
    if (results[index]) {
      map.set(id, results[index]!);
    }
  });

  return map;
}
```

### Provider Summary Cache

```typescript
// lib/cache/provider-summary.ts
import { redis } from "@/lib/redis";

const SUMMARY_TTL = 3600; // 1 hour

interface ProviderSummary {
  serverCount: number;
  avgDownload: number;
  avgLatency: number;
  uptimePercent: number;
  countriesCount: number;
  lastUpdated: string;
}

export async function setProviderSummary(
  providerSlug: string,
  summary: ProviderSummary,
): Promise<void> {
  const key = `provider:${providerSlug}:summary`;
  await redis.hset(key, summary);
  await redis.expire(key, SUMMARY_TTL);
}

export async function getProviderSummary(
  providerSlug: string,
): Promise<ProviderSummary | null> {
  const key = `provider:${providerSlug}:summary`;
  return redis.hgetall<ProviderSummary>(key);
}
```

### Streaming Unlock Cache

```typescript
// lib/cache/streaming.ts
import { redis } from "@/lib/redis";

const STREAMING_TTL = 1800; // 30 minutes

export async function setStreamingServers(
  platform: string,
  serverIds: number[],
): Promise<void> {
  const key = `streaming:${platform}:servers`;
  await redis.del(key);
  if (serverIds.length > 0) {
    await redis.sadd(key, ...serverIds.map((id) => id.toString()));
    await redis.expire(key, STREAMING_TTL);
  }
}

export async function getStreamingServers(platform: string): Promise<number[]> {
  const key = `streaming:${platform}:servers`;
  const results = await redis.smembers(key);
  return results.map((id) => parseInt(id));
}

export async function checkServerStreaming(
  serverId: number,
  platform: string,
): Promise<boolean> {
  const key = `streaming:${platform}:servers`;
  return redis.sismember(key, serverId.toString());
}
```

---

## 4. SEO Page Cache

```typescript
// lib/cache/seo-pages.ts
import { redis } from "@/lib/redis";

const SEO_TTL = 21600; // 6 hours

interface SEOPageData {
  title: string;
  description: string;
  servers: any[];
  stats: any;
  schema: object;
  lastUpdated: string;
}

export async function setSEOPageData(
  pageSlug: string,
  data: SEOPageData,
): Promise<void> {
  const key = `seo:page:${pageSlug}:data`;
  await redis.set(key, JSON.stringify(data), { ex: SEO_TTL });
}

export async function getSEOPageData(
  pageSlug: string,
): Promise<SEOPageData | null> {
  const key = `seo:page:${pageSlug}:data`;
  const data = await redis.get<string>(key);
  return data ? JSON.parse(data) : null;
}

// Cache-aside pattern for SEO pages
export async function getOrSetSEOPage(
  pageSlug: string,
  fetchFn: () => Promise<SEOPageData>,
): Promise<SEOPageData> {
  const cached = await getSEOPageData(pageSlug);
  if (cached) return cached;

  const fresh = await fetchFn();
  await setSEOPageData(pageSlug, fresh);
  return fresh;
}
```

---

## 5. Job Queue

```typescript
// lib/cache/job-queue.ts
import { redis } from "@/lib/redis";

interface ProbeJob {
  serverId: number;
  hostname: string;
  protocol: string;
  tier: "hot" | "warm" | "cold";
  targets: string[];
}

export async function enqueueProbeJob(
  region: string,
  job: ProbeJob,
): Promise<void> {
  const key = `probe:jobs:${region}`;
  await redis.rpush(key, JSON.stringify(job));
}

export async function dequeueProbeJob(
  region: string,
): Promise<ProbeJob | null> {
  const key = `probe:jobs:${region}`;
  const job = await redis.lpop<string>(key);
  return job ? JSON.parse(job) : null;
}

export async function getQueueLength(region: string): Promise<number> {
  const key = `probe:jobs:${region}`;
  return redis.llen(key);
}

// Results queue
export async function enqueueResult(result: object): Promise<void> {
  await redis.lpush("probe:results:queue", JSON.stringify(result));
}

export async function dequeueResults(count: number): Promise<object[]> {
  const results = await redis.lrange("probe:results:queue", 0, count - 1);
  if (results.length > 0) {
    await redis.ltrim("probe:results:queue", results.length, -1);
  }
  return results.map((r) => JSON.parse(r as string));
}
```

---

## 6. Rate Limiting

```typescript
// lib/cache/rate-limit.ts
import { redis } from "@/lib/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Create rate limiters for different endpoints
export const rateLimiters = {
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
    analytics: true,
  }),

  webhooks: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, "1 m"), // 1000 per minute for probes
    analytics: true,
  }),

  tools: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 tool uses per minute
    analytics: true,
  }),
};

// Usage in API route
export async function checkRateLimit(
  identifier: string,
  limiter: keyof typeof rateLimiters,
): Promise<{ success: boolean; remaining: number }> {
  const result = await rateLimiters[limiter].limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
  };
}
```

---

## 7. Cache Invalidation

```typescript
// lib/cache/invalidation.ts
import { redis } from "@/lib/redis";

export async function onNewMeasurement(
  serverId: number,
  probeId: number,
  data: any,
): Promise<void> {
  const pipe = redis.pipeline();

  // Update L1 immediately
  pipe.hset(`server:${serverId}:latest`, data);
  pipe.expire(`server:${serverId}:latest`, 120);

  // Update ranking sorted set
  const score = calculateScore(data);
  pipe.zadd("dashboard:rankings:global", {
    score,
    member: serverId.toString(),
  });

  // Mark L2/L3 for lazy refresh
  pipe.set(`invalidation:server:${serverId}`, Date.now().toString());

  await pipe.exec();
}

export async function invalidateProviderCache(
  providerSlug: string,
): Promise<void> {
  await redis.del(`provider:${providerSlug}:summary`);

  // Invalidate all SEO pages for this provider
  const pageKeys = await redis.keys(`seo:page:${providerSlug}:*`);
  if (pageKeys.length > 0) {
    await redis.del(...pageKeys);
  }
}

export async function invalidateStreamingCache(
  platform: string,
): Promise<void> {
  await redis.del(`streaming:${platform}:servers`);

  // Invalidate related SEO pages
  const pageKeys = await redis.keys(`seo:page:*-${platform}:*`);
  if (pageKeys.length > 0) {
    await redis.del(...pageKeys);
  }
}

function calculateScore(data: any): number {
  // Composite score: higher is better
  const speedScore = Math.min(data.downloadMbps / 100, 1) * 40;
  const latencyScore = Math.max(0, 1 - data.pingMs / 200) * 30;
  const uptimeScore = data.connectionSuccess ? 30 : 0;

  return speedScore + latencyScore + uptimeScore;
}
```

---

## 8. Cache Warming

```typescript
// lib/cache/warming.ts
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";

export async function warmDashboardCache(): Promise<void> {
  // Fetch top servers from materialized view
  const topServers = await db.query.mvServerLatestPerformance.findMany({
    orderBy: (t, { desc }) => desc(t.downloadMbps),
    limit: 100,
  });

  const pipe = redis.pipeline();

  for (const server of topServers) {
    const score = calculateScore(server);
    pipe.zadd("dashboard:rankings:global", {
      score,
      member: server.serverId.toString(),
    });

    pipe.hset(`server:${server.serverId}:latest`, {
      pingMs: server.pingMs,
      downloadMbps: server.downloadMbps,
      uploadMbps: server.uploadMbps,
      connectionSuccess: server.connectionSuccess,
      measuredAt: server.measuredAt.toISOString(),
    });
    pipe.expire(`server:${server.serverId}:latest`, 120);
  }

  pipe.expire("dashboard:rankings:global", 120);
  await pipe.exec();
}

export async function warmProviderCaches(): Promise<void> {
  const providers = await db.query.providers.findMany({
    where: (p, { eq }) => eq(p.isActive, true),
  });

  for (const provider of providers) {
    const summary = await calculateProviderSummary(provider.id);
    await redis.hset(`provider:${provider.slug}:summary`, summary);
    await redis.expire(`provider:${provider.slug}:summary`, 3600);
  }
}

// Run on cron job
export async function warmAllCaches(): Promise<void> {
  await Promise.all([warmDashboardCache(), warmProviderCaches()]);
}
```

---

## 9. Monitoring

```typescript
// lib/cache/monitoring.ts
import { redis } from "@/lib/redis";

interface CacheStats {
  hitRate: number;
  totalKeys: number;
  memoryUsage: string;
  queueLengths: Record<string, number>;
}

export async function getCacheStats(): Promise<CacheStats> {
  const info = await redis.info();

  // Get queue lengths
  const regions = ["iad", "lax", "fra", "lhr", "sin", "nrt", "syd", "gru"];
  const queueLengths: Record<string, number> = {};

  for (const region of regions) {
    queueLengths[region] = await redis.llen(`probe:jobs:${region}`);
  }

  queueLengths["results"] = await redis.llen("probe:results:queue");

  return {
    hitRate: 0, // Calculate from analytics
    totalKeys: await redis.dbsize(),
    memoryUsage: info.used_memory_human || "N/A",
    queueLengths,
  };
}

export async function checkCacheHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
```

---

## 10. Environment Variables

```bash
# .env.local
REDIS_URL=redis://:password@host:6379/0
```

---

**Version**: 1.0
**Last Updated**: 2026-01-12
