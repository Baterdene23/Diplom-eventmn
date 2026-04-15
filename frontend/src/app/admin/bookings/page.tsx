'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store';

interface BookingSeat {
  sectionName: string;
  row: number;
  seatNumber: number;
  price: number;
}

interface Booking {
  id: string;
  _id?: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  userName: string;
  userEmail: string;
  totalAmount: number;
  totalPrice?: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | string;
  seats: BookingSeat[];
  createdAt: string;
}

export default function AdminBookingsPage() {
  const { accessToken } = useAuthStore();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const loadBookings = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const res = await adminApi.getBookings(accessToken, {
        page: 1,
        limit: 200,
        status: status || undefined,
      }) as { bookings: Booking[] };

      const list = (res.bookings || []).map((b: any) => ({
        ...b,
        id: b.id || b._id,
        totalAmount: b.totalAmount ?? b.totalPrice ?? 0,
      }));

      setBookings(list);
    } catch (err: any) {
      setError(err.message || 'Захиалгын жагсаалт татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [accessToken, status]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter((b) =>
      `${b.id} ${b.eventTitle} ${b.userName} ${b.userEmail}`.toLowerCase().includes(q)
    );
  }, [bookings, search]);

  const formatPrice = (amount: number) => `${new Intl.NumberFormat('mn-MN').format(amount)}₮`;

  const formatDate = (v: string) =>
    new Date(v).toLocaleString('mn-MN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const updateStatus = async (booking: Booking, nextStatus: string) => {
    if (!accessToken) return;

    try {
      setSavingId(booking.id);
      await adminApi.updateBooking(
        booking.id,
        { status: nextStatus },
        accessToken
      );
      await loadBookings();
    } catch (err: any) {
      setError(err.message || 'Төлөв шинэчлэхэд алдаа гарлаа');
    } finally {
      setSavingId(null);
    }
  };

  const cancelBooking = async (booking: Booking) => {
    if (!accessToken) return;
    if (!confirm(`"${booking.id}" захиалгыг цуцлах уу?`)) return;

    try {
      setSavingId(booking.id);
      await adminApi.cancelBooking(booking.id, accessToken);
      await loadBookings();
    } catch (err: any) {
      setError(err.message || 'Захиалга цуцлахад алдаа гарлаа');
    } finally {
      setSavingId(null);
    }
  };

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
    pending: bookings.filter((b) => b.status === 'PENDING').length,
    cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
    revenue: bookings
      .filter((b) => b.status === 'CONFIRMED')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Захиалга удирдлага</h1>
          <p className="text-gray-600 mt-1">Бодит API-аас захиалга татаж хянах</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-sm text-gray-500">Нийт</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-sm text-gray-500">Баталгаажсан</p><p className="text-2xl font-bold text-green-600">{stats.confirmed}</p></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-sm text-gray-500">Хүлээгдэж буй</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-sm text-gray-500">Цуцлагдсан</p><p className="text-2xl font-bold text-red-600">{stats.cancelled}</p></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-sm text-gray-500">Нийт орлого</p><p className="text-2xl font-bold text-blue-600">{formatPrice(stats.revenue)}</p></div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ID, эвент, хэрэглэгчээр хайх..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Бүх төлөв</option>
          <option value="PENDING">PENDING</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="EXPIRED">EXPIRED</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        {loading ? (
          <div className="p-6 text-gray-500">Уншиж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-gray-500">Захиалга олдсонгүй</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Эвент</th>
                <th className="text-left px-4 py-3">Хэрэглэгч</th>
                <th className="text-left px-4 py-3">Огноо</th>
                <th className="text-left px-4 py-3">Суудал</th>
                <th className="text-left px-4 py-3">Дүн</th>
                <th className="text-left px-4 py-3">Төлөв</th>
                <th className="text-left px-4 py-3">Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono">{b.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{b.eventTitle}</div>
                    <div className="text-gray-500">{b.venueName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{b.userName}</div>
                    <div className="text-gray-500">{b.userEmail}</div>
                  </td>
                  <td className="px-4 py-3">{formatDate(b.createdAt)}</td>
                  <td className="px-4 py-3">{b.seats?.length || 0}</td>
                  <td className="px-4 py-3 font-medium">{formatPrice(b.totalAmount || 0)}</td>
                  <td className="px-4 py-3">{b.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {b.status === 'PENDING' && (
                        <button
                          onClick={() => updateStatus(b, 'CONFIRMED')}
                          disabled={savingId === b.id}
                          className="px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
                        >
                          Батлах
                        </button>
                      )}
                      {b.status !== 'CANCELLED' && (
                        <button
                          onClick={() => cancelBooking(b)}
                          disabled={savingId === b.id}
                          className="px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                        >
                          Цуцлах
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
