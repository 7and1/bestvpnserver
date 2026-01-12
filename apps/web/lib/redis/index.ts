import { createClient } from "redis";

type RedisSetOptions = {
  ex?: number;
};

type RedisClient = ReturnType<typeof createClient>;

let clientPromise: Promise<RedisClient> | null = null;

async function getClient(): Promise<RedisClient> {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!clientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (error) => {
      console.error("Redis error", error);
    });
    clientPromise = client.connect().then(() => client);
  }

  return clientPromise!;
}

const redisProxy = {
  async get(key: string): Promise<string | null> {
    const client = await getClient();
    const value = await client.get(key);
    if (value === null) return null;
    return value;
  },
  async set(
    key: string,
    value: unknown,
    options?: RedisSetOptions,
  ): Promise<void> {
    const client = await getClient();
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    if (options?.ex) {
      await client.set(key, payload, { EX: options.ex });
      return;
    }
    await client.set(key, payload);
  },
  async del(...keys: string[]): Promise<number> {
    const client = await getClient();
    return client.del(keys);
  },
  async keys(pattern: string): Promise<string[]> {
    const client = await getClient();
    return client.keys(pattern);
  },
  async lpush(key: string, ...values: string[]): Promise<number> {
    const client = await getClient();
    return client.lPush(key, values);
  },
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = await getClient();
    return client.lRange(key, start, stop);
  },
  async ltrim(key: string, start: number, stop: number): Promise<string> {
    const client = await getClient();
    return client.lTrim(key, start, stop);
  },
  async hset(
    key: string,
    data: Record<string, string | number | boolean>,
  ): Promise<number> {
    const client = await getClient();
    const normalized: Record<string, string | number> = {};
    for (const [field, value] of Object.entries(data)) {
      normalized[field] =
        typeof value === "boolean" ? (value ? "true" : "false") : value;
    }
    return client.hSet(key, normalized);
  },
  async sadd(key: string, ...members: string[]): Promise<number> {
    const client = await getClient();
    return client.sAdd(key, members);
  },
  async expire(key: string, seconds: number): Promise<void> {
    const client = await getClient();
    await client.expire(key, seconds);
  },
  async incr(key: string): Promise<number> {
    const client = await getClient();
    return client.incr(key);
  },
};

export function getRedis() {
  return redisProxy;
}

export async function getCache<T>(key: string): Promise<T | null> {
  const value = await getRedis().get(key);
  if (value === null) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  await getRedis().set(key, value, { ex: ttlSeconds });
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await getRedis().keys(pattern);
  if (keys.length > 0) {
    await getRedis().del(...keys);
  }
}
