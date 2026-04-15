'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store';
import { notificationsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { isAuthenticated, accessToken } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAuthenticated || !accessToken) return;

      try {
        setLoading(true);
        setError(null);

        const res = (await notificationsApi.getAll(accessToken, { page })) as {
          notifications: Notification[];
          pagination?: { totalPages?: number };
        };

        setNotifications(res.notifications || []);
        setTotalPages(res.pagination?.totalPages || 1);
      } catch (e: any) {
        setError(e?.message || 'Мэдэгдэл ачаалахад алдаа гарлаа');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [isAuthenticated, accessToken, page]);

  const markAllAsRead = async () => {
    if (!accessToken) return;
    try {
      await notificationsApi.markAllAsRead(accessToken);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      // ignore
    }
  };

  const markAsRead = async (id: string) => {
    if (!accessToken) return;
    try {
      await notificationsApi.markAsRead([id], accessToken);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch (e) {
      // ignore
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell className="w-7 h-7 text-gray-400" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Мэдэгдлээ харахын тулд нэвтэрнэ үү</h1>
            <Link href="/auth" className="btn-primary">Нэвтрэх</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Нүүр хуудас
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Мэдэгдэл</h1>
              <p className="text-gray-500 text-sm mt-1">
                {unreadCount > 0 ? `${unreadCount} уншаагүй` : 'Бүгд уншсан'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-xl hover:bg-primary-100 transition-colors text-sm font-medium"
              >
                <Check className="w-4 h-4" />
                Бүгдийг уншсан болгох
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-600">Мэдэгдэл байхгүй байна</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => !n.read && markAsRead(n._id)}
                className={
                  'w-full text-left bg-white rounded-2xl border p-5 hover:shadow-sm transition-all ' +
                  (n.read ? 'border-gray-100' : 'border-primary-100 bg-primary-50/40')
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{n.message}</p>
                  </div>
                  {!n.read && (
                    <span className="mt-1 inline-block w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3">{formatDate(n.createdAt)}</p>
              </button>
            ))}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 disabled:opacity-50"
              >
                Өмнөх
              </button>
              <p className="text-sm text-gray-500">{page} / {totalPages}</p>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 disabled:opacity-50"
              >
                Дараах
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
