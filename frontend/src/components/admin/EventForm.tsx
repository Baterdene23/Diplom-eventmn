'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageUpload from '@/components/ui/ImageUpload';
import { eventsApi, venuesApi } from '@/lib/api';
import { useAuthStore } from '@/store';

interface TicketSection {
  sectionId: string;
  sectionName: string;
  price: number;
  total: number;
  available?: number;
  rows?: number;
  seatsPerRow?: number;
  color?: string;
}

interface Venue {
  _id: string;
  name: string;
  address: string;
  sections?: Array<{ id: string; name: string; rows: number; seatsPerRow: number; price: number }>;
}

interface EventFormProps {
  eventId?: string;
}

type EventStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

function toLocalDateTimeInput(value?: string) {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export default function EventForm({ eventId }: EventFormProps) {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const isEditing = Boolean(eventId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('CONCERT');
  const [venueId, setVenueId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<EventStatus>('DRAFT');
  const [isFeatured, setIsFeatured] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [ticketSections, setTicketSections] = useState<TicketSection[]>([]);

  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const bootstrap = async () => {
      if (!accessToken) {
        setIsBootstrapping(false);
        return;
      }

      try {
        setIsBootstrapping(true);
        setError('');

        const venuesRes = await venuesApi.getAll() as { venues?: Venue[] };
        const venueList = venuesRes.venues || [];
        setVenues(venueList);

        if (isEditing && eventId) {
          const eventRes = await eventsApi.getById(eventId) as { event?: any };
          const event = eventRes.event;
          if (!event) {
            throw new Error('Эвент олдсонгүй');
          }

          setTitle(event.title || '');
          setDescription(event.description || '');
          setCategory(event.category || 'CONCERT');
          setVenueId(event.venueId || '');
          setStartDate(toLocalDateTimeInput(event.startDate || event.date));
          setEndDate(toLocalDateTimeInput(event.endDate));
          setStatus((event.status || 'DRAFT') as EventStatus);
          setIsFeatured(Boolean(event.isFeatured));
          setImages(event.images || (event.thumbnail ? [event.thumbnail] : []));
          setTags(Array.isArray(event.tags) ? event.tags : []);

          const sections = Array.isArray(event.ticketInfo)
            ? event.ticketInfo.map((s: any) => ({
                sectionId: s.sectionId,
                sectionName: s.sectionName,
                rows: typeof s.rows === 'number' ? s.rows : undefined,
                seatsPerRow: typeof s.seatsPerRow === 'number' ? s.seatsPerRow : undefined,
                price: Number(s.price) || 0,
                total: Number(s.total) || 0,
                available: Number(s.available) || Number(s.total) || 0,
                color: typeof s.color === 'string' ? s.color : undefined,
              }))
            : [];
          setTicketSections(sections);
        } else if (venueList.length > 0) {
          setVenueId(venueList[0]._id);
        }
      } catch (err: any) {
        setError(err?.message || 'Эвент форм ачаалахад алдаа гарлаа');
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, [accessToken, eventId, isEditing]);

  const selectedVenue = useMemo(() => venues.find((v) => v._id === venueId), [venues, venueId]);

  useEffect(() => {
    if (isEditing || !selectedVenue) return;
    const fromVenue = (selectedVenue.sections || []).map((section) => ({
      sectionId: section.id,
      sectionName: section.name,
      price: section.price,
      total: section.rows * section.seatsPerRow,
    }));
    setTicketSections(fromVenue);
  }, [selectedVenue, isEditing]);

  const handleAddTag = () => {
    const value = tagInput.trim();
    if (value && !tags.includes(value)) {
      setTags([...tags, value]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTicketPriceChange = (sectionId: string, price: number) => {
    setTicketSections((sections) =>
      sections.map((s) => (s.sectionId === sectionId ? { ...s, price } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setError('Нэвтрэх шаардлагатай');
      return;
    }
    if (!venueId) {
      setError('Байршил сонгоно уу');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const payload = {
        title,
        description,
        category,
        venueId,
        venueName: selectedVenue?.name || '',
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status,
        isFeatured,
        thumbnail: images.length > 0 ? images[0] : undefined,
        images,
        tags,
        ticketInfo: ticketSections.map((s) => ({
          sectionId: s.sectionId,
          sectionName: s.sectionName,
          rows: s.rows,
          seatsPerRow: s.seatsPerRow,
          price: s.price,
          total: s.total,
          available: s.available ?? s.total,
          color: s.color,
        })),
      };

      if (isEditing && eventId) {
        await eventsApi.update(eventId, payload, accessToken);
      } else {
        await eventsApi.create(payload, accessToken);
      }

      router.push('/admin/events');
    } catch (err: any) {
      setError(err?.message || 'Алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isBootstrapping) {
    return (
      <div className="max-w-4xl mx-auto py-10 text-center text-gray-500">
        Форм ачаалж байна...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          Буцах
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Эвент засах' : 'Шинэ эвент нэмэх'}
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Үндсэн мэдээлэл</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Гарчиг</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ангилал</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="CONCERT">Тоглолт</option>
                <option value="CONFERENCE">Хурал</option>
                <option value="WORKSHOP">Сургалт</option>
                <option value="MEETUP">Уулзалт</option>
                <option value="SPORTS">Спорт</option>
                <option value="WRESTLING">Бөх</option>
                <option value="EXHIBITION">Үзэсгэлэн</option>
                <option value="OTHER">Бусад</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Заал/Байршил</label>
              <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="">Сонгох...</option>
                {venues.map((venue) => (
                  <option key={venue._id} value={venue._id}>
                    {venue.name} - {venue.address}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Эхлэх огноо</label>
              <input type="datetime-local" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Дуусах огноо</label>
              <input type="datetime-local" required value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Тайлбар</label>
              <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Зураг</label>
              <ImageUpload onImagesUploaded={setImages} existingImages={images} maxImages={5} />
            </div>
          </div>
        </div>

        {ticketSections.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Тасалбарын мэдээлэл</h2>
            <div className="space-y-4">
              {ticketSections.map((section) => (
                <div key={section.sectionId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{section.sectionName}</p>
                    <p className="text-sm text-gray-500">{section.total} суудал</p>
                  </div>
                  <div className="w-48">
                    <label className="block text-xs text-gray-500 mb-1">Үнэ (₮)</label>
                    <input type="number" min="0" step="1000" value={section.price} onChange={(e) => handleTicketPriceChange(section.sectionId, parseInt(e.target.value, 10) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Шошгууд</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)}>x</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg" />
            <button type="button" onClick={handleAddTag} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">Нэмэх</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Төлөв ба тохиргоо</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Төлөв</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as EventStatus)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="DRAFT">Ноорог</option>
                <option value="PENDING">Хүлээгдэж буй</option>
                <option value="PUBLISHED">Нийтлэгдсэн</option>
                <option value="CANCELLED">Цуцлагдсан</option>
                <option value="COMPLETED">Дууссан</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="w-5 h-5" />
                <span className="text-sm font-medium text-gray-700">Онцлох эвент</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Link href="/admin/events" className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg">Цуцлах</Link>
          <button type="submit" disabled={isLoading} className="px-6 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50">
            {isLoading ? 'Хадгалж байна...' : isEditing ? 'Хадгалах' : 'Үүсгэх'}
          </button>
        </div>
      </form>
    </div>
  );
}
