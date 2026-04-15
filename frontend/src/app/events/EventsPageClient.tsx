'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Grid2x2,
  GraduationCap,
  Image,
  MapPin,
  Music2,
  Presentation,
  Shapes,
  Trophy,
  Users,
} from 'lucide-react';

import { EventCard } from '@/components/events/EventCard';
import { eventsApi } from '@/lib/api';
import { cn, resolveEventImage } from '@/lib/utils';

interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  startDate: string;
  endDate?: string;
  venueId: string;
  venueName?: string;
  thumbnail?: string;
  image?: string;
  images?: string[];
  status: string;
  city?: string;
  isOnline?: boolean;
  ticketInfo?: { price: number; available: number; total: number }[];
}

const legacyCategories = [
  { id: 'ALL', label: 'Бүгд', icon: Grid2x2 },
  { id: 'CONCERT', label: 'Концерт', icon: Music2 },
  { id: 'SPORTS', label: 'Спорт', icon: Trophy },
  { id: 'WRESTLING', label: 'Бөх', icon: Trophy },
  { id: 'CONFERENCE', label: 'Хурал', icon: Presentation },
  { id: 'WORKSHOP', label: 'Сургалт', icon: GraduationCap },
  { id: 'MEETUP', label: 'Уулзалт', icon: Users },
  { id: 'EXHIBITION', label: 'Үзэсгэлэн', icon: Image },
  { id: 'OTHER', label: 'Бусад', icon: Shapes },
];

const categoryLabels: Record<string, string> = {
  CONCERT: 'Концерт',
  SPORTS: 'Спорт',
  WRESTLING: 'Бөх',
  CONFERENCE: 'Хурал',
  EXHIBITION: 'Үзэсгэлэн',
  WORKSHOP: 'Сургалт',
  MEETUP: 'Уулзалт',
  OTHER: 'Бусад',
};

const sortOptions = [
  { id: 'date-asc', label: 'Огноо (ойрхон)' },
  { id: 'date-desc', label: 'Огноо (сүүлд)' },
  { id: 'price-asc', label: 'Үнэ бага' },
  { id: 'price-desc', label: 'Үнэ өндөр' },
  { id: 'name-asc', label: 'Нэр (А-Я)' },
];

export default function EventsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageSize = 12;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const raw = searchParams.get('category');
    if (!raw) return 'ALL';
    if (raw.toLowerCase() === 'all') return 'ALL';
    return raw.toUpperCase();
  });
  const [sortBy, setSortBy] = useState('date-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [selectedCity, setSelectedCity] = useState(() => {
    const raw = searchParams.get('city');
    if (!raw) return 'ALL';
    return raw;
  });

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedCategory !== 'ALL' ||
    selectedCity !== 'ALL';

  useEffect(() => {
    // Keep state in sync with back/forward navigation.
    const rawSearch = searchParams.get('search') || '';
    const rawCategory = searchParams.get('category');
    const rawCity = searchParams.get('city');

    setSearchQuery(rawSearch);

    if (!rawCategory || rawCategory.toLowerCase() === 'all') setSelectedCategory('ALL');
    else setSelectedCategory(rawCategory.toUpperCase());

    if (!rawCity) setSelectedCity('ALL');
    else setSelectedCity(rawCity);
  }, [searchParams]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const data = (await eventsApi.getAll({
          page: currentPage,
          limit: pageSize,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          search: searchQuery || undefined,
          city: selectedCity !== 'ALL' ? selectedCity : undefined,
          upcoming: true,
        })) as { events: Event[]; pagination?: { total: number; totalPages: number } };
        setEvents(data.events || []);
        setTotalEvents(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [selectedCategory, searchQuery, currentPage, selectedCity]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, selectedCity]);

  const sortedEvents = useMemo(() => {
    const sorted = [...events];

    switch (sortBy) {
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        break;
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        break;
      case 'price-asc':
        sorted.sort((a, b) => {
          const aMin = a.ticketInfo?.[0]?.price || 0;
          const bMin = b.ticketInfo?.[0]?.price || 0;
          return aMin - bMin;
        });
        break;
      case 'price-desc':
        sorted.sort((a, b) => {
          const aMax = a.ticketInfo?.[a.ticketInfo.length - 1]?.price || 0;
          const bMax = b.ticketInfo?.[b.ticketInfo.length - 1]?.price || 0;
          return bMax - aMax;
        });
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'mn'));
        break;
    }

    return sorted;
  }, [events, sortBy]);

  const filteredEvents = useMemo(() => sortedEvents, [sortedEvents]);

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
    if (selectedCity !== 'ALL') params.set('city', selectedCity);
    router.push(`/events?${params.toString()}`);
  };

  const handleCategoryChange = (categoryId: string) => {
    setCurrentPage(1);
    setSelectedCategory(categoryId);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (categoryId !== 'ALL') params.set('category', categoryId);
    if (selectedCity !== 'ALL') params.set('city', selectedCity);
    router.push(`/events?${params.toString()}`);
  };

  const handleCityChange = (nextCity: string) => {
    setCurrentPage(1);
    setSelectedCity(nextCity);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
    if (nextCity !== 'ALL') params.set('city', nextCity);
    router.push(`/events?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#f2f4f8]">
      {/* Existing UI markup lives in the original page; kept unchanged below */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-gray-900">Арга хэмжээнүүд</h1>
              <p className="text-gray-600 mt-2">Танд тохирох эвентээ сонгоод шууд захиалаарай.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm font-medium border transition',
                  viewMode === 'grid'
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-transparent border-transparent text-gray-600 hover:bg-white/60'
                )}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm font-medium border transition',
                  viewMode === 'list'
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-transparent border-transparent text-gray-600 hover:bg-white/60'
                )}
              >
                List
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Эвент хайх..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div className="md:col-span-3">
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <option value="ALL">Бүх хот</option>
                  <option value="Улаанбаатар">Улаанбаатар</option>
                  <option value="Дархан">Дархан</option>
                  <option value="Эрдэнэт">Эрдэнэт</option>
                  <option value="ONLINE">Онлайн</option>
                </select>
              </div>
              <div className="md:col-span-3 flex gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition"
                >
                  Хайх
                </button>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            {legacyCategories.map((c) => {
              const Icon = c.icon;
              const isActive = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCategoryChange(c.id)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition',
                    isActive
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-transparent border-transparent text-gray-600 hover:bg-white/60'
                  )}
                >
                  <Icon size={16} />
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              {loading ? 'Ачаалж байна...' : `Нийт ${totalEvents} эвент`}
              {hasActiveFilters ? ' (шүүлттэй)' : ''}
            </div>
            <div className="hidden md:flex items-center gap-2">
              <MapPin size={16} />
              <span>{selectedCity === 'ALL' ? 'Бүх хот' : selectedCity}</span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-72 rounded-2xl bg-white/60 border border-gray-200 animate-pulse" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <p className="text-gray-900 font-medium">Эвент олдсонгүй</p>
              <p className="text-gray-600 mt-2">Шүүлтүүрээ өөрчлөөд дахин оролдоно уу.</p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                    setSelectedCity('ALL');
                    router.push('/events');
                  }}
                  className="px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition"
                >
                  Шүүлтүүр арилгах
                </button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                  : 'flex flex-col gap-4'
              )}
            >
              {filteredEvents.map((event) => (
                <Link key={event._id} href={`/events/${event._id}`} className="block">
                   <EventCard event={event as any} />
                 </Link>
               ))}
             </div>
           )}

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              {visiblePages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={cn(
                    'px-4 py-2 rounded-xl border text-sm font-medium',
                    p === currentPage
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
