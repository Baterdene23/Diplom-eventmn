'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store';
import { useInterestsStore } from '@/store';
import { eventsApi, venuesApi } from '@/lib/api';
import { formatDate, formatTime, formatPrice, cn, resolveEventImage } from '@/lib/utils';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Ticket, 
  Plus,
  Eye,
  Edit,
  MoreVertical,
  Users,
  DollarSign,
  Activity,
  ChevronRight
} from 'lucide-react';

interface Event {
  _id: string;
  title: string;
  date: string;
  startDate?: string;
  status: string;
  image?: string;
  category: string;
  venueName?: string;
  ticketsSold?: number;
  totalCapacity?: number;
  revenue?: number;
  isOnline?: boolean;
}

interface Venue {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

interface ActivityItem {
  id: string;
  type: 'ticket_sold' | 'event_created' | 'event_approved' | 'review';
  message: string;
  time: string;
}

export default function OrganizerDashboard() {
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const { tags: interestTags } = useInterestsStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalTickets: 0,
    totalRevenue: 0,
  });

  // Recent activity feed is not implemented yet; keep empty until backed by API.
  const [activities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch organizer's events
        // Include all statuses so draft/pending events appear on the dashboard.
        const eventsData = (await eventsApi.getMyEvents(accessToken, { limit: 10, status: 'all' })) as {
          events: Event[];
          pagination?: any;
        };
        const eventsList = eventsData.events || [];
        setEvents(eventsList);

        // Calculate base stats (sales computed separately from booking-service)
        const now = new Date();
        const activeEventsCount = eventsList.filter(
          (e) => new Date(e.date || e.startDate || '') >= now && e.status === 'PUBLISHED'
        ).length;

        setStats((prev) => ({
          ...prev,
          totalEvents: eventsList.length,
          activeEvents: activeEventsCount,
        }));

        // Compute tickets sold / revenue from bookings (authoritative)
        setSalesLoading(true);
        try {
          const { bookingApi } = await import('@/lib/api');
          const summaries = await Promise.all(
            eventsList.map(async (ev) => {
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
            })
          );

          const salesByEventId = new Map(summaries.map((s) => [s.eventId, s] as const));

          setEvents((prev) =>
            prev.map((ev) => {
              const sales = salesByEventId.get(ev._id);
              if (!sales) return ev;
              return {
                ...ev,
                ticketsSold: sales.ticketsSold,
                revenue: sales.revenue,
              };
            })
          );

          const totalTicketsSold = summaries.reduce((sum, s) => sum + (s.ticketsSold || 0), 0);
          const totalRevenue = summaries.reduce((sum, s) => sum + (s.revenue || 0), 0);

          setStats((prev) => ({
            ...prev,
            totalTickets: totalTicketsSold,
            totalRevenue: totalRevenue,
          }));
        } finally {
          setSalesLoading(false);
        }

        // Fetch venues
        try {
          const venuesData = await venuesApi.getAll() as { venues: Venue[] };
          setVenues(venuesData.venues || []);
        } catch (err) {
          console.error('Failed to fetch venues:', err);
        }

      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const recommend = async () => {
      try {
        const interest = (interestTags || []).map((t) => String(t || '').trim()).filter(Boolean);
        const eventsData = (await eventsApi.getAll({
          limit: 4,
          status: 'PUBLISHED',
          upcoming: true,
          recommend: true,
          ...(interest.length > 0 ? { tags: interest } : null),
        })) as { events: Event[] };
        setRecommendedEvents(eventsData.events || []);
      } catch (err) {
        console.error('Failed to fetch recommended events:', err);
        setRecommendedEvents([]);
      }
    };

    recommend();
  }, [isAuthenticated, accessToken, interestTags]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      DRAFT: { label: 'Ноорог', color: 'bg-gray-100 text-gray-700' },
      PENDING: { label: 'Хүлээгдэж буй', color: 'bg-yellow-100 text-yellow-700' },
      PUBLISHED: { label: 'Нийтлэгдсэн', color: 'bg-green-100 text-green-700' },
      CANCELLED: { label: 'Цуцлагдсан', color: 'bg-red-100 text-red-700' },
      COMPLETED: { label: 'Дууссан', color: 'bg-purple-100 text-purple-700' },
    };
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={cn('inline-block px-2 py-1 text-xs font-medium rounded-lg', config.color)}>
        {config.label}
      </span>
    );
  };

  const categoryLabels: Record<string, string> = {
    CONCERT: 'Концерт',
    SPORTS: 'Спорт',
    CONFERENCE: 'Хурал',
    EXHIBITION: 'Үзэсгэлэн',
    WORKSHOP: 'Сургалт',
    MEETUP: 'Уулзалт',
    OTHER: 'Бусад',
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'ticket_sold':
        return <Ticket className="w-4 h-4 text-green-500" />;
      case 'event_created':
        return <Plus className="w-4 h-4 text-blue-500" />;
      case 'event_approved':
        return <Activity className="w-4 h-4 text-purple-500" />;
      case 'review':
        return <Users className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Page Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Хянах самбар</h2>
        <p className="text-gray-500 mt-1">Сайн байна уу, {user?.firstName}! Таны арга хэмжээний тойм.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Нийт арга хэмжээ</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary-500" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <span>Бүртгэгдсэн нийт арга хэмжээ</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Идэвхтэй</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeEvents}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <span>Удахгүй болох нийтлэгдсэн арга хэмжээ</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Нийт тасалбар</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTickets.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Ticket className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <span>Нийт зарагдсан тасалбар</span>
            {salesLoading && <span className="ml-2 text-gray-400">(тооцоолж байна...)</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Орлого</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <span>Бүх хугацааны орлого</span>
            {salesLoading && <span className="ml-2 text-gray-400">(тооцоолж байна...)</span>}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Table - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Миний арга хэмжээнүүд</h3>
              <Link
                href="/dashboard/events"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                Бүгдийг харах
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Уншиж байна...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-2">Арга хэмжээ байхгүй</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Та анхны арга хэмжээгээ үүсгээрэй.
                </p>
                <Link
                  href="/events/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Арга хэмжээ үүсгэх
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Арга хэмжээ</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Огноо</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Төлөв</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тасалбар</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Үйлдэл</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {events.slice(0, 5).map((event) => (
                      <tr key={event._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                              {event.image ? (
                                <Image
                                  src={resolveEventImage(event.image, event._id, 'sm')}
                                  alt={event.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">{event.title}</p>
                              <p className="text-xs text-gray-500">
                                {categoryLabels[event.category] || event.category}
                                {event.isOnline && (
                                  <span className="ml-1 text-blue-600">• Онлайн</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{formatDate(event.startDate || event.date)}</div>
                          <div className="text-xs text-gray-500">{formatTime(event.startDate || event.date)}</div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(event.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{event.ticketsSold || 0}</div>
                          <div className="text-xs text-gray-500">зарагдсан</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/events/${event._id}`}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Харах"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/dashboard/events/${event._id}/edit`}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Засах"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Цэс"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recommended Events (under the main block) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Санал болгох</h3>
              <Link href="/events" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Бүгдийг харах
              </Link>
            </div>
            <div className="p-4 space-y-4">
              {recommendedEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Арга хэмжээ байхгүй</p>
              ) : (
                recommendedEvents.map((event) => (
                  <Link
                    key={event._id}
                    href={`/events/${event._id}`}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      {event.image ? (
                        <Image
                          src={resolveEventImage(event.image, event._id, 'sm')}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{event.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(event.startDate || event.date)}</p>
                      <p className="text-xs text-primary-600 font-medium mt-1">
                        {categoryLabels[event.category] || event.category}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Venues Map Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Байршлууд</h3>
              <Link
                href="/dashboard/venues"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Харах
              </Link>
            </div>
            <div className="p-4">
              {/* Map Placeholder */}
              <div className="relative h-48 bg-gray-100 rounded-xl overflow-hidden mb-3">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Газрын зураг</p>
                  </div>
                </div>
                {/* Venue markers would go here */}
                {venues.slice(0, 3).map((venue, index) => (
                  <div
                    key={venue._id}
                    className="absolute w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
                    style={{
                      top: `${30 + index * 25}%`,
                      left: `${20 + index * 20}%`,
                    }}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
              
              {/* Venue List */}
              <div className="space-y-2">
                {venues.slice(0, 3).map((venue, index) => (
                  <div key={venue._id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{venue.name}</p>
                      <p className="text-xs text-gray-500 truncate">{venue.address || venue.city}</p>
                    </div>
                  </div>
                ))}
                {venues.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Байршил байхгүй</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Сүүлийн үйл ажиллагаа</h3>
            </div>
            <div className="p-4">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Одоогоор үйл ажиллагааны мэдээлэл алга</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
