import "dotenv/config";
import { sql } from "drizzle-orm";

import { fetchProviderSummary } from "@/lib/data/providers";
import { closeDb, getDb } from "@/lib/db";
import { getRedis } from "@/lib/redis";

const PROVIDER_TTL = 60 * 60;
const STREAMING_TTL = 30 * 60;

type ProviderRow = { slug: string };
type PlatformRow = { id: number; slug: string };
type ServerIdRow = { id: number };

async function refreshProviderSummaries() {
  const db = getDb();
  const redis = getRedis();

  const rows = await db.execute<ProviderRow>(
    sql`SELECT slug FROM providers WHERE is_active = true`,
  );

  for (const row of rows) {
    const summary = await fetchProviderSummary(row.slug);
    if (!summary) continue;

    const key = `provider:${row.slug}:summary`;
    const payload = Object.fromEntries(
      Object.entries(summary).map(([field, value]) => [field, value ?? ""]),
    ) as Record<string, string | number | boolean>;
    await redis.set(key, payload, { ex: PROVIDER_TTL });
  }

  return rows.length;
}

async function refreshStreamingCaches() {
  const db = getDb();
  const redis = getRedis();

  const platforms = await db.execute<PlatformRow>(
    sql`SELECT id, slug FROM streaming_platforms`,
  );

  for (const platform of platforms) {
    const rows = await db.execute<ServerIdRow>(sql`
      SELECT DISTINCT s.id
      FROM streaming_checks sc
      JOIN servers s ON sc.server_id = s.id
      WHERE sc.platform_id = ${platform.id}
        AND sc.is_unlocked = true
        AND sc.checked_at >= now() - interval '24 hours'
    `);

    const key = `streaming:${platform.slug}:servers`;
    await redis.del(key);

    const ids = rows.map((row) => row.id.toString());
    if (ids.length > 0) {
      const [first, ...rest] = ids;
      await redis.sadd(key, first, ...rest);
      await redis.expire(key, STREAMING_TTL);
    }
  }

  return platforms.length;
}

async function run() {
  const providerCount = await refreshProviderSummaries();
  const streamingCount = await refreshStreamingCaches();

  console.log(
    `Cache refresh complete. Providers: ${providerCount}, streaming platforms: ${streamingCount}.`,
  );
}

run()
  .then(async () => {
    await closeDb();
  })
  .catch(async (error) => {
    console.error("Cache refresh failed:", error);
    await closeDb();
    process.exit(1);
  });
