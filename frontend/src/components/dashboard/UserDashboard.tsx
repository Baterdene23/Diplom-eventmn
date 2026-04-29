'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store';
import { bookingApi, eventsApi } from '@/lib/api';
import { formatDate, formatTime, formatPrice, cn, resolveEventImage } from '@/lib/utils';
import { useInterestsStore } from '@/store';
import { 
  Calendar, 
  Ticket, 
  Eye,
  Clock,
  MapPin,
  ChevronRight,
  CreditCard
} from 'lucide-react';

interface Booking {
  _id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  venueName?: string;
  seats: Array<{
    sectionName: string;
    row: number;
    seatNumber: number;
    price: number;
  }>;
  totalPrice: number;
  status: string;
  createdAt: string;
}

interface Event {
  _id: string;
  title: string;
  date: string;
  startDate?: string;
  image?: string;
  category: string;
  venueName?: string;
  price?: number;
  minPrice?: number;
  maxPrice?: number;
}

export default function UserDashboard() {
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const { tags: interestTags } = useInterestsStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingEvents: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user's bookings
        const bookingsData = await bookingApi.getMyBookings(accessToken, { page: 1 }) as { bookings: Booking[], pagination?: any };
        const bookingsList = bookingsData.bookings || [];
        setBookings(bookingsList);

        // Calculate stats
        const now = new Date();
        const upcomingCount = bookingsList.filter(b => 
          new Date(b.eventDate) >= now && b.status === 'CONFIRMED'
        ).length;
        
        const totalSpent = bookingsList
          .filter(b => b.status === 'CONFIRMED')
          .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        setStats({
          totalBookings: bookingsList.length,
          upcomingEvents: upcomingCount,
          totalSpent: totalSpent,
        });

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
        console.error('Failed to fetch events:', err);
        setRecommendedEvents([]);
      }
    };

    recommend();
  }, [isAuthenticated, accessToken, interestTags]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      PENDING: { label: 'Хүлээгдэж буй', color: 'bg-yellow-100 text-yellow-700' },
      CONFIRMED: { label: 'Баталгаажсан', color: 'bg-green-100 text-green-700' },
      CANCELLED: { label: 'Цуцлагдсан', color: 'bg-red-100 text-red-700' },
      REFUNDED: { label: 'Буцаагдсан', color: 'bg-gray-100 text-gray-700' },
      EXPIRED: { label: 'Хугацаа дууссан', color: 'bg-gray-100 text-gray-700' },
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
    WRESTLING: 'Бөх',
    OTHER: 'Бусад',
  };

  const getCategoryLabel = (category?: string) => {
    const key = (category || '').toUpperCase();
    return categoryLabels[key] || category || categoryLabels.OTHER;
  };

  // Interests UI lives in Profile page (EventX style)

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Page Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Хянах самбар</h2>
        <p className="text-gray-500 mt-1">Сайн байна уу, {user?.firstName}! Таны захиалгын тойм.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Нийт захиалга</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Ticket className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Удахгүй болох</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingEvents}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Нийт зарцуулсан</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalSpent)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Bookings List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Миний захиалгууд</h3>
            <Link
              href="/dashboard/tickets"
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
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-2">Захиалга байхгүй</h3>
              <p className="text-gray-500 text-sm mb-4">
                Та арга хэмжээнд оролцохоор тасалбар захиалаарай.
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium text-sm"
              >
                <Calendar className="w-4 h-4" />
                Арга хэмжээ хайх
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {bookings.slice(0, 5).map((booking) => (
                <div key={booking._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/events/${booking.eventId}`}
                        className="font-medium text-gray-900 hover:text-primary-600 transition-colors block truncate"
                      >
                        {booking.eventTitle}
                      </Link>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(booking.eventDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(booking.eventDate)}
                        </span>
                        {booking.venueName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {booking.venueName}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {booking.seats.length} суудал • {formatPrice(booking.totalPrice)}
                        </span>
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>
                    <Link
                      href={`/bookings/${booking._id}`}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-4"
                      title="Дэлгэрэнгүй"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Events (under "Миний захиалгууд") */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Санал болгох</h3>
            <Link
              href="/events"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
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
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(event.startDate || event.date)}
                    </p>
                    <p className="text-xs text-primary-600 font-medium mt-1">
                      {getCategoryLabel(event.category)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
