'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { EventCard } from '@/components/events/EventCard';
import { eventsApi } from '@/lib/api';
import { cn, resolveEventImage } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Grid2x2,
  Music2,
  Trophy,
  Presentation,
  Image,
  Shapes,
  GraduationCap,
  Users,
} from 'lucide-react';

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

export default function EventsPage() {
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
        const data = await eventsApi.getAll({
          page: currentPage,
          limit: pageSize,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          search: searchQuery || undefined,
          city: selectedCity !== 'ALL' ? selectedCity : undefined,
          upcoming: true,
        }) as { events: Event[]; pagination?: { total: number; totalPages: number } };
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

  // Sort events
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
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-5 lg:px-8 xl:px-10 pt-6 sm:pt-8 pb-12 overflow-x-hidden">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Бүх арга хэмжээ</h1>
          <p className="text-gray-500 mt-1">Монголын хамгийн том соёл урлаг, спорт, бизнесийн арга хэмжээний нэгдсэн сан.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-7 sm:mb-8">
          {/* Category */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {legacyCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border',
                  selectedCategory === category.id
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                )}
              >
                <category.icon className="w-4 h-4" />
                {category.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <form onSubmit={handleSearch} className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Арга хэмжээ хайх..."
                className="w-full h-10 sm:h-11 px-4 rounded-full border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="h-10 sm:h-11 pl-9 pr-8 rounded-full border border-gray-200 bg-white text-sm text-gray-700 appearance-none min-w-[140px]"
                >
                  <option value="ALL">Бүгд</option>
                  <option value="ONLINE">Онлайн</option>
                  <option value="Улаанбаатар">Улаанбаатар</option>
                  <option value="Дархан">Дархан</option>
                  <option value="Эрдэнэт">Эрдэнэт</option>
                </select>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 sm:h-11 px-4 rounded-full border border-gray-200 bg-white text-sm text-gray-700 min-w-[120px]"
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-500">
            <span className="font-semibold text-gray-900">{totalEvents}</span> эвент олдлоо
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedCity('ALL');
                setCurrentPage(1);
                router.push('/events');
              }}
              className="text-primary-500 hover:text-primary-600 text-sm font-medium"
            >
              Шүүлтүүр арилгах
            </button>
          )}
        </div>

        {/* Events Grid/List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Уншиж байна...</p>
            </div>
          </div>
         ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Арга хэмжээ олдсонгүй</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Таны хайлтад тохирох арга хэмжээ байхгүй байна. Өөр түлхүүр үгээр хайна уу.
            </p>
           <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedCity('ALL');
                router.push('/events');
              }}
             className="px-6 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-colors"
           >
             Бүх эвентүүдийг харах
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {filteredEvents.map((event) => (
              <EventCard
                key={event._id}
                event={event}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <Link
                key={event._id}
                href={`/events/${event._id}`}
                className="flex gap-4 p-4 bg-white rounded-2xl hover:shadow-lg transition-shadow"
              >
                <div className="relative w-32 h-24 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src={resolveEventImage(event.thumbnail || event.image || event.images?.[0], event._id)}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-lg">
                      {categoryLabels[event.category] || event.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{event.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1">{event.description}</p>
                </div>
                <div className="flex flex-col items-end justify-center">
                  <p className="text-sm text-gray-500">
                    {new Date(event.startDate).toLocaleDateString('mn-MN', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  {event.ticketInfo && event.ticketInfo.length > 0 && (
                    <p className="text-lg font-bold text-primary-600">
                      {Math.min(...event.ticketInfo.map(t => t.price)).toLocaleString()}₮
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-500 inline-flex items-center justify-center disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {currentPage > 2 && (
              <button onClick={() => setCurrentPage(1)} className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-600 text-sm">
                1
              </button>
            )}
            {currentPage > 3 && <span className="text-gray-400">...</span>}

            {visiblePages.map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'w-9 h-9 rounded-full text-sm border',
                  currentPage === page
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200'
                )}
              >
                {page}
              </button>
            ))}

            {currentPage < totalPages - 2 && <span className="text-gray-400">...</span>}
            {currentPage < totalPages - 1 && (
              <button onClick={() => setCurrentPage(totalPages)} className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-600 text-sm">
                {totalPages}
              </button>
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-500 inline-flex items-center justify-center disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
