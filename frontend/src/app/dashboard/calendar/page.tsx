'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  CalendarCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Video,
  ExternalLink,
} from 'lucide-react';
import { bookingApi, eventsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';

interface OrganizerEvent {
  _id?: string;
  id?: string;
  title: string;
  startDate?: string;
  date?: string;
  status?: string;
  venueName?: string;
  isOnline?: boolean;
  meetingUrl?: string;
  meetingPlatform?: string;
}

interface BookingEvent {
  _id?: string;
  title: string;
  startDate?: string;
  date?: string;
  venueName?: string;
  isOnline?: boolean;
  meetingUrl?: string;
  meetingPlatform?: string;
}

interface BookingItem {
  id: string;
  _id?: string;
  eventId: string;
  eventTitle?: string;
  eventDate?: string;
  venueName?: string;
  status?: string;
  totalPrice?: number;
  event?: BookingEvent;
}

interface CalendarItem {
  id: string;
  title: string;
  date: string;
  allDay?: boolean;
  type: 'booking' | 'organizer';
  status?: string;
  venueName?: string;
  eventId?: string;
  isOnline?: boolean;
  meetingUrl?: string;
  meetingPlatform?: string;
}

const weekDays = ['Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям', 'Ням'];

const MN_MONTHS_SHORT = [
  '1-р сар',
  '2-р сар',
  '3-р сар',
  '4-р сар',
  '5-р сар',
  '6-р сар',
  '7-р сар',
  '8-р сар',
  '9-р сар',
  '10-р сар',
  '11-р сар',
  '12-р сар',
];

const MN_MONTHS_GENITIVE = [
  '1-р сарын',
  '2-р сарын',
  '3-р сарын',
  '4-р сарын',
  '5-р сарын',
  '6-р сарын',
  '7-р сарын',
  '8-р сарын',
  '9-р сарын',
  '10-р сарын',
  '11-р сарын',
  '12-р сарын',
];

const formatMnMonthYear = (value: Date) => `${value.getFullYear()} оны ${MN_MONTHS_SHORT[value.getMonth()]}`;
const formatMnMonthDay = (value: Date) => `${MN_MONTHS_GENITIVE[value.getMonth()]} ${value.getDate()}`;
const formatMnMonthDayYear = (value: Date) => `${formatMnMonthDay(value)}, ${value.getFullYear()}`;
const formatMnMonthShortDay = (value: Date) => `${MN_MONTHS_SHORT[value.getMonth()]} ${value.getDate()}`;

const getDateKey = (value: Date) => format(value, 'yyyy-MM-dd');

type NormalizedDate = { date: Date; allDay: boolean };

const normalizeStatus = (value?: string) => (value || '').toUpperCase();

const getStatusAccentClass = (item: CalendarItem) => {
  const status = normalizeStatus(item.status);

  // Organizer events
  if (item.type === 'organizer') {
    if (status === 'DRAFT') return 'bg-slate-400';
    if (status === 'PENDING') return 'bg-amber-400';
    if (status === 'PUBLISHED') return 'bg-emerald-400';
    if (status === 'CANCELLED') return 'bg-rose-400';
    if (status === 'COMPLETED') return 'bg-violet-400';
    return 'bg-emerald-400';
  }

  // Bookings: keep a distinct blue color (regardless of CONFIRMED),
  // so bookings and organizer-created events are visually different.
  if (status === 'CANCELLED') return 'bg-rose-400';
  if (status === 'REFUNDED' || status === 'EXPIRED') return 'bg-slate-400';
  return 'bg-blue-400';
};

const normalizeEventDate = (value?: string): NormalizedDate | null => {
  if (!value) return null;

  // Treat YYYY-MM-DD as an all-day local date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return { date: parsed, allDay: true };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return { date: parsed, allDay: false };
};

const toLocalCalendarIso = (normalized: NormalizedDate): string => {
  // Avoid timezone shifts for all-day local dates when calling toISOString().
  if (normalized.allDay) {
    const d = normalized.date;
    const localMidday = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    return localMidday.toISOString();
  }
  return normalized.date.toISOString();
};

const normalizeVenueName = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value?.name === 'string') return value.name;
  if (typeof value?.title === 'string') return value.title;
  return undefined;
};

const isCompletedOrPast = (item: CalendarItem, now: Date) => {
  const status = normalizeStatus(item.status);
  if (item.type === 'organizer' && status === 'COMPLETED') return true;
  if (item.type === 'booking' && status === 'EXPIRED') return true;

  // Hide items that are strictly in the past (prior days).
  // Keep today's items even if their time passed.
  const itemDate = new Date(item.date);
  if (Number.isNaN(itemDate.getTime())) return false;
  return differenceInCalendarDays(itemDate, now) < 0;
};

const isCompletedOrExpired = (item: CalendarItem) => {
  const status = normalizeStatus(item.status);
  if (item.type === 'organizer' && status === 'COMPLETED') return true;
  if (item.type === 'booking' && status === 'EXPIRED') return true;
  return false;
};

const mapWithConcurrency = async <T, R>(
  input: T[],
  concurrency: number,
  fn: (value: T, index: number) => Promise<R>
) => {
  const results: R[] = new Array(input.length);
  let cursor = 0;

  const workers = new Array(Math.max(1, concurrency)).fill(0).map(async () => {
    while (true) {
      const index = cursor++;
      if (index >= input.length) return;
      results[index] = await fn(input[index], index);
    }
  });

  await Promise.all(workers);
  return results;
};

const fetchAllBookings = async (token: string) => {
  const limit = 200;
  const maxPages = 50;
  const all: BookingItem[] = [];

  let page = 1;
  let totalPages: number | null = null;

  while (page <= maxPages) {
    // NOTE: booking-service doesn't support status=all; omit status to fetch all statuses.
    const res = (await bookingApi.getMyBookings(token, { limit, page })) as {
      bookings?: BookingItem[];
      pagination?: { totalPages?: number };
    };

    const list = Array.isArray(res?.bookings) ? res.bookings : [];
    all.push(...list);

    const tp = res?.pagination?.totalPages;
    if (typeof tp === 'number' && Number.isFinite(tp)) totalPages = tp;

    if (totalPages !== null) {
      if (page >= totalPages) break;
      page += 1;
      continue;
    }

    if (list.length < limit) break;
    page += 1;
  }

  return all;
};

const fetchAllOrganizerEvents = async (token: string) => {
  const limit = 200;
  const maxPages = 50;
  const all: OrganizerEvent[] = [];

  let page = 1;
  let totalPages: number | null = null;

  while (page <= maxPages) {
    const res = (await eventsApi.getMyEvents(token, {
      limit,
      page,
      status: 'all',
    })) as {
      events?: OrganizerEvent[];
      pagination?: { totalPages?: number };
    };

    const list = Array.isArray(res?.events) ? res.events : [];
    all.push(...list);

    const tp = res?.pagination?.totalPages;
    if (typeof tp === 'number' && Number.isFinite(tp)) totalPages = tp;

    if (totalPages !== null) {
      if (page >= totalPages) break;
      page += 1;
      continue;
    }

    if (list.length < limit) break;
    page += 1;
  }

  return all;
};

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

const toCalendarItem = (item: OrganizerEvent): CalendarItem | null => {
  const normalized = normalizeEventDate(item.startDate || item.date);
  if (!normalized) return null;
  const id = item._id || item.id;
  if (!id) return null;
  return {
    id,
    title: item.title,
    date: toLocalCalendarIso(normalized),
    allDay: normalized.allDay,
    type: 'organizer',
    status: item.status,
    venueName: normalizeVenueName((item as any).venueName || (item as any).venue),
    eventId: id,
    isOnline: item.isOnline,
    meetingUrl: item.meetingUrl,
    meetingPlatform: item.meetingPlatform,
  };
};

export default function CalendarPage() {
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<CalendarItem[]>([]);
  const [view, setView] = useState<CalendarView>('month');
  const [cursorDate, setCursorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [includePast, setIncludePast] = useState(false);

  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  useEffect(() => {
    // Organizers typically expect to see their full event history.
    if (isOrganizer) setIncludePast(true);
  }, [isOrganizer]);

  const items = useMemo(() => {
    if (includePast) {
      return allItems.filter((item) => !isCompletedOrExpired(item));
    }
    const now = new Date();
    return allItems.filter((item) => !isCompletedOrPast(item, now));
  }, [allItems, includePast]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

        const loadData = async () => {
          try {
            setLoading(true);

        if (isOrganizer) {
          const [eventsResult, bookingsResult] = await Promise.allSettled([
            fetchAllOrganizerEvents(accessToken),
            fetchAllBookings(accessToken),
          ]);

          const eventsList = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
          const bookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value : [];

          const organizerItems = (eventsList || [])
            .map((event) => toCalendarItem(event))
            .filter(Boolean) as CalendarItem[];

          const uniqueEventIds = Array.from(new Set(bookings.map((b) => b.eventId).filter(Boolean)));
          const fetchedEvents = await mapWithConcurrency(
            uniqueEventIds,
            10,
            async (eventId) => {
              try {
                const eventData = (await eventsApi.getById(eventId)) as { event: BookingEvent };
                return [eventId, eventData?.event] as const;
              } catch {
                return [eventId, null] as const;
              }
            }
          );

          const eventById = new Map<string, BookingEvent>();
          for (const [eventId, event] of fetchedEvents) {
            if (event) eventById.set(eventId, event);
          }

          const bookingsWithEvents = bookings.map((booking) => {
            const event = eventById.get(booking.eventId);
            return event ? { ...booking, event } : booking;
          });

          const bookingItems: CalendarItem[] = bookingsWithEvents
            .map((booking) => {
              const event = booking.event;
              const normalized = normalizeEventDate(event?.startDate || event?.date || booking.eventDate);
              if (!normalized) return null;
              const bookingId = booking.id || booking._id || booking.eventId;
              const eventId = event?._id || booking.eventId;
              if (!bookingId || !eventId) return null;
              return {
                id: bookingId,
                title: event?.title || booking.eventTitle || 'Арга хэмжээ',
                date: toLocalCalendarIso(normalized),
                allDay: normalized.allDay,
                type: 'booking',
                status: booking.status,
                venueName: normalizeVenueName((event as any)?.venueName || (event as any)?.venue || booking.venueName),
                eventId,
                isOnline: (event as any)?.isOnline,
                meetingUrl: (event as any)?.meetingUrl,
                meetingPlatform: (event as any)?.meetingPlatform,
              };
            })
            .filter(Boolean) as CalendarItem[];

          setAllItems([...organizerItems, ...bookingItems]);
          return;
        }

        const bookings = await fetchAllBookings(accessToken);

        const uniqueEventIds = Array.from(new Set(bookings.map((b) => b.eventId).filter(Boolean)));
        const fetchedEvents = await mapWithConcurrency(
          uniqueEventIds,
          10,
          async (eventId) => {
            try {
              const eventData = (await eventsApi.getById(eventId)) as { event: BookingEvent };
              return [eventId, eventData?.event] as const;
            } catch {
              return [eventId, null] as const;
            }
          }
        );

        const eventById = new Map<string, BookingEvent>();
        for (const [eventId, event] of fetchedEvents) {
          if (event) eventById.set(eventId, event);
        }

        const bookingsWithEvents = bookings.map((booking) => {
          const event = eventById.get(booking.eventId);
          return event ? { ...booking, event } : booking;
        });

        const calendarItems: CalendarItem[] = bookingsWithEvents
          .map((booking) => {
            const event = booking.event;
            const normalized = normalizeEventDate(event?.startDate || event?.date || booking.eventDate);
            if (!normalized) return null;
            const bookingId = booking.id || booking._id || booking.eventId;
            const eventId = event?._id || booking.eventId;
            if (!bookingId || !eventId) return null;
            return {
              id: bookingId,
              title: event?.title || booking.eventTitle || 'Арга хэмжээ',
              date: toLocalCalendarIso(normalized),
              allDay: normalized.allDay,
              type: 'booking',
              status: booking.status,
              venueName: normalizeVenueName((event as any)?.venueName || (event as any)?.venue || booking.venueName),
              eventId,
              isOnline: (event as any)?.isOnline,
              meetingUrl: (event as any)?.meetingUrl,
              meetingPlatform: (event as any)?.meetingPlatform,
            };
          })
          .filter(Boolean) as CalendarItem[];

        setAllItems(calendarItems);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [accessToken, isAuthenticated, isOrganizer]);

  useEffect(() => {
    // Keep the cursor aligned to the active view.
    const next = view === 'month' ? startOfMonth(selectedDate) : selectedDate;
    setCursorDate(next);
  }, [view, selectedDate]);

  const monthStart = useMemo(() => startOfMonth(cursorDate), [cursorDate]);
  const monthEnd = useMemo(() => endOfMonth(cursorDate), [cursorDate]);
  const monthLabel = useMemo(() => formatMnMonthYear(monthStart), [monthStart]);

  const weekStart = useMemo(() => startOfWeek(cursorDate, { weekStartsOn: 1 }), [cursorDate]);
  const weekEnd = useMemo(() => endOfWeek(cursorDate, { weekStartsOn: 1 }), [cursorDate]);

  const headerLabel = useMemo(() => {
    if (view === 'month') return monthLabel;
    if (view === 'week') return `${formatMnMonthDay(weekStart)} - ${formatMnMonthDayYear(weekEnd)}`;
    if (view === 'day') return formatMnMonthDayYear(cursorDate);
    return 'Хөтөлбөр';
  }, [view, monthLabel, weekStart, weekEnd, cursorDate]);

  const monthGridStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const monthGridEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);

  const days = useMemo(() => {
    const rows: Date[] = [];
    let day = monthGridStart;
    while (day <= monthGridEnd) {
      rows.push(day);
      day = addDays(day, 1);
    }
    return rows;
  }, [monthGridStart, monthGridEnd]);

  const weekDaysDates = useMemo(() => {
    const rows: Date[] = [];
    let day = weekStart;
    while (day <= weekEnd) {
      rows.push(day);
      day = addDays(day, 1);
    }
    return rows;
  }, [weekStart, weekEnd]);

  const itemsByDate = useMemo(() => {
    return items.reduce<Record<string, CalendarItem[]>>((acc, item) => {
      const key = getDateKey(new Date(item.date));
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  const selectedItems = useMemo(() => {
    const key = getDateKey(selectedDate);
    const list = itemsByDate[key] || [];
    return list
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [itemsByDate, selectedDate]);

  const upcomingItems = useMemo(() => {
    const now = new Date();
    return items
      .filter((item) => new Date(item.date) >= now)
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6);
  }, [items]);

  const agendaItems = useMemo(() => {
    const start = startOfDay(cursorDate);
    const end = addDays(start, 30);
    return items
      .filter((item) => {
        const value = new Date(item.date);
        return value >= start && value <= end;
      })
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [items, cursorDate]);

  const stats = useMemo(() => {
    const total = items.length;
    const upcoming = items.filter((item) => new Date(item.date) >= new Date()).length;
    const mine = items.filter((item) => item.type === 'organizer').length;
    return { total, upcoming, mine };
  }, [items]);

  const moveCursor = (direction: -1 | 1) => {
    if (view === 'month') {
      setCursorDate((prev) => (direction === -1 ? subMonths(prev, 1) : addMonths(prev, 1)));
      return;
    }
    if (view === 'week' || view === 'agenda') {
      setCursorDate((prev) => addDays(prev, direction * 7));
      return;
    }
    setCursorDate((prev) => addDays(prev, direction));
    setSelectedDate((prev) => addDays(prev, direction));
  };

  const setToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setCursorDate(view === 'month' ? startOfMonth(now) : now);
  };

  const formatTimeLabel = (item: CalendarItem) => {
    if (item.allDay) return 'Өдөржин';
    try {
      return format(new Date(item.date), 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_transparent_48%)]" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,_#f5d0fe_0%,_transparent_70%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-500">Төлөвлөлт</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-display font-semibold text-slate-900">
                Миний хуанли
              </h1>
              <p className="mt-2 text-slate-600 max-w-xl">
                {isOrganizer
                  ? 'Өөрийн арга хэмжээнүүдийг сар бүрээр төлөвлөж, огноо давхцахаас сэргийлээрэй.'
                  : 'Захиалсан арга хэмжээнүүдээ нэг дороос хараарай.'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/90 backdrop-blur border border-white shadow-sm px-4 py-3">
                <p className="text-xs text-slate-500">Нийт</p>
                <p className="text-lg font-semibold text-slate-900">{stats.total}</p>
              </div>
              <div className="rounded-2xl bg-white/90 backdrop-blur border border-white shadow-sm px-4 py-3">
                <p className="text-xs text-slate-500">Удахгүй</p>
                <p className="text-lg font-semibold text-slate-900">{stats.upcoming}</p>
              </div>
              <div className="rounded-2xl bg-white/90 backdrop-blur border border-white shadow-sm px-4 py-3">
                <p className="text-xs text-slate-500">Миний арга хэмжээ</p>
                <p className="text-lg font-semibold text-slate-900">{stats.mine}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          <section className="rounded-3xl bg-white shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{headerLabel}</p>
                <h2 className="text-xl font-semibold text-slate-900">Хуанли</h2>
              </div>
              <div className="flex items-center gap-2">
                <label className="hidden md:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={includePast}
                    onChange={(e) => setIncludePast(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  Өнгөрснийг харуулах
                </label>
                <div className="hidden sm:inline-flex rounded-full bg-slate-100 p-1">
                  {(
                    [
                      { id: 'month' as const, label: 'Сар' },
                      { id: 'week' as const, label: '7 хоног' },
                      { id: 'day' as const, label: 'Өдөр' },
                      { id: 'agenda' as const, label: 'Хөтөлбөр' },
                    ]
                  ).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setView(option.id)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-semibold rounded-full transition-all',
                        view === option.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => moveCursor(-1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={setToday}
                  className="hidden sm:inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300"
                >
                  Өнөөдөр
                </button>
                <button
                  type="button"
                  onClick={() => moveCursor(1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

             <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
               <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                 <span className="h-2 w-2 rounded-full bg-emerald-400" /> Миний арга хэмжээ
               </span>
               <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                 <span className="h-2 w-2 rounded-full bg-blue-400" /> Захиалга
               </span>
               <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                 <span className="h-2 w-2 rounded-full bg-slate-400" /> Ноорог
               </span>
               <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                 <span className="h-2 w-2 rounded-full bg-amber-400" /> Хүлээгдэж буй
               </span>
               <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                 <Video className="w-3 h-3 text-purple-500" /> Онлайн
               </span>
             </div>

            {view === 'month' && (
              <>
                <div className="mt-6 grid grid-cols-7 text-xs font-semibold uppercase text-slate-400">
                  {weekDays.map((day) => (
                    <div key={day} className="py-2 text-center">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {days.map((day) => {
                    const key = getDateKey(day);
                    const dayItems = itemsByDate[key] || [];
                    const isSelected = isSameDay(day, selectedDate);
                    const isOutsideMonth = !isSameMonth(day, monthStart);
                    const isFirstOfMonth = format(day, 'd') === '1';
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          'group rounded-2xl border border-transparent px-2 py-3 text-left transition-all',
                          isOutsideMonth && 'bg-slate-50 text-slate-400',
                          isToday(day) && 'border-primary-200 bg-primary-50',
                          isSelected && 'border-slate-900 bg-slate-900 text-white'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            'text-sm font-semibold',
                            isSelected
                              ? 'text-white'
                              : isOutsideMonth
                                ? 'text-slate-400'
                                : 'text-slate-900'
                          )}>
                            {format(day, 'd')}
                          </span>
                           {isFirstOfMonth && !isSelected && (
                             <span className={cn('text-[10px] font-medium', isOutsideMonth ? 'text-slate-400' : 'text-slate-500')}>
                               {MN_MONTHS_SHORT[day.getMonth()]}
                             </span>
                           )}
                          {dayItems.length > 0 && (
                            <span className={cn(
                              'text-[10px] font-medium',
                              isSelected ? 'text-white/70' : isOutsideMonth ? 'text-slate-300' : 'text-slate-400'
                            )}>
                              {dayItems.length}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {dayItems.slice(0, 3).map((item) => (
                            <span
                              key={`${item.id}-${item.type}`}
                              className={cn(
                                'h-2 w-2 rounded-full',
                                getStatusAccentClass(item),
                                isSelected && 'bg-white'
                              )}
                            />
                          ))}
                          {dayItems.length > 3 && (
                            <span className={cn('text-[10px] font-semibold', isSelected ? 'text-white/70' : 'text-slate-400')}>
                              +{dayItems.length - 3}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {view === 'week' && (
              <>
                <div className="mt-6 grid grid-cols-7 text-xs font-semibold uppercase text-slate-400">
                  {weekDays.map((day) => (
                    <div key={day} className="py-2 text-center">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                  {weekDaysDates.map((day) => {
                    const key = getDateKey(day);
                    const dayItems = (itemsByDate[key] || [])
                      .slice()
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    const isSelected = isSameDay(day, selectedDate);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          'rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left hover:bg-white hover:border-slate-200 transition-all',
                          isSelected && 'bg-slate-900 border-slate-900 text-white'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className={cn('text-sm font-semibold', isSelected ? 'text-white' : 'text-slate-900')}>
                            {format(day, 'd')}
                          </p>
                          {isToday(day) && (
                            <span className={cn('text-[10px] font-semibold', isSelected ? 'text-white/70' : 'text-primary-600')}>
                              Өнөөдөр
                            </span>
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          {dayItems.length === 0 ? (
                            <p className={cn('text-xs', isSelected ? 'text-white/70' : 'text-slate-400')}>
                              Төлөвлөгөө алга
                            </p>
                          ) : (
                            dayItems.slice(0, 3).map((item) => (
                              <div
                                key={`${item.id}-${item.type}`}
                                className={cn(
                                  'rounded-xl bg-white px-2.5 py-2 text-xs border border-slate-100',
                                  isSelected && 'bg-white/10 border-white/10'
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      'h-2 w-2 rounded-full flex-none',
                                      getStatusAccentClass(item),
                                      isSelected && 'bg-white'
                                    )}
                                  />
                                  <p className={cn('font-semibold truncate', isSelected ? 'text-white' : 'text-slate-900')}>
                                    {item.title}
                                  </p>
                                </div>
                                <p className={cn('mt-1 text-[11px]', isSelected ? 'text-white/70' : 'text-slate-500')}>
                                  {formatTimeLabel(item)}
                                </p>
                              </div>
                            ))
                          )}
                          {dayItems.length > 3 && (
                            <p className={cn('text-[11px] font-semibold', isSelected ? 'text-white/70' : 'text-slate-500')}>
                              +{dayItems.length - 3} нэмэлт
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {view === 'day' && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Өдрийн төлөвлөгөө</h3>
                  <p className="text-xs text-slate-500">{selectedItems.length} зүйл</p>
                </div>
                <div className="mt-4 space-y-3">
                  {loading ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      Хуанли ачаалж байна...
                    </div>
                  ) : selectedItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      Энэ өдөр төлөвлөгдсөн зүйл алга байна.
                    </div>
                  ) : (
                    selectedItems.map((item) => (
                      <div key={`${item.id}-${item.type}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                              {item.isOnline && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                                  <Video className="w-3 h-3" /> Онлайн
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                              <CalendarClock className="w-4 h-4" />
                              <span>{formatTimeLabel(item)}</span>
                            </div>
                            {item.isOnline ? (
                              item.meetingUrl && (
                                <a
                                  href={item.meetingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700"
                                >
                                  <Video className="w-4 h-4" />
                                  <span>Уулзалтад нэгдэх</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )
                            ) : item.venueName && (
                              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                <MapPin className="w-4 h-4" />
                                <span>{item.venueName}</span>
                              </div>
                            )}
                          </div>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                              item.type === 'organizer'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            )}
                          >
                            {item.type === 'organizer' ? 'Организатор' : 'Захиалга'}
                          </span>
                        </div>
                        {item.eventId && (
                          <Link
                            href={`/events/${item.eventId}`}
                            className="mt-4 inline-flex text-xs font-semibold text-primary-600 hover:text-primary-700"
                          >
                            Дэлгэрэнгүй үзэх
                          </Link>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {view === 'agenda' && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">30 хоногийн хөтөлбөр</h3>
                  <p className="text-xs text-slate-500">{agendaItems.length} зүйл</p>
                </div>
                <div className="mt-4 space-y-3">
                  {loading ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      Хуанли ачаалж байна...
                    </div>
                  ) : agendaItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      Одоогоор харагдах зүйл алга байна.
                    </div>
                  ) : (
                    agendaItems.map((item) => (
                      <button
                        key={`${item.id}-${item.type}`}
                        type="button"
                        onClick={() => setSelectedDate(new Date(item.date))}
                        className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left hover:border-slate-200 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-1 h-8 w-1.5 rounded-full',
                              getStatusAccentClass(item)
                            )}
                          />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-500">
                              {formatMnMonthShortDay(new Date(item.date))} · {formatTimeLabel(item)}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
                            {item.venueName && (
                              <p className="mt-1 text-xs text-slate-500">{item.venueName}</p>
                            )}
                          </div>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                              item.type === 'organizer'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            )}
                          >
                            {item.type === 'organizer' ? 'Организатор' : 'Захиалга'}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>

          <aside className="rounded-3xl bg-white shadow-sm border border-slate-100 p-6 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Сонгосон өдөр</p>
                <h3 className="text-xl font-semibold text-slate-900">
                  {formatMnMonthDay(selectedDate)}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <CalendarCheck className="w-5 h-5" />
                <span className="text-sm">{selectedItems.length}</span>
              </div>
            </div>

            <div className="mt-6 flex-1 space-y-4">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Хуанли ачаалж байна...
                </div>
              ) : selectedItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Энэ өдөр төлөвлөгдсөн зүйл алга байна.
                </div>
              ) : (
                selectedItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          {item.isOnline && (
                            <Video className="w-4 h-4 text-purple-500" />
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <CalendarClock className="w-4 h-4" />
                          <span>{formatTimeLabel(item)}</span>
                        </div>
                        {item.isOnline ? (
                          item.meetingUrl && (
                            <a
                              href={item.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700"
                            >
                              <Video className="w-4 h-4" />
                              <span>Уулзалтад нэгдэх</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )
                        ) : item.venueName && (
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <MapPin className="w-4 h-4" />
                            <span>{item.venueName}</span>
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                          item.type === 'organizer'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        )}
                      >
                        {item.type === 'organizer' ? 'Организатор' : 'Захиалга'}
                      </span>
                    </div>
                    {item.eventId && (
                      <Link
                        href={`/events/${item.eventId}`}
                        className="mt-4 inline-flex text-xs font-semibold text-primary-600 hover:text-primary-700"
                      >
                        Дэлгэрэнгүй үзэх
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Удахгүй болох</h4>
                <p className="text-xs text-slate-500">{stats.upcoming}</p>
              </div>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    Ачаалж байна...
                  </div>
                ) : upcomingItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    Удахгүй болох зүйл алга.
                  </div>
                ) : (
                  upcomingItems.map((item) => (
                    <button
                      key={`upcoming-${item.id}-${item.type}`}
                      type="button"
                      onClick={() => setSelectedDate(new Date(item.date))}
                      className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'mt-1 h-8 w-1.5 rounded-full',
                            getStatusAccentClass(item)
                          )}
                        />
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold text-slate-500">
                            {formatMnMonthShortDay(new Date(item.date))} · {formatTimeLabel(item)}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</p>
                          {item.venueName && (
                            <p className="mt-1 text-xs text-slate-500 line-clamp-1">{item.venueName}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-slate-900 p-6 text-white">
              <p className="text-sm font-semibold">Төлөвлөгөөгөө шинэчлэе</p>
              <p className="mt-2 text-xs text-white/70">
                {isOrganizer ? 'Шинэ арга хэмжээ үүсгээд хуанли дээрээ шууд хараарай.' : 'Шинэ арга хэмжээ олоод календараа дүүргээрэй.'}
              </p>
              <Link
                href={isOrganizer ? '/events/create' : '/events'}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-white/90 transition-colors"
              >
                {isOrganizer ? 'Шинэ арга хэмжээ үүсгэх' : 'Арга хэмжээ хайх'}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
