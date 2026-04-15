'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { venuesApi } from '@/lib/api';
import { 
  MapPin, 
  Plus,
  Search,
  Users,
  Phone,
  Globe
} from 'lucide-react';

interface Venue {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  venueType?: string;
  hasWrestlingRing?: boolean;
  hasBoxingRing?: boolean;
  hasCourt?: boolean;
}

const venueTypeLabels: Record<string, string> = {
  ARENA: 'Арена',
  WRESTLING_HALL: 'Бөхийн өргөө',
  SPORTS_HALL: 'Спорт заал',
  STADIUM: 'Цэнгэлдэх',
  THEATER: 'Театр',
  CONFERENCE_CENTER: 'Хурлын төв',
  OUTDOOR: 'Гадна талбай',
  OTHER: 'Бусад',
};

export default function DashboardVenuesPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAuthenticated || !isOrganizer) {
      return;
    }

    const fetchVenues = async () => {
      try {
        setLoading(true);
        const data = await venuesApi.getAll() as { venues: Venue[] };
        setVenues(data.venues || []);
      } catch (err) {
        console.error('Failed to fetch venues:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [isAuthenticated, isOrganizer]);

  const filteredVenues = venues.filter(venue =>
    venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSportsFeatures = (venue: Venue) => {
    const features = [];
    if (venue.hasWrestlingRing) features.push('Бөхийн тавцан');
    if (venue.hasBoxingRing) features.push('Боксын ринг');
    if (venue.hasCourt) features.push('Талбай');
    return features;
  };

  if (!isAuthenticated || !isOrganizer) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Энэ хуудсыг харах эрх байхгүй байна.</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Байршлууд</h2>
          <p className="text-gray-500 mt-1">Арга хэмжээ зохион байгуулах боломжтой байршлууд</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Байршил хайх..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="relative h-64 bg-gray-100">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Газрын зураг</p>
              <p className="text-xs text-gray-400 mt-1">Google Maps эсвэл Mapbox интеграци</p>
            </div>
          </div>
          {/* Venue markers */}
          {filteredVenues.slice(0, 5).map((venue, index) => (
            <div
              key={venue._id}
              className="absolute w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg cursor-pointer hover:scale-110 transition-transform"
              style={{
                top: `${20 + (index * 15) % 60}%`,
                left: `${15 + (index * 18) % 70}%`,
              }}
              title={venue.name}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Venues Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Уншиж байна...</p>
        </div>
      ) : filteredVenues.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-2">Байршил олдсонгүй</h3>
          <p className="text-gray-500 text-sm">
            {searchQuery ? 'Хайлтад тохирох байршил олдсонгүй.' : 'Одоогоор байршил бүртгэгдээгүй байна.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVenues.map((venue, index) => (
            <div
              key={venue._id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Venue Header with Number */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{venue.name}</h3>
                    {venue.venueType && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-lg">
                        {venueTypeLabels[venue.venueType] || venue.venueType}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Venue Details */}
              <div className="p-4 space-y-3">
                {(venue.address || venue.city) && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">{venue.address || venue.city}</span>
                  </div>
                )}

                {venue.capacity && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{venue.capacity.toLocaleString()} хүний багтаамж</span>
                  </div>
                )}

                {venue.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{venue.phone}</span>
                  </div>
                )}

                {venue.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <a 
                      href={venue.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline truncate"
                    >
                      {venue.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}

                {/* Sports Features */}
                {getSportsFeatures(venue).length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Спорт тоног төхөөрөмж:</p>
                    <div className="flex flex-wrap gap-1">
                      {getSportsFeatures(venue).map((feature) => (
                        <span
                          key={feature}
                          className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-lg"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <Link
                  href={`/events/create?venueId=${venue._id}`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Энд арга хэмжээ үүсгэх
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
