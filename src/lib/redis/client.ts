import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export const redis =
  globalForRedis.redis ??
  (process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      })
    : null);

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

export async function getRedisClient() {
  if (!redis) {
    return null;
  }

  if (redis.status === "end") {
    return null;
  }

  if (redis.status === "wait") {
    await redis.connect();
  }

  return redis;
}

export async function createRedisSubscriber() {
  const client = await getRedisClient();

  if (!client) {
    return null;
  }

  const subscriber = client.duplicate({
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  await subscriber.connect();

  return subscriber;
}
