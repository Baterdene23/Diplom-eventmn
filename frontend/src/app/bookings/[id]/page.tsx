'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { bookingApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { cn, formatDate, formatPrice, formatTime } from '@/lib/utils';
import { Calendar, Clock, MapPin, QrCode, Ticket, XCircle } from 'lucide-react';

type BookingSeat = {
  sectionName: string;
  row: number;
  seatNumber: number;
  price: number;
};

type Booking = {
  _id?: string;
  id?: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  venueName?: string;
  seats: BookingSeat[];
  totalPrice?: number;
  totalAmount?: number;
  status: string;
  qrCode?: string | null;
  createdAt?: string;
  paidAt?: string | null;
};

type RefundInfo = {
  bookingId: string;
  totalAmount: number;
  refund: { refundAmount: number; refundPercentage: number; message: string };
  canCancel: boolean;
};

function bookingIdOf(b: Booking): string {
  return (b._id || b.id || '') as string;
}

function statusMeta(status: string): { label: string; classes: string } {
  const map: Record<string, { label: string; classes: string }> = {
    PENDING: { label: 'Хүлээгдэж буй', classes: 'bg-yellow-100 text-yellow-700' },
    CONFIRMED: { label: 'Баталгаажсан', classes: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Цуцлагдсан', classes: 'bg-red-100 text-red-700' },
    REFUNDED: { label: 'Буцаагдсан', classes: 'bg-gray-100 text-gray-700' },
    EXPIRED: { label: 'Хугацаа дууссан', classes: 'bg-gray-100 text-gray-700' },
  };
  return map[status] || { label: status, classes: 'bg-gray-100 text-gray-700' };
}

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = useMemo(() => {
    const raw = (params as any)?.id;
    if (Array.isArray(raw)) return raw[0];
    return typeof raw === 'string' ? raw : '';
  }, [params]);

  const { accessToken, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [refundInfo, setRefundInfo] = useState<RefundInfo | null>(null);

  useEffect(() => {
    if (!id) return;
    if (!isAuthenticated || !accessToken) {
      router.replace(`/auth?redirect=${encodeURIComponent(`/bookings/${id}`)}`);
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const [bookingRes, refundRes] = await Promise.all([
          bookingApi.getById(id, accessToken) as Promise<{ booking: Booking }>,
          bookingApi.getRefundInfo(id, accessToken) as Promise<RefundInfo>,
        ]);

        setBooking(bookingRes.booking);
        setRefundInfo(refundRes);
      } catch (err: any) {
        setError(err?.message || 'Захиалгын мэдээлэл авахад алдаа гарлаа');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id, isAuthenticated, accessToken, router]);

  const handleCancel = async () => {
    if (!booking || !accessToken) return;

    const bid = bookingIdOf(booking);
    const reason = (typeof window !== 'undefined')
      ? window.prompt('Цуцлах шалтгаан (заавал биш)') || undefined
      : undefined;

    try {
      setSubmitting(true);
      setError(null);
      await bookingApi.cancel(bid, reason ? { reason } : {}, accessToken);
      const [bookingRes, refundRes] = await Promise.all([
        bookingApi.getById(bid, accessToken) as Promise<{ booking: Booking }>,
        bookingApi.getRefundInfo(bid, accessToken) as Promise<RefundInfo>,
      ]);
      setBooking(bookingRes.booking);
      setRefundInfo(refundRes);
    } catch (err: any) {
      setError(err?.message || 'Цуцлахад алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-7 h-7 text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Захиалга олдсонгүй</h1>
          <p className="text-sm text-gray-500 mt-2">Захиалгын дугаар буруу байна.</p>
          <div className="mt-6">
            <Link href="/dashboard/tickets" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Миний тасалбар руу буцах
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Уншиж байна...</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Алдаа гарлаа</h1>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Дахин ачаалах
            </button>
            <Link
              href="/dashboard/tickets"
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium"
            >
              Миний тасалбар
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const meta = statusMeta(booking.status);
  const total = booking.totalPrice ?? booking.totalAmount ?? 0;
  const canViewTicket = booking.status === 'CONFIRMED';
  const canCancel = !!refundInfo?.canCancel;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Захиалгын дэлгэрэнгүй</h1>
            <p className="text-gray-500 mt-1">Захиалгын дугаар: <span className="font-mono text-gray-800">{bookingIdOf(booking)}</span></p>
          </div>
          <Link
            href="/dashboard/tickets"
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Буцах
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href={`/events/${booking.eventId}`}
                  className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors block"
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
              </div>

              <div className="text-right">
                <span className={cn('inline-block px-2.5 py-1 text-xs font-medium rounded-lg', meta.classes)}>
                  {meta.label}
                </span>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatPrice(total)}</p>
                <p className="text-sm text-gray-500">{booking.seats?.length || 0} суудал</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Суудлын мэдээлэл</h2>
              <div className="space-y-2">
                {(booking.seats || []).map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.sectionName}</p>
                      <p className="text-xs text-gray-500">Эгнээ {s.row}, Суудал {s.seatNumber}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatPrice(s.price)}</p>
                  </div>
                ))}
              </div>
            </div>

            {refundInfo && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-sm font-medium text-blue-900">Буцаалтын мэдээлэл</p>
                <p className="text-sm text-blue-700 mt-1">{refundInfo.refund.message}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-blue-900">
                  <span>Буцаах хувь: <span className="font-semibold">{refundInfo.refund.refundPercentage}%</span></span>
                  <span>Буцаах дүн: <span className="font-semibold">{formatPrice(refundInfo.refund.refundAmount)}</span></span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {canViewTicket && (
                <Link
                  href={`/bookings/${bookingIdOf(booking)}/ticket`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 text-white rounded-2xl hover:bg-primary-600 transition-colors font-medium"
                >
                  <QrCode className="w-5 h-5" />
                  Тасалбар харах
                </Link>
              )}
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting || !canCancel}
                className={cn(
                  'inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium transition-colors',
                  canCancel
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                <XCircle className="w-5 h-5" />
                {submitting ? 'Цуцалж байна...' : 'Захиалга цуцлах'}
              </button>
              <Link
                href={`/events/${booking.eventId}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                <Ticket className="w-5 h-5" />
                Эвент рүү
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
