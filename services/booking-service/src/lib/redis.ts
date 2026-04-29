import Redis, { type RedisOptions } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis client singleton (lazily constructed to avoid build-time connections)
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

// Суудал түгжих хугацаа (seconds)
const SEAT_LOCK_TTL = Number.parseInt(process.env.SEAT_LOCK_TTL || '600', 10);

function seatKey(eventId: string, seatId: string): string {
  return `seat2:${eventId}:${seatId}`;
}

// Lua script: Олон суудлыг атомаар түгжих
// Бүх суудал сул байвал түгжинэ, нэг ч сул биш бол бүгдийг түгжихгүй
const LOCK_SEATS_LUA = `
local keys = KEYS
local userId = ARGV[1]
local ttl = tonumber(ARGV[2])

-- Эхлээд бүх key-г шалгах (аль нэг нь түгжигдсэн байвал буцах)
for i, key in ipairs(keys) do
  local existing = redis.call('GET', key)
  if existing then
    return {0, key}  -- Түгжигдсэн key буцаах
  end
end

-- Бүгд сул байвал түгжих
for i, key in ipairs(keys) do
  redis.call('SET', key, userId, 'EX', ttl, 'NX')
end

return {1, ''}  -- Амжилттай
`;

// Lua script: Суудлын түгжээ тайлах (зөвхөн эзэмшигч)
const UNLOCK_SEAT_LUA = `
local key = KEYS[1]
local userId = ARGV[1]

local currentLock = redis.call('GET', key)
if currentLock == userId then
  redis.call('DEL', key)
  return 1
end
return 0
`;

// Lua script: Түгжээний хугацаа сунгах (зөвхөн эзэмшигч)
const EXTEND_LOCK_LUA = `
local key = KEYS[1]
local userId = ARGV[1]
local ttl = tonumber(ARGV[2])

local currentLock = redis.call('GET', key)
if currentLock == userId then
  redis.call('EXPIRE', key, ttl)
  return 1
end
return 0
`;

/**
 * Суудал түгжих (Redis SETNX ашиглана)
 * Key format: seat:{eventId}:{sectionId}:{row}:{seatNumber}
 */
export async function lockSeat(
  eventId: string,
  sectionId: string,
  row: number,
  seatNumber: number,
  userId: string
): Promise<boolean> {
  const redis = getRedisClient();
  const key = `seat:${eventId}:${sectionId}:${row}:${seatNumber}`;
  
  // SETNX - зөвхөн key байхгүй үед set хийнэ (atomic operation)
  const result = await redis.set(key, userId, 'EX', SEAT_LOCK_TTL, 'NX');
  
  return result === 'OK';
}

/**
 * Суудлын түгжээ шалгах
 */
export async function getSeatLock(
  eventId: string,
  sectionId: string,
  row: number,
  seatNumber: number
): Promise<string | null> {
  const redis = getRedisClient();
  const key = `seat:${eventId}:${sectionId}:${row}:${seatNumber}`;
  return redis.get(key);
}

/**
 * Суудлын түгжээ тайлах (Lua script ашиглан атомаар)
 */
export async function unlockSeat(
  eventId: string,
  sectionId: string,
  row: number,
  seatNumber: number,
  userId: string
): Promise<boolean> {
  const redis = getRedisClient();
  const key = `seat:${eventId}:${sectionId}:${row}:${seatNumber}`;
  
  const result = await redis.eval(
    UNLOCK_SEAT_LUA,
    1,
    key,
    userId
  );
  
  return result === 1;
}

/**
 * Олон суудал нэг дор түгжих (Lua script ашиглан атомаар - Race condition байхгүй)
 */
export async function lockSeats(
  eventId: string,
  seats: Array<{ sectionId: string; row: number; seatNumber: number }>,
  userId: string
): Promise<{ success: boolean; lockedSeats: typeof seats; failedSeats: typeof seats; failedKey?: string }> {
  const redis = getRedisClient();
  const keys = seats.map(seat => 
    `seat:${eventId}:${seat.sectionId}:${seat.row}:${seat.seatNumber}`
  );

  // Lua script ашиглан атомаар түгжих
  const result = await redis.eval(
    LOCK_SEATS_LUA,
    keys.length,
    ...keys,
    userId,
    SEAT_LOCK_TTL.toString()
  ) as [number, string];

  const [success, failedKey] = result;

  if (success === 1) {
    return {
      success: true,
      lockedSeats: seats,
      failedSeats: [],
    };
  } else {
    // Аль суудал дээр алдаа гарсныг олох
    const failedIndex = keys.indexOf(failedKey);
    const failedSeat = failedIndex >= 0 ? [seats[failedIndex]] : [];
    
    return {
      success: false,
      lockedSeats: [],
      failedSeats: failedSeat.length > 0 ? failedSeat : seats,
      failedKey,
    };
  }
}

// V2: seatId-based locking (supports non-grid layouts)
export async function lockSeatIds(
  eventId: string,
  seatIds: string[],
  userId: string
): Promise<{ success: boolean; lockedSeatIds: string[]; failedSeatIds: string[]; failedKey?: string }>{
  const redis = getRedisClient();
  const clean = Array.from(new Set(seatIds.map((s) => String(s || '').trim()).filter(Boolean)));
  const keys = clean.map((sid) => seatKey(eventId, sid));

  if (keys.length === 0) {
    return { success: false, lockedSeatIds: [], failedSeatIds: seatIds };
  }

  const result = await redis.eval(
    LOCK_SEATS_LUA,
    keys.length,
    ...keys,
    userId,
    SEAT_LOCK_TTL.toString()
  ) as [number, string];

  const [success, failedKey] = result;
  if (success === 1) {
    return { success: true, lockedSeatIds: clean, failedSeatIds: [] };
  }

  const failedIndex = keys.indexOf(failedKey);
  const failedSeatId = failedIndex >= 0 ? [clean[failedIndex]] : clean;
  return { success: false, lockedSeatIds: [], failedSeatIds: failedSeatId, failedKey };
}

export async function getSeatIdLock(eventId: string, seatId: string): Promise<string | null> {
  const redis = getRedisClient();
  return redis.get(seatKey(eventId, seatId));
}

export async function unlockSeatId(eventId: string, seatId: string, userId: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = seatKey(eventId, seatId);
  const result = await redis.eval(UNLOCK_SEAT_LUA, 1, key, userId);
  return result === 1;
}

export async function getEventSeatIdLocks(eventId: string): Promise<Map<string, string>> {
  const redis = getRedisClient();
  const pattern = `seat2:${eventId}:*`;
  const status = new Map<string, string>();

  let cursor = '0';
  const keys: string[] = [];
  do {
    const [newCursor, foundKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = newCursor;
    keys.push(...foundKeys);
  } while (cursor !== '0');

  if (keys.length > 0) {
    const values = await redis.mget(keys);
    keys.forEach((key, idx) => {
      const parts = key.split(':');
      const seatId = parts.slice(2).join(':');
      const v = values[idx];
      if (v) status.set(seatId, v);
    });
  }

  return status;
}

/**
 * Event-ийн бүх суудлын төлөв авах (SCAN ашиглан - production-д илүү тохиромжтой)
 */
export async function getEventSeatsStatus(
  eventId: string
): Promise<Map<string, string>> {
  const redis = getRedisClient();
  const pattern = `seat:${eventId}:*`;
  const status = new Map<string, string>();
  
  // SCAN ашиглах - redis.keys()-ээс production-д илүү тохиромжтой
  let cursor = '0';
  const keys: string[] = [];
  
  do {
    const [newCursor, foundKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = newCursor;
    keys.push(...foundKeys);
  } while (cursor !== '0');
  
  if (keys.length > 0) {
    const values = await redis.mget(keys);
    keys.forEach((key, index) => {
      // key format: seat:{eventId}:{sectionId}:{row}:{seatNumber}
      const parts = key.split(':');
      const seatKey = `${parts[2]}:${parts[3]}:${parts[4]}`; // sectionId:row:seatNumber
      if (values[index]) {
        status.set(seatKey, values[index]!);
      }
    });
  }
  
  return status;
}

/**
 * Түгжээний хугацаа сунгах (Lua script ашиглан атомаар)
 */
export async function extendSeatLock(
  eventId: string,
  sectionId: string,
  row: number,
  seatNumber: number,
  userId: string
): Promise<boolean> {
  const redis = getRedisClient();
  const key = `seat:${eventId}:${sectionId}:${row}:${seatNumber}`;
  
  const result = await redis.eval(
    EXTEND_LOCK_LUA,
    1,
    key,
    userId,
    SEAT_LOCK_TTL.toString()
  );
  
  return result === 1;
}

/**
 * Олон суудлын түгжээг нэг дор сунгах
 */
export async function extendSeatsLock(
  eventId: string,
  seats: Array<{ sectionId: string; row: number; seatNumber: number }>,
  userId: string
): Promise<{ success: boolean; extended: number; failed: number }> {
  let extended = 0;
  let failed = 0;
  
  for (const seat of seats) {
    const result = await extendSeatLock(eventId, seat.sectionId, seat.row, seat.seatNumber, userId);
    if (result) {
      extended++;
    } else {
      failed++;
    }
  }
  
  return {
    success: failed === 0,
    extended,
    failed,
  };
}

/**
 * Хэрэглэгчийн бүх түгжээг тайлах
 */
export async function unlockAllUserSeats(
  eventId: string,
  userId: string
): Promise<number> {
  const redis = getRedisClient();
  const pattern = `seat:${eventId}:*`;
  let cursor = '0';
  let unlockedCount = 0;
  
  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = newCursor;
    
    if (keys.length > 0) {
      const values = await redis.mget(keys);
      for (let i = 0; i < keys.length; i++) {
        if (values[i] === userId) {
          await redis.del(keys[i]);
          unlockedCount++;
        }
      }
    }
  } while (cursor !== '0');
  
  return unlockedCount;
}
