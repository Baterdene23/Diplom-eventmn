'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Shield,
  Zap,
  Star,
  Ticket,
  Music2,
  Presentation,
  Trophy,
  Image,
  GraduationCap,
  Users,
} from 'lucide-react';
import { EventCard } from '@/components/events';
import { eventsApi } from '@/lib/api';

interface Event {
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
  isFeatured?: boolean;
}

const categories = [
  { label: 'Бөх', tag: 'Бөхийн барилдаан', color: 'from-amber-500 to-orange-500', icon: Trophy },
  { label: 'Концерт', tag: 'Концерт', color: 'from-emerald-500 to-teal-500', icon: Music2 },
  { label: 'Спорт', tag: 'Спорт', color: 'from-rose-500 to-red-500', icon: Trophy },
  { label: 'Үзэсгэлэн', tag: 'Үзэсгэлэн', color: 'from-pink-500 to-rose-500', icon: Image },
  { label: 'Сургалт', tag: 'Сургалт', color: 'from-cyan-500 to-sky-500', icon: GraduationCap },
  { label: 'Хурал', tag: 'Хурал & Семинар', color: 'from-blue-500 to-cyan-500', icon: Presentation },
  { label: 'Уулзалт', tag: 'Уулзалт', color: 'from-slate-600 to-slate-800', icon: Users },
];

export default function HomePage() {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await eventsApi.getAll({ upcoming: true, status: 'PUBLISHED' }) as { events: Event[]; total: number };
        
        if (response.events && Array.isArray(response.events)) {
          // Sort by startDate and filter for valid events
          const sortedEvents = response.events
            .filter(e => e && e._id)
            .sort((a, b) => {
              const dateA = new Date(a.startDate || a.date || 0).getTime();
              const dateB = new Date(b.startDate || b.date || 0).getTime();
              return dateA - dateB;
            });

          // Featured events: take first 3 or events marked as featured
          const featured = sortedEvents.filter(e => e.isFeatured).slice(0, 3);
          const featuredComputed: Event[] = featured.length < 3
            ? [...featured, ...sortedEvents.filter(e => !e.isFeatured).slice(0, 3 - featured.length)]
            : featured;

          setFeaturedEvents(featuredComputed);

          // Upcoming events: take next 4 after featured
          const featuredIds = new Set(featuredComputed.map(e => e._id));
          const upcoming = sortedEvents.filter(e => !featuredIds.has(e._id)).slice(0, 4);
          setUpcomingEvents(upcoming.length > 0 ? upcoming : sortedEvents.slice(0, 4));
        }
      } catch (err: any) {
        console.error('Failed to fetch events:', err);
        setError(err.message || 'Арга хэмжээ унших үед алдаа гарлаа');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-gray-900/50" />
        
        {/* Animated shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse-slow" />
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-sm mb-6 animate-slide-up">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Шинэ арга хэмжээнүүд нэмэгдлээ
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight animate-slide-up">
              Дуртай <span className="gradient-text">арга хэмжээ</span>-гээ 
              <br />олж захиалаарай
            </h1>
            
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-xl animate-slide-up">
              Концерт, хурал, спорт тэмцээн болон бусад арга хэмжээнд 
              хялбар, хурдан захиалга хийгээрэй.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up">
              <Link href="/events" className="btn-primary text-base px-8 py-3.5">
                Арга хэмжээ үзэх
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/auth?mode=register" className="btn bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 px-8 py-3.5">
                Бүртгүүлэх
              </Link>
            </div>
            
            {/* Stats */}
            <div className="flex gap-8 mt-12 pt-8 border-t border-white/10 animate-slide-up">
              <div>
                <p className="text-3xl font-bold text-white">500+</p>
                <p className="text-gray-400 text-sm">Арга хэмжээ</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">50K+</p>
                <p className="text-gray-400 text-sm">Хэрэглэгч</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">100K+</p>
                <p className="text-gray-400 text-sm">Тасалбар зарагдсан</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4">Ангилалаар хайх</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Таны сонирхолд тохирсон арга хэмжээг хялбархан олоорой
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-4">
            {categories.map((cat) => (
              <Link 
                key={cat.tag}
                href={`/events?tags=${encodeURIComponent(cat.tag)}`}
                className="group w-[150px] sm:w-[170px]"
              >
                <div className="card p-4 md:p-6 text-center hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <cat.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-medium text-sm text-gray-900 group-hover:text-primary-600 transition-colors">
                    {cat.label}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events - From API */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="section-title mb-2">Онцлох арга хэмжээ</h2>
              <p className="text-gray-500">Энэ 7 хоногийн шилдэг сонголтууд</p>
            </div>
            <Link href="/events" className="btn-secondary hidden md:flex">
              Бүгдийг үзэх
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Уншиж байна...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-500 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="btn-secondary"
              >
                Дахин оролдох
              </button>
            </div>
          ) : featuredEvents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-4">Одоогоор арга хэмжээ байхгүй байна</p>
              <Link href="/events" className="btn-primary">
                Бүх арга хэмжээ үзэх
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((event, i) => (
                <div key={event._id} className={i === 0 ? 'md:col-span-2 lg:col-span-2' : ''}>
                  <EventCard event={event} featured={i === 0} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Events - From API */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="section-title mb-2">Удахгүй болох</h2>
              <p className="text-gray-500">Ойрын өдрүүдэд болох арга хэмжээнүүд</p>
            </div>
            <Link href="/events" className="btn-secondary hidden md:flex">
              Бүгдийг үзэх
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">Удахгүй болох арга хэмжээ байхгүй байна</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          )}
          
          <div className="text-center mt-10 md:hidden">
            <Link href="/events" className="btn-secondary">
              Бүгдийг үзэх
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Яагаад EventMN?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Бид таны арга хэмжээний туршлагыг хамгийн дээд түвшинд хүргэнэ
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-500/20 flex items-center justify-center">
                <Zap className="w-7 h-7 text-primary-400" />
              </div>
              <h3 className="font-semibold mb-2">Хурдан захиалга</h3>
              <p className="text-gray-400 text-sm">
                Хэдхэн товшилтоор суудлаа сонгож, захиалгаа баталгаажуулаарай
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <Shield className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">Аюулгүй төлбөр</h3>
              <p className="text-gray-400 text-sm">
                Банкны картаар болон QPay-ээр аюулгүй төлбөр төлөх боломжтой
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent-500/20 flex items-center justify-center">
                <Ticket className="w-7 h-7 text-accent-400" />
              </div>
              <h3 className="font-semibold mb-2">Цахим тасалбар</h3>
              <p className="text-gray-400 text-sm">
                QR кодтой цахим тасалбараа утсандаа хадгалж, үзүүлээрэй
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-1 mb-4">
            {[1,2,3,4,5].map((i) => (
              <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
            Бүртгүүлээд арга хэмжээндээ бэлдээрэй!
          </h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            50,000+ хэрэглэгч биднийг сонгосон. 
            Та ч гэсэн шинэ туршлага аваарай.
          </p>
          <Link href="/auth?mode=register" className="btn-primary text-base px-8 py-3.5">
            Үнэгүй бүртгүүлэх
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
