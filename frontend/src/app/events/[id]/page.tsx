'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { SeatMap } from '@/components/events/SeatMap';
import { DynamicSeatMap } from '@/components/events/DynamicSeatMap';
import { useBookingStore, useAuthStore } from '@/store';
import { eventsApi, venuesApi, bookingApi } from '@/lib/api';
import { formatDate, formatTime, formatPrice, cn, resolveEventImage } from '@/lib/utils';

interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  startDate?: string;
  date?: string;
  endDate?: string;
  venueId?: string;
  thumbnail?: string;
  image?: string;
  images?: string[];
  organizer: string | { id?: string; name?: string };
  organizerName?: string;
  status: string;
  venueName?: string;
  ticketInfo?: Array<{
    sectionId?: string;
    sectionName?: string;
    rows?: number;
    seatsPerRow?: number;
    price?: number;
    total?: number;
    available?: number;
    color?: string;
  }>;
  // Online event fields
  isOnline?: boolean;
  meetingUrl?: string;
  meetingPlatform?: string;
}

interface Venue {
  _id: string;
  name: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  sections: Array<{
    id: string;
    name: string;
    rows: number;
    seatsPerRow: number;
    price: number;
    color: string;
    capacity?: number;
  }>;
}

interface SeatStatus {
  locked: Array<{ sectionId: string; row: number; seatNumber: number; lockedBy: string }>;
  booked: Array<{ sectionId: string; row: number; seatNumber: number }>;
  lockedBySeatId?: Record<string, string>;
  bookedSeatIds?: string[];
}

type EventLayoutResponse = {
  eventId: string;
  layoutType: 'GRID' | 'CIRCULAR' | 'STADIUM' | 'FREE_FORM' | 'TABLE';
  layoutJson: any;
  source: 'event' | 'venue';
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params.id === 'string' ? params.id : '';

  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [seatStatus, setSeatStatus] = useState<SeatStatus>({ locked: [], booked: [] });
  const [eventLayout, setEventLayout] = useState<EventLayoutResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocking, setIsLocking] = useState(false);

  const { user, accessToken, isAuthenticated } = useAuthStore();
  const {
    selectedSeats,
    eventId: selectedEventId,
    addSeat,
    removeSeat,
    clearSeats,
    setEventId,
    getTotalPrice,
  } = useBookingStore();

  // Fetch event data
  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setError('Арга хэмжээний ID буруу байна');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const eventData = await eventsApi.getById(eventId) as { event?: Event };
        if (!eventData?.event) {
          throw new Error('Арга хэмжээ олдсонгүй');
        }

        setEvent(eventData.event);

        if (eventData.event.venueId) {
          try {
            const venueData = await venuesApi.getById(eventData.event.venueId) as { venue: Venue };
            setVenue(venueData.venue);
          } catch {
            // Keep event page usable even when venue document is missing.
            setVenue(null);
          }
        }

        // Get seat status
        const statusData = await bookingApi.getSeatsStatus(eventId) as SeatStatus;
        setSeatStatus(statusData);

        // Get event layout (new)
        try {
          const layout = await (eventsApi as any).getLayout?.(eventId);
          if (layout?.layoutType) setEventLayout(layout);
        } catch {
          setEventLayout(null);
        }

        // Reset stale selection only when user opened a different event page.
        if (selectedEventId && selectedEventId !== eventId) {
          clearSeats();
        }

        // Set event ID in booking store
        setEventId(eventId);
      } catch (err: any) {
        setError(err.message || 'Арга хэмжээ олдсонгүй');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

  }, [eventId, selectedEventId, setEventId, clearSeats]);

  // Refresh seat status every 10 seconds
  useEffect(() => {
    if (!eventId) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const statusData = await bookingApi.getSeatsStatus(eventId) as SeatStatus;
        setSeatStatus(statusData);
      } catch (err) {
        console.error('Failed to refresh seat status:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [eventId]);

  // Handle seat click
  const handleSeatClick = useCallback((seat: {
    seatId?: string;
    sectionId: string;
    sectionName: string;
    row?: number;
    seatNumber?: number;
    price: number;
  }) => {
    const isSelected = selectedSeats.some(
      s => (seat.seatId ? s.seatId === seat.seatId : (s.sectionId === seat.sectionId && (s.row || 0) === (seat.row || 0) && (s.seatNumber || 0) === (seat.seatNumber || 0)))
    );

    if (isSelected) {
      removeSeat({ seatId: seat.seatId, sectionId: seat.sectionId, row: seat.row, seatNumber: seat.seatNumber });
    } else {
      // Max 10 seats per booking
      if (selectedSeats.length >= 10) {
        alert('Хамгийн ихдээ 10 суудал сонгох боломжтой');
        return;
      }
      addSeat(seat);
    }
  }, [selectedSeats, addSeat, removeSeat]);

  // Proceed to booking
  const handleProceedToBooking = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/auth?redirect=/events/${eventId}`);
      return;
    }

    if (selectedSeats.length === 0) {
      alert('Суудал сонгоно уу');
      return;
    }

    try {
      setIsLocking(true);
      
      // Lock selected seats
      const seatIds = selectedSeats.map((s) => s.seatId).filter(Boolean) as string[];
      if (seatIds.length === selectedSeats.length && seatIds.length > 0) {
        await bookingApi.lockSeats({ eventId, seatIds }, accessToken!);
      } else {
        await bookingApi.lockSeats({
          eventId,
          seats: selectedSeats.map((s) => ({
            sectionId: s.sectionId,
            row: (s.row || 0) as number,
            seatNumber: (s.seatNumber || 0) as number,
          })),
        }, accessToken!);
      }

      // Navigate to booking confirmation
      router.push(`/booking/confirm`);
    } catch (err: any) {
      alert(err.message || 'Суудал түгжихэд алдаа гарлаа');
      // Refresh seat status
      const statusData = await bookingApi.getSeatsStatus(eventId) as SeatStatus;
      setSeatStatus(statusData);
    } finally {
      setIsLocking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Уншиж байна...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Алдаа гарлаа</h2>
          <p className="text-gray-500 mb-4">{error || 'Арга хэмжээ олдсонгүй'}</p>
          <Link href="/" className="text-primary-500 hover:text-primary-600 font-medium">
            Нүүр хуудас руу буцах
          </Link>
        </div>
      </div>
    );
  }

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

  const meetingPlatformLabels: Record<string, string> = {
    google_meet: 'Google Meet',
    zoom: 'Zoom',
    teams: 'Microsoft Teams',
    other: 'Бусад',
  };

  const statusLabels: Record<string, string> = {
    DRAFT: 'Ноорог',
    PENDING: 'Хүлээгдэж буй',
    PUBLISHED: 'Нийтлэгдсэн',
    CANCELLED: 'Цуцлагдсан',
    COMPLETED: 'Дууссан',
  };

  const canBook = (() => {
    if (event.status !== 'PUBLISHED') return false;
    const start = new Date(event.startDate || event.date || '').getTime();
    if (!Number.isFinite(start)) return false;
    return start >= Date.now();
  })();

  const statusBadgeClass = (() => {
    switch (event.status) {
      case 'PUBLISHED':
        return 'bg-green-500 text-white';
      case 'PENDING':
        return 'bg-yellow-500 text-white';
      case 'DRAFT':
        return 'bg-slate-500 text-white';
      case 'CANCELLED':
        return 'bg-red-500 text-white';
      case 'COMPLETED':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  })();

  // Get event date and image with fallbacks
  const eventDate = event.startDate || event.date || '';
  const eventImage = resolveEventImage(event.thumbnail || event.image || event.images?.[0], event._id, 'lg');
  const organizerDisplayName =
    event.organizerName ||
    (typeof event.organizer === 'string' ? event.organizer : event.organizer?.name) ||
    'Мэдээлэл байхгүй';

  const totalPrice = getTotalPrice();

  const effectiveSections = (() => {
    if (venue?.sections && Array.isArray(venue.sections) && venue.sections.length > 0) {
      return venue.sections;
    }

    const palette = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#8b5cf6'];
    const ticketInfo = Array.isArray(event.ticketInfo) ? event.ticketInfo : [];
    if (ticketInfo.length === 0) {
      return [];
    }

    return ticketInfo
      .map((t, idx) => {
        const total = typeof t.total === 'number' && Number.isFinite(t.total) ? Math.max(0, Math.floor(t.total)) : 0;
        const seatsPerRow = typeof t.seatsPerRow === 'number' && Number.isFinite(t.seatsPerRow)
          ? Math.max(1, Math.floor(t.seatsPerRow))
          : 20;
        const rows = typeof t.rows === 'number' && Number.isFinite(t.rows)
          ? Math.max(1, Math.floor(t.rows))
          : Math.max(1, Math.ceil(total / seatsPerRow));

        return {
          id: String(t.sectionId || `section-${idx}`),
          name: String(t.sectionName || `Section ${idx + 1}`),
          rows,
          seatsPerRow,
          price: typeof t.price === 'number' && Number.isFinite(t.price) ? t.price : 0,
          color: String(t.color || palette[idx % palette.length]),
          capacity: total,
        };
      })
      .filter((s) => s.id && s.name && s.rows > 0 && s.seatsPerRow > 0);
  })();

  const mapEmbedUrl = (() => {
    if (!venue) return '';
    if (typeof venue.latitude === 'number' && typeof venue.longitude === 'number') {
      const lat = venue.latitude;
      const lon = venue.longitude;
      const delta = 0.01;
      return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lon}`;
    }

    const query = encodeURIComponent(`${venue.name}, ${venue.address}, ${venue.city}`);
    return `https://www.google.com/maps?q=${query}&output=embed`;
  })();

  const externalMapUrl = (() => {
    if (!venue) return '#';
    if (typeof venue.latitude === 'number' && typeof venue.longitude === 'number') {
      return `https://www.google.com/maps?q=${venue.latitude},${venue.longitude}`;
    }
    const query = encodeURIComponent(`${venue.name}, ${venue.address}, ${venue.city}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  })();

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Hero Section */}
      <div className="relative h-[300px] md:h-[400px] bg-gray-900">
        <Image
          src={eventImage}
          alt={event.title}
          fill
          className="object-cover opacity-60"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
        
        {/* Back button */}
        <div className="absolute top-4 left-4 md:top-8 md:left-8">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-colors"
          >
            Буцах
          </button>
        </div>

        {/* Event Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-primary-500 text-white text-sm font-medium rounded-full">
                {categoryLabels[event.category] || event.category}
              </span>
              {event.isOnline && (
                <span className="px-3 py-1 bg-purple-500 text-white text-sm font-medium rounded-full flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Онлайн
                </span>
              )}
              <span className={cn(
                'px-3 py-1 text-sm font-medium rounded-full',
                statusBadgeClass
              )}>
                {statusLabels[event.status] || event.status}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm md:text-base">
              {eventDate && (
                <>
                  <div>
                    {formatDate(eventDate)}
                  </div>
                  <div>
                    {formatTime(eventDate)}
                  </div>
                </>
              )}
              {venue && (
                <div>
                  {venue.name}, {venue.city}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date & Time */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Огноо</p>
                    <p className="font-semibold text-gray-900">{eventDate ? formatDate(eventDate) : 'Тодорхойгүй'}</p>
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Цаг</p>
                    <p className="font-semibold text-gray-900">{eventDate ? formatTime(eventDate) : 'Тодорхойгүй'}</p>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Ангилал</p>
                    <p className="font-semibold text-gray-900">{categoryLabels[event.category] || event.category}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Арга хэмжээний тайлбар</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {event.description || 'Тайлбар оруулаагүй байна.'}
                </p>
              </div>
            </div>

            {/* Organizer */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Зохион байгуулагч</h2>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                  {organizerDisplayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{organizerDisplayName}</p>
                  <p className="text-sm text-gray-500">Зохион байгуулагч</p>
                </div>
              </div>
            </div>

            {/* Online Event Info */}
            {event.isOnline && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 shadow-sm border border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Онлайн арга хэмжээ</h2>
                    {event.meetingPlatform && (
                      <p className="text-sm text-gray-500">
                        {meetingPlatformLabels[event.meetingPlatform] || event.meetingPlatform}
                      </p>
                    )}
                  </div>
                </div>
                
                {event.meetingUrl ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Энэ арга хэмжээ онлайнаар болох тул та доорх холбоосоор дамжуулан нэгдэж болно.
                    </p>
                    <a
                      href={event.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Уулзалтад нэгдэх
                    </a>
                    <p className="text-xs text-gray-500 text-center">
                      Холбоос нь арга хэмжээний эхлэх цагаас 15 минутын өмнө идэвхжинэ
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Уулзалтын холбоос удахгүй нэмэгдэх болно.
                  </p>
                )}
              </div>
            )}

            {/* Seat Selection - Only for physical events */}
            {!event.isOnline && effectiveSections.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Суудал сонгох</h2>
                {eventLayout?.layoutJson ? (
                  <DynamicSeatMap
                    layoutType={eventLayout.layoutType}
                    layoutJson={eventLayout.layoutJson}
                    lockedBySeatId={seatStatus.lockedBySeatId || {}}
                    bookedSeatIds={seatStatus.bookedSeatIds || []}
                    selected={selectedSeats as any}
                    onToggleSeat={handleSeatClick as any}
                  />
                ) : (
                  <SeatMap
                    sections={effectiveSections}
                    lockedSeats={seatStatus.locked}
                    bookedSeats={seatStatus.booked}
                    selectedSeats={selectedSeats as any}
                    onSeatClick={handleSeatClick as any}
                    currentUserId={user?.id}
                  />
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Online Event Quick Join */}
              {event.isOnline && event.meetingUrl && (
                <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-6 shadow-sm mb-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <h3 className="font-semibold">Онлайн арга хэмжээ</h3>
                      <p className="text-sm text-white/80">
                        {meetingPlatformLabels[event.meetingPlatform || ''] || 'Онлайн уулзалт'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={event.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white text-purple-600 font-medium rounded-xl hover:bg-white/90 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Уулзалтад нэгдэх
                  </a>
                </div>
              )}

              {/* Venue Info */}
              {venue && !event.isOnline && (
                <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Байршил</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-gray-900">{venue.name}</p>
                      <p className="text-sm text-gray-500">{venue.address}</p>
                      <p className="text-sm text-gray-500">{venue.city}</p>
                    </div>

                    {/* Map */}
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      <iframe
                        title="Арга хэмжээний газрын зураг"
                        src={mapEmbedUrl}
                        className="w-full h-52"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>

                    <a
                      href={externalMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Google Maps дээр нээх
                    </a>

                    {effectiveSections.length > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-sm font-medium text-gray-800 mb-2">Заал / бүсүүд</p>
                        <div className="flex flex-wrap gap-2">
                          {effectiveSections.map((section) => (
                            <span
                              key={section.id}
                              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700 text-xs"
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: section.color || '#6366f1' }}
                              />
                              {section.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Price Info */}
              {effectiveSections.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Үнийн мэдээлэл</h3>
                  <div className="space-y-2">
                    {effectiveSections.map((section) => (
                      <div key={section.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: section.color || '#6366f1' }}
                          />
                          <span className="text-gray-600">{section.name}</span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {formatPrice(section.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

              {/* Fixed Bottom Bar - Selected Seats Summary - Only for physical events */}
      {!event.isOnline && effectiveSections.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Selected Seats Info */}
              <div className="flex-1">
                {selectedSeats.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      Сонгосон суудлууд ({selectedSeats.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSeats.map((seat, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 text-sm rounded-lg"
                        >
                          {seat.sectionName} - {seat.seatId ? seat.seatId : `Эгнээ ${seat.row}, Суудал ${seat.seatNumber}`}
                          <button
                            onClick={() => removeSeat({ seatId: seat.seatId, sectionId: seat.sectionId, row: seat.row, seatNumber: seat.seatNumber })}
                            className="ml-1 hover:text-primary-900"
                          >
                            Устгах
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Суудал сонгоогүй байна</p>
                )}
              </div>

              {/* Total & CTA */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Нийт үнэ</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(totalPrice)}
                  </p>
                </div>
                <button
                  onClick={handleProceedToBooking}
                  disabled={!canBook || selectedSeats.length === 0 || isLocking}
                  className={cn(
                    'px-8 py-3 rounded-xl font-medium transition-all',
                    canBook && selectedSeats.length > 0 && !isLocking
                      ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/25'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isLocking ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Түгжиж байна...
                    </span>
                  ) : !canBook ? (
                    'Бүртгэл хаалттай'
                  ) : !isAuthenticated ? (
                    'Нэвтрэх'
                  ) : (
                    'Захиалах'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
