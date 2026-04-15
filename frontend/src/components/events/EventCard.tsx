'use client';

import Link from 'next/link';
import { CalendarDays, Heart, MapPin, Video } from 'lucide-react';
import { formatDateShort, formatPrice, formatTime, resolveEventImage } from '@/lib/utils';
import { useAuthStore, useFavoritesStore } from '@/store';
import { useRouter } from 'next/navigation';

export interface EventCardProps {
  event: {
    _id: string;
    title: string;
    description?: string;
    category: string;
    thumbnail?: string;
    image?: string;
    startDate?: string;
    date?: string;
    venueName?: string;
    ticketInfo?: Array<{ price: number }>;
    minPrice?: number;
    maxPrice?: number;
    isOnline?: boolean;
    status?: string;
  };
  featured?: boolean;
}

const categoryColors: Record<string, string> = {
  CONCERT: 'bg-blue-600 text-white',
  CONFERENCE: 'bg-amber-700 text-white',
  WORKSHOP: 'bg-cyan-700 text-white',
  MEETUP: 'bg-emerald-700 text-white',
  SPORTS: 'bg-green-600 text-white',
  EXHIBITION: 'bg-orange-700 text-white',
  OTHER: 'bg-slate-600 text-white',
};

const categoryNames: Record<string, string> = {
  CONCERT: 'Тоглолт',
  CONFERENCE: 'Хурал',
  WORKSHOP: 'Сургалт',
  MEETUP: 'Уулзалт',
  SPORTS: 'Спорт',
  EXHIBITION: 'Үзэсгэлэн',
  OTHER: 'Бусад',
};

export function EventCard({ event, featured = false }: EventCardProps) {
  const { user } = useAuthStore();
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const router = useRouter();
  const isEventFavorite = isFavorite(event._id, user?.id);
  const minPrice = event.minPrice ?? (event.ticketInfo?.length 
    ? Math.min(...event.ticketInfo.map(t => t.price))
    : 0);
  
  const eventDate = event.startDate || event.date || '';
  const eventImage = resolveEventImage(event.thumbnail || event.image, event._id, featured ? 'lg' : 'sm');

  const isPast = (() => {
    const ts = new Date(eventDate).getTime();
    if (!Number.isFinite(ts)) return false;
    return ts < Date.now();
  })();

  const isBookable = !isPast && (event.status ? event.status === 'PUBLISHED' : true);

  if (featured) {
    return (
      <div className="group block relative">
        <Link href={`/events/${event._id}`}>
          <div className="card-hover relative h-[400px] md:h-[500px]">
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ 
                backgroundImage: `url(${eventImage})` 
              }}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            
            {/* Content */}
            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
              {/* Badges */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[event.category] || categoryColors.OTHER}`}>
                  {categoryNames[event.category] || categoryNames.OTHER}
                </span>
                {event.isOnline && (
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    <Video className="w-3 h-3" />
                    Онлайн
                  </span>
                )}
              </div>
              
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 group-hover:text-primary-300 transition-colors">
                {event.title}
              </h3>
              
              <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                {event.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                <span>
                  {eventDate ? formatDateShort(eventDate) : ''}
                </span>
                <span>
                  {eventDate ? formatTime(eventDate) : ''}
                </span>
                {event.venueName && (
                  <span>
                    {event.venueName}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/20">
                <div>
                  <span className="text-gray-400 text-xs">Үнэ</span>
                  <p className="text-white font-bold text-lg">{formatPrice(minPrice)}-с</p>
                </div>
                <span className={isBookable ? 'btn-primary' : 'btn bg-white/10 backdrop-blur-sm text-white/80 border border-white/20 px-4 py-2 rounded-xl'}>
                  {isBookable ? 'Захиалах' : 'Дууссан'}
                </span>
              </div>
            </div>
          </div>
        </Link>
        
        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!user?.id) {
              router.push(`/auth?mode=login&redirect=${encodeURIComponent('/events')}`);
              return;
            }
            toggleFavorite(event._id, user.id);
          }}
          className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-sm transition-all z-10 ${
            isEventFavorite 
              ? 'bg-red-500 text-white' 
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
          title={isEventFavorite ? 'Хадгалсанаас хасах' : 'Хадгалах'}
        >
          <Heart className={`w-5 h-5 ${isEventFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="group block relative">
      <Link href={`/events/${event._id}`}>
        <div className={`rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all ${!isBookable ? 'opacity-80' : ''}`}>
          {/* Image */}
          <div className="relative h-44 overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{ 
                backgroundImage: `url(${eventImage})` 
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            
            {/* Badges */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide ${categoryColors[event.category] || categoryColors.OTHER}`}>
                {categoryNames[event.category] || categoryNames.OTHER}
              </span>
              {event.isOnline && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-white text-gray-700">
                  <Video className="w-3 h-3" />
                  Онлайн
                </span>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors line-clamp-2 min-h-[3rem]">
              {event.title}
            </h3>
            
            <div className="space-y-1.5 text-sm text-gray-500 mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                <span>{eventDate ? `${formatDateShort(eventDate)}, ${formatTime(eventDate)}` : ''}</span>
              </div>
              {event.venueName && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span className="line-clamp-1">{event.venueName}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div>
                <p className="text-primary-700 font-bold text-lg leading-none">{formatPrice(minPrice)}</p>
              </div>
              <span className="text-primary-600 font-semibold text-sm group-hover:underline">
                {isBookable ? 'Үзэх' : 'Дууссан'}
              </span>
            </div>
          </div>
        </div>
      </Link>
      
      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!user?.id) {
            router.push(`/auth?mode=login&redirect=${encodeURIComponent('/events')}`);
            return;
          }
          toggleFavorite(event._id, user.id);
        }}
        className={`absolute top-3 right-3 p-2 rounded-full transition-all z-10 border ${
          isEventFavorite 
            ? 'bg-red-500 text-white border-red-500' 
            : 'bg-white text-gray-500 border-white/90 hover:text-red-500'
        }`}
        title={isEventFavorite ? 'Хадгалсанаас хасах' : 'Хадгалах'}
      >
        <Heart className={`w-4 h-4 ${isEventFavorite ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
}
