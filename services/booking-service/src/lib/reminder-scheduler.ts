import { prisma } from './prisma';
import { publishMessage, ROUTING_KEYS } from './rabbitmq';
import { getRedisClient } from './redis';

const REMINDER_ENABLED = process.env.EVENT_REMINDER_ENABLED !== 'false';
const CHECK_INTERVAL_MINUTES = Number.parseInt(process.env.EVENT_REMINDER_INTERVAL_MINUTES || '15', 10);
const WINDOW_START_HOURS = Number.parseInt(process.env.EVENT_REMINDER_WINDOW_START_HOURS || '23', 10);
const WINDOW_END_HOURS = Number.parseInt(process.env.EVENT_REMINDER_WINDOW_END_HOURS || '25', 10);
const REMINDER_DEDUPE_TTL_SECONDS = Number.parseInt(process.env.EVENT_REMINDER_DEDUPE_TTL_SECONDS || '172800', 10);

let schedulerTimer: NodeJS.Timeout | null = null;
let isSweepRunning = false;

function getReminderDateKey(eventDate: Date): string {
  return eventDate.toISOString().slice(0, 10);
}

function buildReminderKey(bookingId: string, eventDate: Date): string {
  return `event-reminder:${bookingId}:${getReminderDateKey(eventDate)}`;
}

async function publishReminderForBooking(booking: {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  venueName: string;
}): Promise<'published' | 'skipped' | 'failed'> {
  const redis = getRedisClient();
  const dedupeKey = buildReminderKey(booking.id, booking.eventDate);

  const lockResult = await redis.set(dedupeKey, '1', 'EX', REMINDER_DEDUPE_TTL_SECONDS, 'NX');
  if (lockResult !== 'OK') {
    return 'skipped';
  }

  const published = await publishMessage(ROUTING_KEYS.EVENT_REMINDER, {
    bookingId: booking.id,
    eventId: booking.eventId,
    userId: booking.userId,
    userEmail: booking.userEmail,
    userName: booking.userName,
    eventTitle: booking.eventTitle,
    eventDate: booking.eventDate.toISOString(),
    venueName: booking.venueName,
    sentAt: new Date().toISOString(),
  });

  if (!published) {
    await redis.del(dedupeKey);
    return 'failed';
  }

  return 'published';
}

export async function runEventReminderSweep(): Promise<void> {
  if (!REMINDER_ENABLED || isSweepRunning) {
    return;
  }

  isSweepRunning = true;
  const now = Date.now();
  const windowStart = new Date(now + WINDOW_START_HOURS * 60 * 60 * 1000);
  const windowEnd = new Date(now + WINDOW_END_HOURS * 60 * 60 * 1000);

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        eventDate: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      select: {
        id: true,
        userId: true,
        userEmail: true,
        userName: true,
        eventId: true,
        eventTitle: true,
        eventDate: true,
        venueName: true,
      },
    });

    let published = 0;
    let skipped = 0;
    let failed = 0;

    for (const booking of bookings) {
      const result = await publishReminderForBooking(booking);
      if (result === 'published') {
        published += 1;
      } else if (result === 'skipped') {
        skipped += 1;
      } else {
        failed += 1;
      }
    }

    console.log(
      `[ReminderScheduler] sweep done: total=${bookings.length}, published=${published}, skipped=${skipped}, failed=${failed}, window=${windowStart.toISOString()}..${windowEnd.toISOString()}`
    );
  } catch (error) {
    console.error('[ReminderScheduler] sweep failed:', error);
  } finally {
    isSweepRunning = false;
  }
}

export function startEventReminderScheduler(): void {
  if (!REMINDER_ENABLED) {
    console.log('[ReminderScheduler] disabled by EVENT_REMINDER_ENABLED=false');
    return;
  }

  if (schedulerTimer) {
    return;
  }

  const intervalMs = Math.max(1, CHECK_INTERVAL_MINUTES) * 60 * 1000;

  void runEventReminderSweep();
  schedulerTimer = setInterval(() => {
    void runEventReminderSweep();
  }, intervalMs);

  schedulerTimer.unref?.();
  console.log(`[ReminderScheduler] started. Interval: ${CHECK_INTERVAL_MINUTES} minute(s)`);
}
