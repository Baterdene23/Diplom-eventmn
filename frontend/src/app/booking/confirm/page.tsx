'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useBookingStore, useAuthStore } from '@/store';
import { eventsApi, venuesApi, bookingApi } from '@/lib/api';
import { formatDate, formatTime, formatPrice, cn, resolveEventImage } from '@/lib/utils';

interface Event {
  _id: string;
  title: string;
  date: string;
  startDate?: string;
  image?: string;
  category: string;
  venueId: string;
}

interface Venue {
  _id: string;
  name: string;
  address: string;
  city: string;
}

export default function BookingConfirmPage() {
  const router = useRouter();
  const { selectedSeats, eventId, clearSeats, getTotalPrice } = useBookingStore();
  const { user, accessToken, isAuthenticated } = useAuthStore();

  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  const eventImage = event ? resolveEventImage(event.image, event._id, 'sm') : '';
  const eventDate = event?.date || event?.startDate || '';

  // Redirect if not authenticated or no seats selected
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    if (!eventId || selectedSeats.length === 0) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const eventData = await eventsApi.getById(eventId) as { event: Event };
        setEvent(eventData.event);

        if (eventData.event.venueId) {
          const venueData = await venuesApi.getById(eventData.event.venueId) as { venue: Venue };
          setVenue(venueData.venue);
        }
      } catch (err: any) {
        setError('Мэдээлэл ачаалахад алдаа гарлаа');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, eventId, selectedSeats, router]);

  // Countdown timer
  useEffect(() => {
    if (success) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Unlock seats and redirect
          handleCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [success]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = async () => {
    try {
      if (eventId && selectedSeats.length > 0) {
        const seatIds = selectedSeats.map((s: any) => s.seatId).filter(Boolean) as string[];
        if (seatIds.length === selectedSeats.length && seatIds.length > 0) {
          await bookingApi.unlockSeats({ eventId, seatIds }, accessToken!);
        } else {
          await bookingApi.unlockSeats(
            {
              eventId,
              seats: selectedSeats.map((s: any) => ({
                sectionId: s.sectionId,
                row: s.row,
                seatNumber: s.seatNumber,
              })),
            },
            accessToken!
          );
        }
      }
    } catch (err) {
      console.error('Failed to unlock seats:', err);
    } finally {
      clearSeats();
      router.push(`/events/${eventId}`);
    }
  };

  const handleConfirm = async () => {
    if (!eventId || selectedSeats.length === 0) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await bookingApi.create(
        {
          eventId,
          eventTitle: event?.title || '',
          eventDate: event?.date || event?.startDate || new Date().toISOString(),
          venueId: venue?._id || '',
          venueName: venue?.name || '',
              seats: selectedSeats.map((s) => ({
                seatId: (s as any).seatId,
                sectionId: s.sectionId,
                sectionName: s.sectionName,
                row: (s as any).row,
                seatNumber: (s as any).seatNumber,
                price: s.price,
              })),
          totalPrice: getTotalPrice(),
        },
        accessToken!
      ) as { booking: { id: string } };

      const createdId = response.booking.id;

      // Payment integration энэ төслийн scope-оос гадуур тул захиалгыг шууд баталгаажуулна
      await bookingApi.confirm(createdId, {}, accessToken!);

      setBookingId(createdId);
      setSuccess(true);
      clearSeats();
    } catch (err: any) {
      setError(err.message || 'Захиалга үүсгэхэд алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    CONCERT: 'Концерт',
    SPORTS: 'Спорт',
    WRESTLING: 'Бөхийн барилдаан',
    CONFERENCE: 'Хурал',
    EXHIBITION: 'Үзэсгэлэн',
    WORKSHOP: 'Сургалт',
    MEETUP: 'Уулзалт',
    OTHER: 'Бусад',
    concert: 'Концерт',
    sport: 'Спорт',
    conference: 'Хурал',
    exhibition: 'Үзэсгэлэн',
    other: 'Бусад',
  };

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

  // Success State
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Захиалга амжилттай!
          </h1>
          <p className="text-gray-500 mb-6">
            Таны захиалга амжилттай бүртгэгдлээ. Баталгаажуулах имэйл илгээгдэх болно.
          </p>

          {bookingId && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Захиалгын дугаар</p>
              <p className="text-lg font-mono font-semibold text-gray-900">{bookingId}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-colors"
            >
              Миний захиалгууд
            </Link>
            <Link
              href="/"
              className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Нүүр хуудас
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalPrice = getTotalPrice();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Timer Warning */}
        <div className={cn(
          'mb-6 p-4 rounded-xl flex items-center justify-between',
          timeLeft > 300 ? 'bg-blue-50 border border-blue-100' : 
          timeLeft > 60 ? 'bg-yellow-50 border border-yellow-100' : 
          'bg-red-50 border border-red-100'
        )}>
          <div className="flex items-center gap-3">
            <svg className={cn(
              'w-6 h-6',
              timeLeft > 300 ? 'text-blue-500' : 
              timeLeft > 60 ? 'text-yellow-500' : 
              'text-red-500'
            )} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className={cn(
                'font-medium',
                timeLeft > 300 ? 'text-blue-700' : 
                timeLeft > 60 ? 'text-yellow-700' : 
                'text-red-700'
              )}>
                Суудлууд түгжигдсэн
              </p>
              <p className={cn(
                'text-sm',
                timeLeft > 300 ? 'text-blue-600' : 
                timeLeft > 60 ? 'text-yellow-600' : 
                'text-red-600'
              )}>
                {timeLeft > 0 ? `Үлдсэн хугацаа: ${formatCountdown(timeLeft)}` : 'Хугацаа дууссан'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-500 to-purple-600 p-6 text-white">
            <h1 className="text-2xl font-bold">Захиалга баталгаажуулах</h1>
            <p className="text-primary-100 mt-1">Мэдээллээ шалгаад баталгаажуулна уу</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Event Info */}
            {event && (
              <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                  {eventImage ? (
                    <Image src={eventImage} alt={event.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-lg mb-2">
                    {categoryLabels[event.category] || event.category}
                  </span>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">{event.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {eventDate ? formatDate(eventDate) : '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {eventDate ? formatTime(eventDate) : '-'}
                    </span>
                  </div>
                  {venue && (
                    <p className="text-sm text-gray-500 mt-1">
                      {venue.name}, {venue.city}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Selected Seats */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Сонгосон суудлууд</h3>
              <div className="space-y-2">
                {selectedSeats.map((seat, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{seat.sectionName}</p>
                        <p className="text-sm text-gray-500">
                          Эгнээ {seat.row}, Суудал {seat.seatNumber}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">{formatPrice(seat.price)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* User Info */}
            {user && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Захиалагчийн мэдээлэл</h3>
                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Нэр</span>
                    <span className="font-medium text-gray-900">{user.firstName} {user.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">И-мэйл</span>
                    <span className="font-medium text-gray-900">{user.email}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Total */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Нийт дүн</p>
                <p className="text-sm text-gray-400">{selectedSeats.length} суудал</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(totalPrice)}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Цуцлах
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting || timeLeft === 0}
                className="flex-1 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Боловсруулж байна...
                  </span>
                ) : (
                  'Баталгаажуулах'
                )}
              </button>
            </div>

            {/* Payment Notice */}
            <p className="text-center text-sm text-gray-400">
              Захиалга баталгаажуулсны дараа төлбөрийн мэдээлэл имэйлээр илгээгдэнэ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
