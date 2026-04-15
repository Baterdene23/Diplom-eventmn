'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminApi, eventsApi } from '@/lib/api';
import { useAuthStore } from '@/store';

interface TicketInfo {
  sectionId: string;
  sectionName: string;
  price: number;
  available: number;
  total: number;
}

interface AdminEvent {
  _id: string;
  title: string;
  description: string;
  category: string;
  venueName: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  isFeatured: boolean;
  ticketInfo: TicketInfo[];
  organizer: {
    id: string;
    name: string;
  };
  createdAt: string;
  rejectionReason?: string;
}

export default function EventsManagement() {
  const { accessToken } = useAuthStore();

  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [eventToReject, setEventToReject] = useState<AdminEvent | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchEvents = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const statusParam = filterStatus || 'all';
      const response = (await adminApi.getEvents(accessToken, {
        status: statusParam,
        page: 1,
      })) as { events: AdminEvent[] };

      setEvents(response.events || []);
    } catch (err: any) {
      setError(err?.message || 'Эвентүүдийн мэдээлэл татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [accessToken, filterStatus]);

  const getCategoryText = (category: string) => {
    const categories: Record<string, string> = {
      CONCERT: 'Тоглолт',
      CONFERENCE: 'Хурал',
      WORKSHOP: 'Сургалт',
      MEETUP: 'Уулзалт',
      SPORTS: 'Спорт',
      EXHIBITION: 'Үзэсгэлэн',
      OTHER: 'Бусад',
    };
    return categories[category] || category;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    const statuses: Record<string, string> = {
      DRAFT: 'Ноорог',
      PENDING: 'Хүлээгдэж буй',
      PUBLISHED: 'Нийтлэгдсэн',
      CANCELLED: 'Цуцлагдсан',
      COMPLETED: 'Дууссан',
    };
    return statuses[status] || status;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Үнэгүй';
    return `${new Intl.NumberFormat('mn-MN').format(price)}₮`;
  };

  const runAction = async (eventId: string, action: () => Promise<void>) => {
    try {
      setActionLoadingId(eventId);
      await action();
    } catch (err: any) {
      setError(err?.message || 'Үйлдэл хийх үед алдаа гарлаа');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApprove = async (event: AdminEvent) => {
    if (!accessToken) return;
    await runAction(event._id, async () => {
      await adminApi.approveEvent(event._id, { isFeatured: event.isFeatured }, accessToken);
      setEvents((prev) =>
        prev.map((item) => (item._id === event._id ? { ...item, status: 'PUBLISHED' } : item))
      );
      setSelectedEvent((prev) => (prev?._id === event._id ? { ...prev, status: 'PUBLISHED' } : prev));
    });
  };

  const handleDelete = async (eventId: string, status?: string) => {
    if (!accessToken) return;

    const isDraft = status === 'DRAFT';
    const confirmText = isDraft
      ? 'Энэ DRAFT эвентийг бүр мөсөн устгах уу?'
      : 'Энэ эвентийг цуцлахдаа итгэлтэй байна уу?';
    if (!confirm(confirmText)) return;

    await runAction(eventId, async () => {
      if (isDraft) {
        await eventsApi.delete(eventId, accessToken);
        setEvents((prev) => prev.filter((item) => item._id !== eventId));
        setSelectedEvent((prev) => (prev?._id === eventId ? null : prev));
      } else {
        await eventsApi.cancel(eventId, accessToken);
        setEvents((prev) => prev.map((item) => (item._id === eventId ? { ...item, status: 'CANCELLED' } : item)));
        setSelectedEvent((prev) => (prev?._id === eventId ? { ...prev, status: 'CANCELLED' } : prev));
      }
    });
  };

  const handleToggleFeatured = async (event: AdminEvent) => {
    if (!accessToken) return;

    await runAction(event._id, async () => {
      await eventsApi.update(event._id, { isFeatured: !event.isFeatured }, accessToken);
      setEvents((prev) =>
        prev.map((item) => (item._id === event._id ? { ...item, isFeatured: !item.isFeatured } : item))
      );
      setSelectedEvent((prev) =>
        prev?._id === event._id ? { ...prev, isFeatured: !prev.isFeatured } : prev
      );
    });
  };

  const handleRejectClick = (event: AdminEvent) => {
    setEventToReject(event);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!accessToken || !eventToReject) return;

    if (rejectionReason.trim().length < 10) {
      setError('Татгалзах шалтгаан хамгийн багадаа 10 тэмдэгт байх ёстой');
      return;
    }

    await runAction(eventToReject._id, async () => {
      await adminApi.rejectEvent(eventToReject._id, { reason: rejectionReason.trim() }, accessToken);
      setEvents((prev) =>
        prev.map((item) =>
          item._id === eventToReject._id
            ? { ...item, status: 'DRAFT', rejectionReason: rejectionReason.trim() }
            : item
        )
      );
      setSelectedEvent((prev) =>
        prev?._id === eventToReject._id
          ? { ...prev, status: 'DRAFT', rejectionReason: rejectionReason.trim() }
          : prev
      );
      setShowRejectModal(false);
      setEventToReject(null);
      setRejectionReason('');
    });
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        event.title.toLowerCase().includes(q) ||
        event.venueName.toLowerCase().includes(q) ||
        event.organizer.name.toLowerCase().includes(q);
      const matchesCategory = !filterCategory || event.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [events, searchQuery, filterCategory]);

  const stats = useMemo(
    () => ({
      total: events.length,
      pending: events.filter((e) => e.status === 'PENDING').length,
      published: events.filter((e) => e.status === 'PUBLISHED').length,
      draft: events.filter((e) => e.status === 'DRAFT').length,
      cancelled: events.filter((e) => e.status === 'CANCELLED').length,
      completed: events.filter((e) => e.status === 'COMPLETED').length,
    }),
    [events]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Эвентүүд</h1>
          <p className="text-gray-600 mt-1">Эвентүүдийг батлах, татгалзах, онцлох ба цуцлах</p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Шинэ эвент
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Нийт</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Хүлээгдэж буй</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Нийтлэгдсэн</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.published}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Ноорог</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{stats.draft}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Цуцлагдсан</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.cancelled}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Дууссан</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.completed}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Эвент, заал, зохион байгуулагч хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Бүх төлөв</option>
            <option value="DRAFT">Ноорог</option>
            <option value="PENDING">Хүлээгдэж буй</option>
            <option value="PUBLISHED">Нийтлэгдсэн</option>
            <option value="CANCELLED">Цуцлагдсан</option>
            <option value="COMPLETED">Дууссан</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Бүх ангилал</option>
            <option value="CONCERT">Тоглолт</option>
            <option value="CONFERENCE">Хурал</option>
            <option value="WORKSHOP">Сургалт</option>
            <option value="MEETUP">Уулзалт</option>
            <option value="SPORTS">Спорт</option>
            <option value="EXHIBITION">Үзэсгэлэн</option>
            <option value="OTHER">Бусад</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Уншиж байна...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Эвент</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Зохион байгуулагч</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Огноо</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Тасалбар</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Төлөв</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEvents.map((event) => (
                  <tr key={event._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                          <span className="truncate">{event.title}</span>
                          {event.isFeatured && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 flex-shrink-0">
                              Онцлох
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{event.venueName}</p>
                        <p className="text-xs text-gray-400">{getCategoryText(event.category)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{event.organizer?.name || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{formatDate(event.startDate)}</p>
                      <p className="text-xs text-gray-500">Үүсгэсэн: {formatDate(event.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {event.ticketInfo?.slice(0, 2).map((ticket) => (
                          <div key={ticket.sectionId} className="flex items-center gap-2">
                            <span className="text-gray-600">{ticket.sectionName}:</span>
                            <span className="text-gray-900">{ticket.available}/{ticket.total}</span>
                            <span className="text-gray-500">({formatPrice(ticket.price)})</span>
                          </div>
                        ))}
                        {(event.ticketInfo?.length || 0) > 2 && (
                          <p className="text-xs text-gray-500">+{event.ticketInfo.length - 2} төрөл</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                        {getStatusText(event.status)}
                      </span>
                      {event.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1 max-w-[160px] truncate" title={event.rejectionReason}>
                          {event.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Дэлгэрэнгүй"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {event.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(event)}
                              disabled={actionLoadingId === event._id}
                              className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="Зөвшөөрөх"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRejectClick(event)}
                              disabled={actionLoadingId === event._id}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Татгалзах"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleToggleFeatured(event)}
                          disabled={actionLoadingId === event._id}
                          className={`p-2 rounded-lg transition-colors ${
                            event.isFeatured
                              ? 'text-yellow-500 hover:text-yellow-700 hover:bg-yellow-50'
                              : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                          }`}
                          title={event.isFeatured ? 'Онцлохоос хасах' : 'Онцлох болгох'}
                        >
                          <svg className="w-5 h-5" fill={event.isFeatured ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>

                        <Link
                          href={`/admin/events/${event._id}/edit`}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Засах"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>

                        <button
                          onClick={() => handleDelete(event._id, event.status)}
                          disabled={actionLoadingId === event._id || event.status === 'CANCELLED'}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Цуцлах"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Эвент олдсонгүй</p>
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Эвентийн дэлгэрэнгүй</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedEvent.status)}`}>
                  {getStatusText(selectedEvent.status)}
                </span>
                {selectedEvent.isFeatured && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    Онцлох эвент
                  </span>
                )}
              </div>

              {selectedEvent.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-800 mb-1">Татгалзсан шалтгаан:</h4>
                  <p className="text-sm text-red-700">{selectedEvent.rejectionReason}</p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedEvent.title}</h3>
                <p className="text-gray-600">{selectedEvent.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Ангилал</p>
                  <p className="font-medium text-gray-900">{getCategoryText(selectedEvent.category)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Үүсгэсэн огноо</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedEvent.createdAt)}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Байршил</h4>
                <p className="font-medium text-gray-900">{selectedEvent.venueName}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Огноо ба цаг</h4>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Эхлэх</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedEvent.startDate)}</p>
                  </div>
                  <div className="text-gray-400">→</div>
                  <div>
                    <p className="text-sm text-gray-500">Дуусах</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedEvent.endDate)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Тасалбарын мэдээлэл</h4>
                <div className="space-y-2">
                  {selectedEvent.ticketInfo?.map((ticket) => (
                    <div key={ticket.sectionId} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">{ticket.sectionName}</p>
                        <p className="text-sm text-gray-500">
                          {ticket.available} боломжтой / {ticket.total} нийт
                        </p>
                      </div>
                      <p className="text-lg font-bold text-primary-600">{formatPrice(ticket.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedEvent.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedEvent)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Зөвшөөрөх
                    </button>
                    <button
                      onClick={() => handleRejectClick(selectedEvent)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Татгалзах
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/events/${selectedEvent._id}/edit`}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Засах
                </Link>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Хаах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && eventToReject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Эвент татгалзах</h3>
              <p className="text-sm text-gray-500 mb-4">{eventToReject.title}</p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Татгалзах шалтгаан</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Шалтгаанаа бичнэ үү..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setEventToReject(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Цуцлах
                </button>
                <button
                  onClick={handleRejectConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Татгалзах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
