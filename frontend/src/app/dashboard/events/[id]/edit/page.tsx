'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventsApi, venuesApi } from '@/lib/api';
import { useAuthStore } from '@/store';

interface VenueSection {
  id: string;
  name: string;
  rows: number;
  seatsPerRow: number;
  price: number;
}

interface Venue {
  _id: string;
  name: string;
  city: string;
  sections: VenueSection[];
}

interface EventItem {
  _id: string;
  title: string;
  description: string;
  category: 'CONCERT' | 'CONFERENCE' | 'WORKSHOP' | 'MEETUP' | 'SPORTS' | 'EXHIBITION' | 'OTHER';
  venueId: string;
  startDate?: string;
  endDate?: string;
  organizer?: { id?: string; name?: string } | string;
  thumbnail?: string;
}

const categories = [
  'CONCERT',
  'CONFERENCE',
  'WORKSHOP',
  'MEETUP',
  'SPORTS',
  'EXHIBITION',
  'OTHER',
] as const;

function toDateTimeLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default function EditMyEventPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, accessToken, user } = useAuthStore();
  const eventId = typeof params.id === 'string' ? params.id : '';

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('CONCERT');
  const [venueId, setVenueId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [thumbnail, setThumbnail] = useState('');

  const selectedVenue = useMemo(
    () => venues.find((v) => v._id === venueId),
    [venues, venueId]
  );

  useEffect(() => {
    const role = user?.role?.toUpperCase();
    if (!isAuthenticated) {
      router.replace(`/auth?mode=login&redirect=/dashboard/events/${eventId}/edit`);
      return;
    }

    if (role !== 'ORGANIZER' && role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }

    if (!accessToken || !eventId) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [venuesRes, eventRes] = await Promise.all([
          venuesApi.getAll() as Promise<{ venues: Venue[] }>,
          eventsApi.getById(eventId) as Promise<{ event: EventItem }>,
        ]);

        const event = eventRes.event;
        const organizerId = typeof event.organizer === 'string' ? undefined : event.organizer?.id;
        const isAdmin = role === 'ADMIN';

        if (!isAdmin && organizerId && organizerId !== user?.id) {
          router.replace('/dashboard/profile?tab=events');
          return;
        }

        setVenues(venuesRes.venues || []);
        setTitle(event.title || '');
        setDescription(event.description || '');
        setCategory(event.category || 'CONCERT');
        setVenueId(event.venueId || (venuesRes.venues?.[0]?._id ?? ''));
        setStartDate(toDateTimeLocal(event.startDate));
        setEndDate(toDateTimeLocal(event.endDate));
        setThumbnail(event.thumbnail || '');
      } catch (err: any) {
        setError(err?.message || 'Арга хэмжээ ачаалахад алдаа гарлаа');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken, eventId, isAuthenticated, router, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!accessToken || !eventId) {
      setError('Нэвтрэх шаардлагатай');
      return;
    }

    if (!selectedVenue) {
      setError('Байршил сонгоно уу');
      return;
    }

    if (!startDate || !endDate || new Date(endDate) <= new Date(startDate)) {
      setError('Огноо буруу байна');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await eventsApi.update(
        eventId,
        {
          title,
          description,
          category,
          venueId: selectedVenue._id,
          venueName: selectedVenue.name,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          thumbnail: thumbnail.trim() || undefined,
          images: thumbnail.trim() ? [thumbnail.trim()] : [],
        },
        accessToken
      );

      router.replace(`/events/${eventId}`);
    } catch (err: any) {
      setError(err?.message || 'Арга хэмжээ шинэчлэхэд алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const role = user?.role?.toUpperCase();
  if (role !== 'ORGANIZER' && role !== 'ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Уншиж байна...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href="/dashboard/profile?tab=events" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Миний үүсгэсэн арга хэмжээ рүү буцах
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Арга хэмжээ засах</h1>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Нэр</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тайлбар</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ангилал</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as (typeof categories)[number])}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Байршил</label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
              >
                {venues.map((venue) => (
                  <option key={venue._id} value={venue._id}>
                    {venue.name} ({venue.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Эхлэх огноо</label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Дуусах огноо</label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL</label>
            <input
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
              placeholder="https://..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary-500 text-white py-3 font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Хадгалж байна...' : 'Өөрчлөлт хадгалах'}
          </button>
        </form>
      </div>
    </div>
  );
}
