import Redis, { type RedisOptions } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export function getRedisClient(): Redis {
  if (!globalForRedis.redis) {
    const options: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    };

    globalForRedis.redis = new Redis(REDIS_URL, options);
  }

  return globalForRedis.redis;
}
