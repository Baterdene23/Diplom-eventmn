'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { bookingApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { formatDate, formatPrice, formatTime } from '@/lib/utils';
import { Calendar, Clock, MapPin, QrCode, ShieldCheck, Ticket, XCircle } from 'lucide-react';

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
  userName?: string;
  userEmail?: string;
};

function bookingIdOf(b: Booking): string {
  return (b._id || b.id || '') as string;
}

export default function BookingTicketPage() {
  const router = useRouter();
  const params = useParams();
  const id = useMemo(() => {
    const raw = (params as any)?.id;
    if (Array.isArray(raw)) return raw[0];
    return typeof raw === 'string' ? raw : '';
  }, [params]);

  const { accessToken, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!id) return;
    if (!isAuthenticated || !accessToken) {
      router.replace(`/auth?redirect=${encodeURIComponent(`/bookings/${id}/ticket`)}`);
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await bookingApi.getById(id, accessToken) as { booking: Booking };
        setBooking(res.booking);
      } catch (err: any) {
        setError(err?.message || 'Тасалбарын мэдээлэл авахад алдаа гарлаа');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id, isAuthenticated, accessToken, router]);

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-7 h-7 text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Тасалбар олдсонгүй</h1>
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

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Алдаа гарлаа</h1>
          <p className="text-sm text-gray-500 mt-2">{error || 'Тасалбар олдсонгүй'}</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href={`/bookings/${id}`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Дэлгэрэнгүй
            </Link>
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

  const total = booking.totalPrice ?? booking.totalAmount ?? 0;
  const isValid = booking.status === 'CONFIRMED';
  const code = booking.qrCode || bookingIdOf(booking);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Тасалбар</h1>
            <p className="text-gray-500 mt-1">Шалгуулах үед энэ кодыг харуулна уу.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/bookings/${bookingIdOf(booking)}`}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Дэлгэрэнгүй
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600"
            >
              Хэвлэх
            </button>
          </div>
        </div>

        {!isValid && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-2xl">
            <p className="text-sm text-yellow-800">
              Энэ тасалбар одоогоор идэвхгүй байна. Төлөв: <span className="font-semibold">{booking.status}</span>
            </p>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <Link
              href={`/events/${booking.eventId}`}
              className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors"
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

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm text-gray-500">Суудал</p>
                <div className="mt-2 space-y-1">
                  {(booking.seats || []).map((s, idx) => (
                    <p key={idx} className="text-sm font-medium text-gray-900">
                      {s.sectionName} • {s.row}-{s.seatNumber}
                    </p>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-3">Нийт: <span className="font-semibold text-gray-900">{formatPrice(total)}</span></p>
              </div>

              <div className="p-4 bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Шалгах код</p>
                  <QrCode className="w-5 h-5 text-primary-600" />
                </div>
                <div className="mt-3">
                  <div className="w-full aspect-square bg-white rounded-2xl border border-gray-100 flex items-center justify-center">
                    <div className="text-center p-6">
                      <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto">
                        <ShieldCheck className="w-7 h-7 text-primary-600" />
                      </div>
                      <p className="mt-4 text-xs text-gray-500">QR зураг үүсгэх library нэмээгүй.</p>
                      <p className="mt-2 font-mono text-sm text-gray-900 break-all">{code}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Захиалгын дугаар: <span className="font-mono">{bookingIdOf(booking)}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Link
                href="/dashboard/tickets"
                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <Ticket className="w-4 h-4" />
                Миний тасалбар
              </Link>
              <span className="text-xs text-gray-400">Идэвхтэй эсэх: {isValid ? 'Тийм' : 'Үгүй'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
