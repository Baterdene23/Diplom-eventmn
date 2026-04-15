'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ArrowLeft } from 'lucide-react';
import { useAuthStore, useFavoritesStore } from '@/store';
import { eventsApi } from '@/lib/api';
import { EventCard } from '@/components/events';

interface Event {
  _id: string;
  title: string;
  description?: string;
  category: string;
  thumbnail?: string;
  image?: string;
  images?: string[];
  startDate?: string;
  date?: string;
  venueName?: string;
  ticketInfo?: Array<{ price: number }>;
  minPrice?: number;
  maxPrice?: number;
}

export default function FavoritesPage() {
  const { user } = useAuthStore();
  const { getFavorites, removeFavorite } = useFavoritesStore();
  const favorites = getFavorites(user?.id);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setEvents([]);
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    let isActive = true;

    const fetchFavoriteEvents = async () => {
      if (!user?.id) return;
      if (favorites.length === 0) {
        if (!isActive) return;
        setEvents([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const responses = await Promise.allSettled(
          favorites.map((eventId) => eventsApi.getById(eventId) as Promise<{ event: Event }>)
        );

        if (!isActive) return;

        const fetchedEvents: Event[] = [];
        const invalidFavoriteIds: string[] = [];

        responses.forEach((result, index) => {
          const eventId = favorites[index];
          if (result.status === 'fulfilled' && result.value?.event) {
            fetchedEvents.push(result.value.event);
          } else {
            invalidFavoriteIds.push(eventId);
          }
        });

        if (invalidFavoriteIds.length > 0) {
          invalidFavoriteIds.forEach((eventId) => removeFavorite(eventId, user?.id));
        }

        setEvents(fetchedEvents);
      } catch (err) {
        console.error('Failed to fetch favorite events:', err);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchFavoriteEvents();

    return () => {
      isActive = false;
    };
  }, [favorites, removeFavorite, user?.id]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Нүүр хуудас
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
              <Heart className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Хадгалсан арга хэмжээ</h1>
              <p className="text-gray-500">{favorites.length} арга хэмжээ хадгалсан</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {!user?.id ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Нэвтэрсний дараа хадгалсан эвентүүд харагдана</h2>
            <p className="text-gray-500 mb-6">Та эвент хадгалах, жагсаалтаа синк хийхийн тулд нэвтэрнэ үү.</p>
            <Link href={`/auth?mode=login&redirect=${encodeURIComponent('/favorites')}`} className="btn-primary">
              Нэвтрэх
            </Link>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Уншиж байна...</p>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Хадгалсан арга хэмжээ байхгүй</h2>
            <p className="text-gray-500 mb-6">
              Таньд таалагдсан арга хэмжээг зүрхэн дээр дарж хадгалаарай
            </p>
            <Link href="/events" className="btn-primary">
              Арга хэмжээ үзэх
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
