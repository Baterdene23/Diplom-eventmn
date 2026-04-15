'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { bookingApi } from '@/lib/api';
import { formatDate, formatTime, formatPrice, cn } from '@/lib/utils';
import { 
  Ticket, 
  Calendar,
  Clock,
  MapPin,
  Eye,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  QrCode
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

export default function DashboardTicketsPage() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    const fetchBookings = async () => {
      try {
        setLoading(true);
        const params: any = { page: currentPage };
        if (statusFilter) params.status = statusFilter;
        const data = await bookingApi.getMyBookings(accessToken, params) as { bookings: Booking[], pagination?: { totalPages: number } };
        setBookings(data.bookings || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [isAuthenticated, accessToken, currentPage, statusFilter]);

  const filteredBookings = bookings.filter(booking =>
    booking.eventTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const isUpcoming = (dateStr: string) => {
    return new Date(dateStr) >= new Date();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Миний тасалбар</h2>
          <p className="text-gray-500 mt-1">Таны бүх захиалгын жагсаалт</p>
        </div>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium text-sm"
        >
          <Calendar className="w-4 h-4" />
          Арга хэмжээ хайх
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Арга хэмжээ хайх..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white min-w-[160px]"
            >
              <option value="">Бүх төлөв</option>
              <option value="PENDING">Хүлээгдэж буй</option>
              <option value="CONFIRMED">Баталгаажсан</option>
              <option value="CANCELLED">Цуцлагдсан</option>
              <option value="REFUNDED">Буцаагдсан</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Уншиж байна...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">Захиалга олдсонгүй</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery ? 'Хайлтад тохирох захиалга олдсонгүй.' : 'Та арга хэмжээнд оролцохоор тасалбар захиалаарай.'}
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
          <>
            <div className="divide-y divide-gray-100">
              {filteredBookings.map((booking) => (
                <div key={booking._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* QR Code Placeholder */}
                    <div className="hidden sm:flex w-20 h-20 bg-gray-100 rounded-xl items-center justify-center flex-shrink-0">
                      <QrCode className="w-10 h-10 text-gray-400" />
                    </div>

                    {/* Booking Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link
                            href={`/events/${booking.eventId}`}
                            className="font-semibold text-gray-900 hover:text-primary-600 transition-colors block truncate"
                          >
                            {booking.eventTitle}
                          </Link>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
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

                          {/* Seats Info */}
                          <div className="mt-2 text-sm">
                            <span className="text-gray-600">
                              {booking.seats.length} суудал
                              {booking.seats.length > 0 && (
                                <span className="text-gray-400 ml-1">
                                  ({booking.seats.map(s => `${s.sectionName} ${s.row}-${s.seatNumber}`).join(', ')})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Price & Status */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-gray-900">{formatPrice(booking.totalPrice)}</p>
                          <div className="mt-2">
                            {getStatusBadge(booking.status)}
                          </div>
                          {isUpcoming(booking.eventDate) && booking.status === 'CONFIRMED' && (
                            <p className="text-xs text-green-600 mt-1">Удахгүй болно</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <Link
                          href={`/bookings/${booking._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Дэлгэрэнгүй
                        </Link>
                        {booking.status === 'CONFIRMED' && (
                          <Link
                            href={`/bookings/${booking._id}/ticket`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                          >
                            <QrCode className="w-4 h-4" />
                            Тасалбар харах
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Хуудас {currentPage} / {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
