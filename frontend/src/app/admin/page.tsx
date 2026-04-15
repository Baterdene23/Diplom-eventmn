'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { formatPrice } from '@/lib/utils';
import {
  Calendar,
  Users,
  Ticket,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface AdminStats {
  overview: {
    totalBookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    todayBookings: number;
    weekBookings: number;
    monthBookings: number;
  };
  dailyStats: Array<{
    date: string;
    dayName: string;
    bookings: number;
    revenue: number;
  }>;
  recentBookings: Array<{
    id: string;
    userName: string;
    userEmail: string;
    eventTitle: string;
    totalAmount: number;
    status: string;
    seatCount: number;
    createdAt: string;
  }>;
  topEvents: Array<{
    eventId: string;
    eventTitle: string;
    bookingCount: number;
    totalRevenue: number;
  }>;
}

interface AdminUsersStats {
  totalUsers: number;
  activeUsers: number;
  roleCounts: Record<string, number>;
}

interface AdminEventsStats {
  totalEvents: number;
  statusCounts: Record<string, number>;
}

interface AdminEvent {
  _id: string;
  title: string;
  category: string;
  status: string;
  startDate: string;
  venueName?: string;
  createdAt: string;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const { accessToken } = useAuthStore();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersStats, setUsersStats] = useState<AdminUsersStats | null>(null);
  const [eventsStats, setEventsStats] = useState<AdminEventsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!accessToken) return;

      try {
        setLoading(true);
        setError(null);

        const [statsRes, eventsRes, usersRes] = await Promise.all([
          adminApi.getStats(accessToken) as Promise<AdminStats>,
          adminApi.getEvents(accessToken, { status: 'all', limit: 10 }) as Promise<{ events: AdminEvent[] }>,
          adminApi.getUsers(accessToken, { limit: 100 }) as Promise<{ users: AdminUser[] }>,
        ]);

        setStats(statsRes);
        setEvents(eventsRes.events || []);
        setUsers(usersRes.users || []);

        // Fetch full-count stats separately (event list & user list above are capped by limit)
        const [usersStatsRes, eventsStatsRes] = await Promise.all([
          adminApi.getUsersStats(accessToken) as Promise<AdminUsersStats>,
          adminApi.getEventsStats(accessToken) as Promise<AdminEventsStats>,
        ]);
        setUsersStats(usersStatsRes);
        setEventsStats(eventsStatsRes);
      } catch (err: any) {
        console.error('Dashboard fetch error:', err);
        setError(err?.message || 'Admin мэдээлэл уншихад алдаа гарлаа');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [accessToken]);

  const userStats = useMemo(() => {
    if (usersStats) {
      const totalUsers = usersStats.totalUsers || 0;
      const activeUsers = usersStats.activeUsers || 0;
      const totalAdmins = usersStats.roleCounts?.ADMIN || 0;
      const totalOrganizers = usersStats.roleCounts?.ORGANIZER || 0;
      const totalRegularUsers = usersStats.roleCounts?.USER || 0;
      return { totalUsers, totalAdmins, totalOrganizers, totalRegularUsers, activeUsers };
    }

    // Fallback (limited list)
    const totalUsers = users.length;
    const totalAdmins = users.filter((u) => u.role === 'ADMIN').length;
    const totalOrganizers = users.filter((u) => u.role === 'ORGANIZER').length;
    const totalRegularUsers = users.filter((u) => u.role === 'USER').length;
    const activeUsers = users.filter((u) => u.isActive).length;

    return { totalUsers, totalAdmins, totalOrganizers, totalRegularUsers, activeUsers };
  }, [users, usersStats]);

  const eventStats = useMemo(() => {
    if (eventsStats) {
      const totalEvents = eventsStats.totalEvents || 0;
      const publishedEvents = eventsStats.statusCounts?.PUBLISHED || 0;
      const pendingEvents = eventsStats.statusCounts?.PENDING || 0;
      const draftEvents = eventsStats.statusCounts?.DRAFT || 0;
      return { totalEvents, publishedEvents, pendingEvents, draftEvents };
    }

    // Fallback (limited list)
    const totalEvents = events.length;
    const publishedEvents = events.filter((e) => e.status === 'PUBLISHED').length;
    const pendingEvents = events.filter((e) => e.status === 'PENDING').length;
    const draftEvents = events.filter((e) => e.status === 'DRAFT').length;

    return { totalEvents, publishedEvents, pendingEvents, draftEvents };
  }, [events, eventsStats]);

  const pendingEvents = useMemo(
    () => events.filter((e) => e.status === 'PENDING').slice(0, 5),
    [events]
  );

  const formatDate = (value: string) =>
    new Date(value).toLocaleString('mn-MN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const maxDailyBookings = useMemo(() => {
    if (!stats?.dailyStats) return 1;
    return Math.max(...stats.dailyStats.map(d => d.bookings), 1);
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-4">Ачаалж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Системийн ерөнхий үзүүлэлт</p>
        </div>
        <div className="text-sm text-gray-500">
          Сүүлд шинэчлэгдсэн: {new Date().toLocaleString('mn-MN')}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Revenue & Booking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Нийт орлого</p>
              <p className="text-3xl font-bold mt-1">{formatPrice(stats?.overview?.totalRevenue || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm text-green-100">
            <TrendingUp className="w-4 h-4" />
            <span>Баталгаажсан захиалгуудаас</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Нийт захиалга</p>
              <p className="text-3xl font-bold mt-1">{stats?.overview?.totalBookings || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Ticket className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-300" />
              {stats?.overview?.confirmedBookings || 0}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-yellow-300" />
              {stats?.overview?.pendingBookings || 0}
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-300" />
              {stats?.overview?.cancelledBookings || 0}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Нийт хэрэглэгч</p>
              <p className="text-3xl font-bold mt-1">{userStats.totalUsers}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span>Organizer: {userStats.totalOrganizers}</span>
            <span>Admin: {userStats.totalAdmins}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Нийт эвент</p>
              <p className="text-3xl font-bold mt-1">{eventStats.totalEvents}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-300" />
              {eventStats.publishedEvents}
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-yellow-300" />
              {eventStats.pendingEvents}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Өнөөдөр</p>
            <span className="flex items-center text-green-500 text-xs">
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.overview?.todayBookings || 0}</p>
          <p className="text-xs text-gray-400">захиалга</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">7 хоног</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.overview?.weekBookings || 0}</p>
          <p className="text-xs text-gray-400">захиалга</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Энэ сар</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.overview?.monthBookings || 0}</p>
          <p className="text-xs text-gray-400">захиалга</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Идэвхтэй хэрэглэгч</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{userStats.activeUsers}</p>
          <p className="text-xs text-gray-400">/{userStats.totalUsers} нийт</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Bookings Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Сүүлийн 7 хоногийн захиалга</h3>
          <div className="space-y-3">
            {stats?.dailyStats?.map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <div className="w-12 text-sm text-gray-500">{day.dayName}</div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg flex items-center justify-end pr-2"
                      style={{ width: `${(day.bookings / maxDailyBookings) * 100}%`, minWidth: day.bookings > 0 ? '40px' : '0' }}
                    >
                      {day.bookings > 0 && (
                        <span className="text-xs font-medium text-white">{day.bookings}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right text-sm text-gray-600">
                  {formatPrice(day.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Events */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Топ эвентүүд</h3>
          {stats?.topEvents && stats.topEvents.length > 0 ? (
            <div className="space-y-3">
              {stats.topEvents.map((event, index) => (
                <div key={event.eventId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{event.eventTitle}</p>
                    <p className="text-sm text-gray-500">{event.bookingCount} захиалга</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{formatPrice(event.totalRevenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Захиалгатай эвент байхгүй байна
            </div>
          )}
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Events */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Хүлээгдэж буй эвентүүд</h2>
            <Link href="/admin/events" className="text-sm text-primary-600 hover:text-primary-700">
              Бүгдийг харах →
            </Link>
          </div>
          {pendingEvents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              Хүлээгдэж буй эвент байхгүй
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingEvents.map((event) => (
                <div key={event._id} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">{event.category} • {event.venueName || 'Байршилгүй'}</p>
                    </div>
                    <Link
                      href={`/admin/events`}
                      className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                    >
                      Шалгах
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Сүүлийн захиалгууд</h2>
            <Link href="/admin/bookings" className="text-sm text-primary-600 hover:text-primary-700">
              Бүгдийг харах →
            </Link>
          </div>
          {!stats?.recentBookings || stats.recentBookings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              Захиалга байхгүй
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.recentBookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{booking.userName || booking.userEmail}</p>
                      <p className="text-sm text-gray-500 truncate max-w-[200px]">{booking.eventTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatPrice(booking.totalAmount)}</p>
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                        booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {booking.status === 'CONFIRMED' ? 'Баталгаажсан' :
                         booking.status === 'PENDING' ? 'Хүлээгдэж буй' : 'Цуцлагдсан'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Түргэн үйлдлүүд</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/events"
            className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <Calendar className="w-6 h-6 text-blue-600" />
            <span className="font-medium text-blue-900">Эвент удирдах</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
          >
            <Users className="w-6 h-6 text-purple-600" />
            <span className="font-medium text-purple-900">Хэрэглэгч удирдах</span>
          </Link>
          <Link
            href="/admin/bookings"
            className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
          >
            <Ticket className="w-6 h-6 text-green-600" />
            <span className="font-medium text-green-900">Захиалга харах</span>
          </Link>
          <Link
            href="/admin/notifications"
            className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
          >
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <span className="font-medium text-orange-900">Мэдэгдэл илгээх</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
