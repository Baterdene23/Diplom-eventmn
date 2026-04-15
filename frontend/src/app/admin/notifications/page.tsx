'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi, notificationsApi } from '@/lib/api';
import { useAuthStore } from '@/store';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  read?: boolean;
  isRead?: boolean;
  emailSent?: boolean;
  createdAt: string;
}

export default function AdminNotificationsPage() {
  const { accessToken } = useAuthStore();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const loadNotifications = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);
      const res = await notificationsApi.getAll(accessToken, { page: 1, limit: 200 }) as {
        notifications: NotificationItem[];
      };
      setNotifications(res.notifications || []);
    } catch (err: any) {
      setError(err.message || 'Мэдэгдлийн жагсаалт татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [accessToken]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return notifications.filter((n) => `${n.title} ${n.message} ${n.type}`.toLowerCase().includes(q));
  }, [notifications, search]);

  const sentCount = notifications.filter((n) => n.emailSent).length;
  const unreadCount = notifications.filter((n) => !(n.read ?? n.isRead)).length;

  const submitBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    if (!title.trim() || !message.trim()) {
      setError('Гарчиг болон мессежээ оруулна уу');
      return;
    }

    try {
      setSending(true);
      setError(null);
      setSuccess(null);

      await adminApi.broadcastNotification(
        {
          title: title.trim(),
          message: message.trim(),
        },
        accessToken
      );

      setSuccess('Broadcast мэдэгдэл амжилттай үүсгэгдлээ');
      setTitle('');
      setMessage('');
      await loadNotifications();
    } catch (err: any) {
      setError(err.message || 'Broadcast мэдэгдэл илгээхэд алдаа гарлаа');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (v: string) =>
    new Date(v).toLocaleString('mn-MN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мэдэгдэл удирдлага</h1>
          <p className="text-gray-600 mt-1">Бодит API-аас мэдэгдэл харах, broadcast үүсгэх</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-sm text-gray-500">Нийт</p><p className="text-2xl font-bold">{notifications.length}</p></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-sm text-gray-500">Уншаагүй</p><p className="text-2xl font-bold text-yellow-600">{unreadCount}</p></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-sm text-gray-500">Email илгээгдсэн</p><p className="text-2xl font-bold text-green-600">{sentCount}</p></div>
        <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-sm text-gray-500">Broadcast</p><p className="text-2xl font-bold text-blue-600">/api/admin/broadcast</p></div>
      </div>

      <form onSubmit={submitBroadcast} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Шинэ broadcast мэдэгдэл</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Гарчиг"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Мессеж"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <button
          type="submit"
          disabled={sending}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {sending ? 'Илгээж байна...' : 'Broadcast илгээх'}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Мэдэгдэл хайх..."
          className="w-full md:max-w-md px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        {loading ? (
          <div className="p-6 text-gray-500">Уншиж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-gray-500">Мэдэгдэл олдсонгүй</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Гарчиг</th>
                <th className="text-left px-4 py-3">Төрөл</th>
                <th className="text-left px-4 py-3">Төлөв</th>
                <th className="text-left px-4 py-3">Огноо</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n._id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{n.title}</div>
                    <div className="text-gray-500 line-clamp-2">{n.message}</div>
                  </td>
                  <td className="px-4 py-3">{n.type}</td>
                  <td className="px-4 py-3">
                    {(n.read ?? n.isRead) ? 'Уншсан' : 'Уншаагүй'}
                    {n.emailSent ? ' • Email sent' : ''}
                  </td>
                  <td className="px-4 py-3">{formatDate(n.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
