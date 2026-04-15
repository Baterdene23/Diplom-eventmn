'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store';
import { eventsApi } from '@/lib/api';
import { formatDate, formatTime, formatPrice, cn, resolveEventImage } from '@/lib/utils';
import { 
  Calendar, 
  Plus,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Video,
  Users
} from 'lucide-react';

interface Event {
  _id: string;
  title: string;
  date: string;
  status: string;
  image?: string;
  category: string;
  venueName?: string;
  ticketsSold?: number;
  totalCapacity?: number;
  revenue?: number;
  isOnline?: boolean;
  meetingPlatform?: string;
  ticketInfo?: Array<{ total?: number }>;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  ticketCount: number;
  totalPaid: number;
  bookedAt?: string;
  status: string;
}

export default function DashboardEventsPage() {
  const { accessToken, isAuthenticated, user } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Participants modal state
  const [showParticipants, setShowParticipants] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const normalizeBookingStatus = (status?: string) => (status || '').toLowerCase();

  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !isOrganizer) {
      return;
    }

    const fetchEvents = async () => {
      try {
        setLoading(true);
        const params: any = { page: currentPage, limit: 10 };
        // Only send status when user picked a specific filter.
        if (statusFilter) params.status = statusFilter;
        const data = await eventsApi.getMyEvents(accessToken, params) as { events: Event[], pagination?: { totalPages: number } };
        const list = data.events || [];

        // Fill totalCapacity when not returned explicitly.
        const withCapacity = list.map((ev) => {
          if (typeof ev.totalCapacity === 'number') return ev;
          const cap = Array.isArray(ev.ticketInfo)
            ? ev.ticketInfo.reduce((sum, t) => sum + (typeof t?.total === 'number' ? t.total : 0), 0)
            : 0;
          return cap > 0 ? { ...ev, totalCapacity: cap } : ev;
        });

        setEvents(withCapacity);
        setTotalPages(data.pagination?.totalPages || 1);

        // Compute tickets sold / revenue from booking-service (authoritative).
        setSalesLoading(true);
        try {
          const { bookingApi } = await import('@/lib/api');
          const summaries = await Promise.all(
            withCapacity.map(async (ev) => {
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
        } finally {
          setSalesLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [isAuthenticated, accessToken, currentPage, statusFilter, isOrganizer]);

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleDelete = async (eventId: string, status?: string) => {
    const isDraft = status === 'DRAFT';
    const confirmText = isDraft
      ? 'Та энэ DRAFT арга хэмжээг бүр мөсөн устгахдаа итгэлтэй байна уу?'
      : 'Та энэ арга хэмжээг цуцлахдаа итгэлтэй байна уу?';

    if (!confirm(confirmText)) return;

    try {
      if (isDraft) {
        await eventsApi.delete(eventId, accessToken!);
        setEvents(events.filter((e) => e._id !== eventId));
      } else {
        await eventsApi.cancel(eventId, accessToken!);
        setEvents((prev) => prev.map((e) => (e._id === eventId ? { ...e, status: 'CANCELLED' } : e)));
      }
    } catch (err) {
      console.error('Failed to delete/cancel event:', err);
      alert(isDraft ? 'Арга хэмжээ устгахад алдаа гарлаа' : 'Арга хэмжээ цуцлахад алдаа гарлаа');
    }
  };

  const fetchParticipants = async (eventId: string) => {
    if (!accessToken) return;

    setLoadingParticipants(true);
    try {
      const { bookingApi } = await import('@/lib/api');
      const response = await bookingApi.getEventParticipants(eventId, accessToken) as { participants: any[]; bookings?: any[] };
      const rawData = response.participants || response.bookings || [];

      const participantList: Participant[] = rawData.map((item: any) => ({
        id: item.id || item._id,
        name: item.userName || (item.user?.firstName ? `${item.user.firstName} ${item.user.lastName || ''}`.trim() : (item.userEmail || 'Unknown')),
        email: item.userEmail || item.user?.email || '',
        ticketCount: item.seatCount || item.seats?.length || 1,
        totalPaid: item.totalAmount || item.totalPrice || 0,
        bookedAt: item.createdAt,
        status: item.status,
      }));

      setParticipants(participantList);
    } catch (err) {
      console.error('Failed to fetch participants:', err);
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const openParticipantsModal = (event: Event) => {
    setSelectedEvent(event);
    setShowParticipants(true);
    fetchParticipants(event._id);
  };

  if (!isAuthenticated || !isOrganizer) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Энэ хуудсыг харах эрх байхгүй байна.</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Миний үүсгэсэн арга хэмжээ</h2>
          <p className="text-gray-500 mt-1">Таны бүх арга хэмжээний жагсаалт</p>
        </div>
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
              <option value="DRAFT">Ноорог</option>
              <option value="PENDING">Хүлээгдэж буй</option>
              <option value="PUBLISHED">Нийтлэгдсэн</option>
              <option value="CANCELLED">Цуцлагдсан</option>
              <option value="COMPLETED">Дууссан</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Уншиж байна...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">Арга хэмжээ олдсонгүй</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery ? 'Хайлтад тохирох арга хэмжээ олдсонгүй.' : 'Та анхны арга хэмжээгээ үүсгээрэй.'}
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
            <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Арга хэмжээ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Огноо</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Байршил</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Төлөв</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тасалбар</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Орлого</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEvents.map((event) => (
                    <tr key={event._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            {event.image ? (
                              <Image
                                src={resolveEventImage(event.image, event._id, 'sm')}
                                alt={event.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link 
                              href={`/events/${event._id}`}
                              className="font-medium text-gray-900 text-sm hover:text-primary-600 truncate block max-w-[200px]"
                            >
                              {event.title}
                            </Link>
                            <p className="text-xs text-gray-500">
                              {categoryLabels[event.category] || event.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{formatDate(event.date)}</div>
                        <div className="text-xs text-gray-500">{formatTime(event.date)}</div>
                      </td>
                      <td className="px-4 py-4">
                        {event.isOnline ? (
                          <div className="flex items-center gap-1 text-sm text-blue-600">
                            <Video className="w-4 h-4" />
                            <span>Онлайн</span>
                            {event.meetingPlatform && (
                              <span className="text-xs text-gray-500">({event.meetingPlatform})</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900">{event.venueName || '-'}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(event.status)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {event.ticketsSold || 0}
                          {event.totalCapacity && (
                            <span className="text-gray-500">/{event.totalCapacity}</span>
                          )}
                        </div>
                        {salesLoading && (
                          <div className="text-xs text-gray-400">тооцоолж байна...</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatPrice(event.revenue || 0)}
                        </div>
                        {salesLoading && (
                          <div className="text-xs text-gray-400">тооцоолж байна...</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openParticipantsModal(event)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Оролцогчид"
                          >
                            <Users className="w-4 h-4" />
                          </button>
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
                            onClick={() => handleDelete(event._id, event.status)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Устгах"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {/* Participants Modal */}
      {showParticipants && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Оролцогчдын жагсаалт</h3>
                <p className="text-sm text-gray-500">{selectedEvent.title}</p>
              </div>
              <button
                onClick={() => setShowParticipants(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingParticipants ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Ачаалж байна...</p>
                </div>
              ) : participants.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Одоогоор оролцогч байхгүй байна</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-500 pb-2 border-b">
                    <span>Нийт: {participants.length} оролцогч</span>
                    <span>Нийт орлого: {formatPrice(participants.reduce((sum, p) => sum + p.totalPaid, 0))}</span>
                  </div>
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{participant.name}</p>
                          <p className="text-sm text-gray-500">{participant.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatPrice(participant.totalPaid)}</p>
                        <p className="text-xs text-gray-500">{participant.ticketCount} тасалбар</p>
                        <span className={cn(
                          'inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full',
                          normalizeBookingStatus(participant.status) === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : normalizeBookingStatus(participant.status) === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                        )}>
                          {normalizeBookingStatus(participant.status) === 'confirmed'
                            ? 'Баталгаажсан'
                            : normalizeBookingStatus(participant.status) === 'pending'
                              ? 'Хүлээгдэж буй'
                              : participant.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
