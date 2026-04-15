'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import { eventsApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { 
  Calendar,
  Ticket,
  DollarSign,
  Users,
  BarChart3,
  PieChart,
} from 'lucide-react';

interface Event {
  _id: string;
  title: string;
  date: string;
  ticketsSold?: number;
  totalCapacity?: number;
  revenue?: number;
  category: string;
  ticketInfo?: Array<{ total?: number; available?: number; price?: number }>;
}

export default function DashboardAnalyticsPage() {
  const { accessToken, isAuthenticated, user } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  if (!isAuthenticated || !isOrganizer) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Энэ хуудсыг харах эрх байхгүй байна.</p>
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    CONCERT: 'Концерт',
    SPORTS: 'Спорт',
    CONFERENCE: 'Хурал',
    EXHIBITION: 'Үзэсгэлэн',
    WORKSHOP: 'Сургалт',
    MEETUP: 'Уулзалт',
    OTHER: 'Бусад',
  };

  const msByRange: Record<typeof timeRange, number> = {
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };

  const rangeLabel = timeRange === 'week' ? '7 хоног' : timeRange === 'month' ? '30 хоног' : 'Жил';

  const now = Date.now();
  const rangeMs = msByRange[timeRange];
  const windowStart = now - rangeMs;
  const windowEnd = now + rangeMs;
  const inRange = (d?: string) => {
    if (!d) return false;
    const t = new Date(d).getTime();
    if (!Number.isFinite(t)) return false;
    return t >= windowStart && t <= windowEnd;
  };

  const eventsInRange = events.filter((e) => inRange(e.date));
  const totalRevenue = eventsInRange.reduce((sum, e) => sum + (e.revenue || 0), 0);
  const totalTickets = eventsInRange.reduce((sum, e) => sum + (e.ticketsSold || 0), 0);
  const totalEvents = eventsInRange.length;
  const avgAttendance = totalEvents ? Math.round(totalTickets / totalEvents) : 0;

  const totalCapacity = eventsInRange.reduce((sum, e) => sum + (e.totalCapacity || 0), 0);
  const attendancePct = totalCapacity ? Math.round((totalTickets / totalCapacity) * 100) : null;

  const ticketsByCategoryRaw = eventsInRange.reduce<Record<string, number>>((acc, e) => {
    const key = (e.category || 'OTHER').toUpperCase();
    acc[key] = (acc[key] || 0) + (e.ticketsSold || 0);
    return acc;
  }, {});

  const ticketsByCategory = Object.entries(ticketsByCategoryRaw)
    .map(([category, count]) => ({
      category: categoryLabels[category] || category,
      count,
      color:
        category === 'SPORTS' ? 'bg-blue-500' :
        category === 'CONCERT' ? 'bg-green-500' :
        category === 'CONFERENCE' ? 'bg-orange-500' :
        category === 'WORKSHOP' ? 'bg-amber-500' :
        category === 'MEETUP' ? 'bg-pink-500' :
        category === 'EXHIBITION' ? 'bg-indigo-500' :
        'bg-gray-500',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const topEvents = [...eventsInRange]
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 10)
    .map((e) => ({ title: e.title, tickets: e.ticketsSold || 0, revenue: e.revenue || 0 }));

  const computeTotalCapacity = (ev: Event): number | undefined => {
    if (!Array.isArray(ev.ticketInfo) || ev.ticketInfo.length === 0) return undefined;
    const cap = ev.ticketInfo.reduce((sum, t) => sum + (typeof t?.total === 'number' ? t.total : 0), 0);
    return cap > 0 ? cap : undefined;
  };

  async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let i = 0;
    const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
      while (true) {
        const idx = i;
        i += 1;
        if (idx >= items.length) return;
        out[idx] = await fn(items[idx]);
      }
    });
    await Promise.all(workers);
    return out;
  }

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !isOrganizer) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = (await eventsApi.getMyEvents(accessToken, { limit: 50 })) as { events: Event[] };
        const list = (data.events || []).map((ev) => ({
          ...ev,
          ...(typeof ev.totalCapacity === 'number' ? null : { totalCapacity: computeTotalCapacity(ev) }),
        }));
        setEvents(list);

        // Fetch authoritative ticket/revenue totals from booking-service.
        setSalesLoading(true);
        try {
          const { bookingApi } = await import('@/lib/api');
          const inWindow = list.filter((e) => inRange(e.date));
          const summaries = await mapLimit(
            inWindow,
            6,
            async (ev) => {
              try {
                const summary = await bookingApi.getEventSalesSummary(ev._id, accessToken, {
                  status: 'CONFIRMED',
                  limit: 200,
                  maxPages: 50,
                });
                return { eventId: ev._id, ...summary };
              } catch {
                return { eventId: ev._id, ticketsSold: 0, revenue: 0 };
              }
            }
          );

          const byId = new Map(summaries.map((s) => [s.eventId, s] as const));
          setEvents((prev) =>
            prev.map((ev) => {
              const s = byId.get(ev._id);
              if (!s) return ev;
              return {
                ...ev,
                ticketsSold: s.ticketsSold,
                revenue: s.revenue,
              };
            })
          );
        } finally {
          setSalesLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, accessToken, isOrganizer, timeRange]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Уншиж байна...</p>
      </div>
    );
  }

  const totalCategoryTickets = ticketsByCategory.reduce((sum, c) => sum + c.count, 0);

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Шинжилгээ</h2>
          <p className="text-gray-500 mt-1">Таны арга хэмжээний гүйцэтгэлийн тойм</p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range === 'week' ? '7 хоног' : range === 'month' ? '30 хоног' : 'Жил'}
            </button>
          ))}
        </div>
      </div>

      {salesLoading && (
        <div className="mb-4">
          <p className="text-xs text-gray-500">Борлуулалтын мэдээлэл ({rangeLabel}) тооцоолж байна...</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="flex items-center text-xs font-medium text-gray-500">{timeRange === 'week' ? '7 хоног' : timeRange === 'month' ? '30 хоног' : 'Жил'}</span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Нийт орлого</p>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(totalRevenue)}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Ticket className="w-5 h-5 text-blue-600" />
            </div>
            <span className="flex items-center text-xs font-medium text-gray-500">Зарагдсан</span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Зарагдсан тасалбар</p>
          <p className="text-2xl font-bold text-gray-900">{totalTickets.toLocaleString()}</p>
          {salesLoading && <p className="text-xs text-gray-400 mt-1">Тооцоолж байна...</p>}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <span className="flex items-center text-xs font-medium text-gray-500">Нийт</span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Нийт арга хэмжээ</p>
          <p className="text-2xl font-bold text-gray-900">{totalEvents}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <span className="flex items-center text-xs font-medium text-gray-500">
              {attendancePct === null ? '-' : `${attendancePct}%`}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Дундаж зарагдалт</p>
          <p className="text-2xl font-bold text-gray-900">{avgAttendance}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue placeholder */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Орлого</h3>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Энэ хэсгийг бодитоор графикчлахын тулд захиалга/орлогын time-series endpoint хэрэгтэй.
          </p>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Ангилалаар</h3>
          </div>

          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-8 border-gray-200" />
            <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-gray-900">{totalCategoryTickets}</span>
            </div>
          </div>

          <div className="space-y-2">
            {ticketsByCategory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Мэдээлэл алга</p>
            ) : (
              ticketsByCategory.map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-gray-600">{item.category}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Events Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Шилдэг арга хэмжээнүүд</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Арга хэмжээ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тасалбар</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Орлого</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topEvents.map((event, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{event.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{event.tickets}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatPrice(event.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
