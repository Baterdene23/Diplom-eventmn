'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventsApi, venuesApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import ImageUpload from '@/components/ui/ImageUpload';
import { Video, MapPin, Globe, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface VenueSection {
  id: string;
  name: string;
  rows: number;
  seatsPerRow: number;
  price: number;
  color?: string;
}

interface Venue {
  _id: string;
  name: string;
  city: string;
  address: string;
  capacity?: number;
  venueType?: string;
  sections?: VenueSection[];
}

interface SectionConfig extends VenueSection {
  enabled: boolean;
  total: number;
}

const categories = [
  'CONCERT',
  'CONFERENCE',
  'WORKSHOP',
  'MEETUP',
  'SPORTS',
  'WRESTLING',
  'EXHIBITION',
  'OTHER',
] as const;

const categoryLabels: Record<string, string> = {
  CONCERT: 'Концерт & Хөгжим',
  CONFERENCE: 'Хурал & Семинар',
  WORKSHOP: 'Сургалт & Workshop',
  MEETUP: 'Уулзалт',
  SPORTS: 'Спорт',
  WRESTLING: 'Бөхийн барилдаан',
  EXHIBITION: 'Үзэсгэлэн',
  OTHER: 'Бусад',
};

const venueTypeLabels: Record<string, string> = {
  CONCERT_HALL: 'Тоглолтын танхим',
  CONFERENCE_ROOM: 'Хурлын танхим',
  ARENA: 'Арена',
  WRESTLING_HALL: 'Бөхийн өргөө',
  SPORTS_HALL: 'Спорт заал',
  STADIUM: 'Цэнгэлдэх',
  OUTDOOR: 'Гадаа талбай',
  EXHIBITION_HALL: 'Үзэсгэлэнгийн танхим',
  ONLINE: 'Онлайн',
  OTHER: 'Бусад',
};

const categoryVenueTypes: Record<(typeof categories)[number], string[]> = {
  CONCERT: ['CONCERT_HALL', 'ARENA', 'STADIUM', 'OUTDOOR'],
  CONFERENCE: ['CONFERENCE_ROOM'],
  WORKSHOP: ['CONFERENCE_ROOM', 'OTHER'],
  MEETUP: ['CONFERENCE_ROOM', 'OTHER'],
  SPORTS: ['SPORTS_HALL', 'ARENA', 'STADIUM'],
  WRESTLING: ['WRESTLING_HALL', 'SPORTS_HALL', 'ARENA'],
  EXHIBITION: ['EXHIBITION_HALL'],
  OTHER: [],
};

const rowLabel = (rowIndex: number): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (rowIndex < 26) return alphabet[rowIndex];
  return `${alphabet[Math.floor(rowIndex / 26) - 1]}${alphabet[rowIndex % 26]}`;
};

const isPremiumSection = (sectionName: string) => {
  const name = sectionName.toLowerCase();
  return name.includes('vip') || name.includes('premium');
};

const toPositiveInt = (value: number, fallback = 1) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value));
};

const buildDefaultSections = (
  category: (typeof categories)[number],
  venueType: string | undefined,
  capacity: number
): VenueSection[] => {
  const cap = toPositiveInt(capacity, 300);

  if (category === 'WRESTLING') {
    return [
      { id: 'vip', name: 'VIP', rows: 4, seatsPerRow: 12, price: 120000, color: '#f59e0b' },
      { id: 'ring-a', name: 'Ring A', rows: 10, seatsPerRow: 20, price: 70000, color: '#ef4444' },
      { id: 'ring-b', name: 'Ring B', rows: 12, seatsPerRow: 24, price: 45000, color: '#3b82f6' },
    ];
  }

  if (category === 'SPORTS') {
    return [
      { id: 'premium', name: 'Premium', rows: 6, seatsPerRow: 18, price: 95000, color: '#f59e0b' },
      { id: 'standard-a', name: 'Standard A', rows: 14, seatsPerRow: 26, price: 55000, color: '#10b981' },
      { id: 'standard-b', name: 'Standard B', rows: 14, seatsPerRow: 26, price: 35000, color: '#3b82f6' },
    ];
  }

  if (category === 'CONFERENCE' || category === 'WORKSHOP' || category === 'MEETUP') {
    return [
      { id: 'front', name: 'Front', rows: 8, seatsPerRow: 14, price: 120000, color: '#8b5cf6' },
      { id: 'main', name: 'Main', rows: 10, seatsPerRow: 18, price: 80000, color: '#3b82f6' },
      { id: 'rear', name: 'Rear', rows: 8, seatsPerRow: 18, price: 50000, color: '#64748b' },
    ];
  }

  if (category === 'EXHIBITION' || venueType === 'EXHIBITION_HALL') {
    return [
      { id: 'hall-a', name: 'Hall A', rows: 10, seatsPerRow: 20, price: 40000, color: '#14b8a6' },
      { id: 'hall-b', name: 'Hall B', rows: 10, seatsPerRow: 20, price: 30000, color: '#0ea5e9' },
    ];
  }

  if (cap >= 1000) {
    return [
      { id: 'vip', name: 'VIP', rows: 6, seatsPerRow: 20, price: 150000, color: '#f59e0b' },
      { id: 'standard', name: 'Standard', rows: 18, seatsPerRow: 28, price: 85000, color: '#3b82f6' },
      { id: 'balcony', name: 'Balcony', rows: 12, seatsPerRow: 24, price: 60000, color: '#10b981' },
    ];
  }

  return [
    { id: 'main', name: 'Main', rows: 10, seatsPerRow: 18, price: 70000, color: '#3b82f6' },
    { id: 'side', name: 'Side', rows: 8, seatsPerRow: 14, price: 45000, color: '#10b981' },
  ];
};

const meetingPlatforms = [
  { id: 'google_meet', name: 'Google Meet', icon: '🎥' },
  { id: 'zoom', name: 'Zoom', icon: '📹' },
  { id: 'teams', name: 'Microsoft Teams', icon: '💼' },
  { id: 'other', name: 'Бусад', icon: '🔗' },
] as const;

export default function CreateEventPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken, user } = useAuthStore();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('CONCERT');
  const [selectedCity, setSelectedCity] = useState('');
  const [venueId, setVenueId] = useState('');
  const [sectionConfigs, setSectionConfigs] = useState<SectionConfig[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // Online event state
  const [isOnline, setIsOnline] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingPlatform, setMeetingPlatform] = useState<string>('google_meet');
  const [previewZoom, setPreviewZoom] = useState(100);

  const normalizeTag = (value: string) => value.trim();

  const addTag = (value: string) => {
    const tag = normalizeTag(value);
    if (!tag) return;
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
  };

  const removeTag = (value: string) => {
    setTags((prev) => prev.filter((t) => t !== value));
  };

  const suggestedTags = useMemo(() => {
    const byCategory: Record<string, string[]> = {
      CONCERT: ['Live', 'DJ', 'Rock', 'Pop', 'HipHop', 'EDM'],
      SPORTS: ['Тэмцээн', 'Лиг', 'Фитнес'],
      WRESTLING: ['Бөх', 'Барилдаан'],
      CONFERENCE: ['Семинар', 'Илтгэл', 'Networking'],
      WORKSHOP: ['Сургалт', 'Практик'],
      MEETUP: ['Уулзалт', 'Community'],
      EXHIBITION: ['Үзэсгэлэн', 'Урлаг', 'Фото'],
      OTHER: ['Family', 'Outdoor', 'Community'],
    };
    return byCategory[category] || byCategory.OTHER;
  }, [category]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth?mode=login&redirect=/events/create');
      return;
    }

    const role = user?.role?.toUpperCase();
    if (role !== 'ORGANIZER' && role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }

    const fetchVenues = async () => {
      try {
        setLoadingVenues(true);
        const response = await venuesApi.getAll() as { venues: Venue[] };
        const venueList = response.venues || [];
        setVenues(venueList);

        if (venueList.length > 0) {
          const initialCity = venueList[0].city;
          setSelectedCity(initialCity);
          const initialVenue = venueList.find((v) => v.city === initialCity) || venueList[0];
          setVenueId(initialVenue._id);
        }
      } catch (err: any) {
        setError(err?.message || 'Байршлын мэдээлэл авч чадсангүй');
      } finally {
        setLoadingVenues(false);
      }
    };

    fetchVenues();
  }, [isAuthenticated, user, router]);

  const selectedVenue = useMemo(
    () => venues.find((v) => v._id === venueId),
    [venues, venueId]
  );

  const cityOptions = useMemo(
    () => Array.from(new Set(venues.map((v) => v.city))).sort((a, b) => a.localeCompare(b, 'mn')),
    [venues]
  );

  const filteredVenues = useMemo(() => {
    if (!selectedCity) return venues;
    return venues.filter((v) => v.city === selectedCity);
  }, [venues, selectedCity]);

  const preferredVenueTypes = useMemo(
    () => categoryVenueTypes[category] || [],
    [category]
  );

  const preferredVenuesInCity = useMemo(() => {
    if (preferredVenueTypes.length === 0) {
      return filteredVenues;
    }

    return filteredVenues.filter((venue) =>
      venue.venueType ? preferredVenueTypes.includes(venue.venueType) : false
    );
  }, [filteredVenues, preferredVenueTypes]);

  const venueChoices = preferredVenuesInCity.length > 0 ? preferredVenuesInCity : filteredVenues;

  const showingFallbackVenues = preferredVenueTypes.length > 0 && preferredVenuesInCity.length === 0;

  useEffect(() => {
    if (!selectedCity && cityOptions.length > 0) {
      setSelectedCity(cityOptions[0]);
      return;
    }

    if (!selectedCity) {
      return;
    }

    if (venueChoices.length === 0) {
      setVenueId('');
      return;
    }

    const venueStillValid = venueChoices.some((v) => v._id === venueId);
    if (!venueStillValid) {
      setVenueId(venueChoices[0]._id);
    }
  }, [cityOptions, selectedCity, venueChoices, venueId]);

  useEffect(() => {
    if (!selectedVenue || !Array.isArray(selectedVenue.sections)) {
      setSectionConfigs([]);
      return;
    }

    const palette = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];
    setSectionConfigs(
      selectedVenue.sections.map((section, index) => ({
        ...section,
        color: section.color || palette[index % palette.length],
        total: section.rows * section.seatsPerRow,
        enabled: true,
      }))
    );
  }, [selectedVenue]);

  const selectedSections = useMemo(
    () => sectionConfigs.filter((section) => section.enabled),
    [sectionConfigs]
  );

  const totalParticipants = useMemo(
    () => selectedSections.reduce((sum, section) => sum + section.total, 0),
    [selectedSections]
  );

  const minPrice = useMemo(() => {
    if (selectedSections.length === 0) return 0;
    return Math.min(...selectedSections.map((s) => s.price));
  }, [selectedSections]);

  const maxPrice = useMemo(() => {
    if (selectedSections.length === 0) return 0;
    return Math.max(...selectedSections.map((s) => s.price));
  }, [selectedSections]);

  const premiumSections = useMemo(
    () => selectedSections.filter((section) => isPremiumSection(section.name)),
    [selectedSections]
  );

  const regularSections = useMemo(
    () => selectedSections.filter((section) => !isPremiumSection(section.name)),
    [selectedSections]
  );

  const handleSectionToggle = (sectionId: string) => {
    setSectionConfigs((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, enabled: !section.enabled } : section
      )
    );
  };

  const handleSectionPriceChange = (sectionId: string, newPrice: number) => {
    setSectionConfigs((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, price: Number.isFinite(newPrice) ? Math.max(0, newPrice) : 0 }
          : section
      )
    );
  };

  const handleSectionNumericChange = (
    sectionId: string,
    field: 'rows' | 'seatsPerRow',
    rawValue: number
  ) => {
    setSectionConfigs((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        const value = toPositiveInt(rawValue, field === 'rows' ? section.rows : section.seatsPerRow);
        const updated = { ...section, [field]: value } as SectionConfig;
        return { ...updated, total: updated.rows * updated.seatsPerRow };
      })
    );
  };

  const handleSectionNameChange = (sectionId: string, name: string) => {
    setSectionConfigs((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, name } : section))
    );
  };

  const handleAddSection = () => {
    const sectionId = `custom-${Date.now()}`;
    setSectionConfigs((prev) => [
      ...prev,
      {
        id: sectionId,
        name: `Section ${prev.length + 1}`,
        rows: 8,
        seatsPerRow: 16,
        price: 50000,
        color: '#3b82f6',
        enabled: true,
        total: 8 * 16,
      },
    ]);
  };

  const handleRemoveSection = (sectionId: string) => {
    setSectionConfigs((prev) => prev.filter((section) => section.id !== sectionId));
  };

  const handleGenerateDefaultSections = () => {
    if (!selectedVenue) return;
    const generated = buildDefaultSections(category, selectedVenue.venueType, selectedVenue.capacity || 0);
    setSectionConfigs(
      generated.map((section) => ({
        ...section,
        enabled: true,
        total: section.rows * section.seatsPerRow,
      }))
    );
  };

  const handleZoomOut = () => setPreviewZoom((z) => Math.max(70, z - 10));
  const handleZoomIn = () => setPreviewZoom((z) => Math.min(150, z + 10));
  const handleZoomReset = () => setPreviewZoom(100);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!accessToken) {
      setError('Нэвтрэх шаардлагатай');
      return;
    }

    // For physical events, venue is required
    if (!isOnline && !selectedVenue) {
      setError('Байршил сонгоно уу');
      return;
    }

    if (!isOnline && selectedSections.length === 0) {
      setError('Дор хаяж нэг заал/сектор сонгоно уу');
      return;
    }

    // For online events, meeting URL is required
    if (isOnline && !meetingUrl) {
      setError('Онлайн уулзалтын холбоос оруулна уу');
      return;
    }

    // Validate Google Meet URL format
    if (isOnline && meetingPlatform === 'google_meet' && meetingUrl) {
      const googleMeetRegex = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/i;
      if (!googleMeetRegex.test(meetingUrl) && !meetingUrl.includes('meet.google.com')) {
        setError('Google Meet холбоосны формат буруу байна. Жишээ: https://meet.google.com/abc-defg-hij');
        return;
      }
    }

    if (!startDate || !endDate) {
      setError('Огноо оруулна уу');
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError('Дуусах огноо эхлэх огнооноос хойш байх ёстой');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const ticketInfo = isOnline 
        ? [] 
        : selectedSections.map((section) => {
            return {
              sectionId: section.id,
              sectionName: section.name,
              price: section.price,
              total: section.total,
              available: section.total,
            };
          });

      const payload = {
        title,
        description,
        category,
        venueId: isOnline ? undefined : selectedVenue?._id,
        venueName: isOnline ? 'Онлайн' : selectedVenue?.name,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        thumbnail: images.length > 0 ? images[0] : undefined,
        images: images,
        tags,
        ticketInfo,
        isOnline,
        meetingUrl: isOnline ? meetingUrl : undefined,
        meetingPlatform: isOnline ? meetingPlatform : undefined,
      };

      const response = await eventsApi.create(payload, accessToken) as { event?: { _id: string } };
      if (!response?.event?._id) {
        throw new Error('Event үүсгэх үед алдаа гарлаа');
      }

      router.replace(`/events/${response.event._id}`);
    } catch (err: any) {
      setError(err?.message || 'Event үүсгэхэд алдаа гарлаа');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href="/events" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Эвентүүд рүү буцах
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Шинэ арга хэмжээ үүсгэх</h1>
          <p className="text-gray-500 mt-1">Талбаруудыг бөглөөд шууд event detail хуудас руу шилжинэ.</p>
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
              placeholder="Event нэр"
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
              placeholder="Event тайлбар"
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
                  <option key={item} value={item}>{categoryLabels[item] || item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Таг (сонголтоор)</label>

              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <span className="text-xs text-gray-500">Таг сонгоогүй байна</span>
                ) : (
                  tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => removeTag(t)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50"
                      title="Устгах"
                    >
                      <span>{t}</span>
                      <span className="ml-2 text-gray-400">x</span>
                    </button>
                  ))
                )}
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(tagInput);
                      setTagInput('');
                    }
                  }}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
                  placeholder="Жишээ: Family, Outdoor, Community"
                />
                <button
                  type="button"
                  onClick={() => {
                    addTag(tagInput);
                    setTagInput('');
                  }}
                  className="px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
                >
                  Нэмэх
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {suggestedTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 hover:bg-gray-100"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Арга хэмжээний төрөл</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOnline(false)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium transition-all ${
                    !isOnline
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  Биет
                </button>
                <button
                  type="button"
                  onClick={() => setIsOnline(true)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium transition-all ${
                    isOnline
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Онлайн
                </button>
              </div>
            </div>
          </div>

          {/* Physical venue selection */}
          {!isOnline && (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-slate-50/60 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Эхлээд хот/байршил сонгоно</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={loadingVenues || cityOptions.length === 0}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 disabled:bg-gray-100"
                  >
                    {cityOptions.length === 0 ? (
                      <option value="">Хот олдсонгүй</option>
                    ) : (
                      cityOptions.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Дараа нь тухайн газрын заал</label>
                  <select
                    value={venueId}
                    onChange={(e) => setVenueId(e.target.value)}
                    disabled={loadingVenues || venueChoices.length === 0}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 disabled:bg-gray-100"
                  >
                    {venueChoices.length === 0 ? (
                      <option value="">Заалтай байршил олдсонгүй</option>
                    ) : (
                      venueChoices.map((venue) => (
                        <option key={venue._id} value={venue._id}>
                          {venue.name} ({venue.address}){venue.venueType ? ` • ${venueTypeLabels[venue.venueType] || venue.venueType}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {preferredVenueTypes.length > 0 && (
                <div className={`rounded-lg border px-3 py-2 text-xs ${showingFallbackVenues ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  {showingFallbackVenues
                    ? `Анхаар: ${categoryLabels[category]} ангилалд тохирох тусгай заал энэ хотод алга. Одоогоор бүх заалыг харуулж байна.`
                    : `${categoryLabels[category]} ангилалд тохирох заалнуудыг шүүж харууллаа.`}
                </div>
              )}

              {selectedVenue && (
                <>
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Сонгосон байршил:</span> {selectedVenue.name}
                      {' '}
                      <span className="text-gray-500">({selectedVenue.city}, {selectedVenue.address})</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Заалны төрөл: {selectedVenue.venueType ? (venueTypeLabels[selectedVenue.venueType] || selectedVenue.venueType) : 'Тодорхойгүй'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Заал/сектор сонгох (эвентэд орох хэсгүүд)</h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGenerateDefaultSections}
                          className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
                        >
                          Автомат сектор үүсгэх
                        </button>
                        <button
                          type="button"
                          onClick={handleAddSection}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Сектор нэмэх
                        </button>
                      </div>
                    </div>

                    {sectionConfigs.length === 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        Энэ байршилд заал/сектор тохируулаагүй байна. "Автомат сектор үүсгэх" эсвэл "Сектор нэмэх"-ээр үүсгээд эвентээ бүртгэнэ үү.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sectionConfigs.map((section) => (
                          <div key={section.id} className="rounded-xl border border-gray-200 p-3">
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={section.enabled}
                                    onChange={() => handleSectionToggle(section.id)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  <div>
                                    <p className="font-medium text-gray-900">{section.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {section.rows} эгнээ x {section.seatsPerRow} суудал = {section.total} оролцогч
                                    </p>
                                  </div>
                                </label>

                                <div className="w-full md:w-44">
                                  <label className="block text-xs text-gray-500 mb-1">Үнэ (₮)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    step={1000}
                                    disabled={!section.enabled}
                                    value={section.price}
                                    onChange={(e) => handleSectionPriceChange(section.id, Number(e.target.value))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 disabled:bg-gray-100"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Нэр</label>
                                  <input
                                    type="text"
                                    value={section.name}
                                    onChange={(e) => handleSectionNameChange(section.id, e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Эгнээ</label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={section.rows}
                                    onChange={(e) => handleSectionNumericChange(section.id, 'rows', Number(e.target.value))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Суудал/эгнээ</label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={section.seatsPerRow}
                                    onChange={(e) => handleSectionNumericChange(section.id, 'seatsPerRow', Number(e.target.value))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSection(section.id)}
                                    className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                                  >
                                    Устгах
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-xs text-gray-500">Сонгосон заал</p>
                      <p className="text-xl font-semibold text-gray-900">{selectedSections.length}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-xs text-gray-500">Оролцогчийн нийт тоо</p>
                      <p className="text-xl font-semibold text-gray-900">{totalParticipants.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-xs text-gray-500">Үнийн хүрээ</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {selectedSections.length === 0
                          ? 'Сонгоно уу'
                          : minPrice === maxPrice
                            ? `${minPrice.toLocaleString()}₮`
                            : `${minPrice.toLocaleString()}₮ - ${maxPrice.toLocaleString()}₮`}
                      </p>
                    </div>
                  </div>

                  {selectedSections.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Заал суудлын нариин урьдчилсан харагдац</h3>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleZoomOut}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                            title="Жижигрүүлэх"
                          >
                            <ZoomOut className="h-4 w-4" />
                          </button>
                          <span className="min-w-[52px] text-center text-xs font-medium text-gray-600">{previewZoom}%</span>
                          <button
                            type="button"
                            onClick={handleZoomIn}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                            title="Томруулах"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleZoomReset}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-300 px-2 text-xs text-gray-600 hover:bg-gray-50"
                            title="Анхны хэмжээ"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reset
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="h-10 rounded-t-[999px] bg-gradient-to-b from-gray-300 to-gray-200 flex items-center justify-center">
                          <span className="text-xs font-semibold tracking-[0.2em] text-gray-600">ТАЙЗ</span>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {premiumSections.length > 0 && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">VIP / Premium бүс</p>
                            <div className="space-y-4">
                              {premiumSections.map((section, index) => {
                                const width = 60 + Math.min(index, 3) * 10;
                                const maxVisibleSeats = 28;
                                const displaySeatCount = Math.min(section.seatsPerRow, maxVisibleSeats);
                                const hasHiddenSeats = section.seatsPerRow > maxVisibleSeats;
                                const leftCount = Math.ceil(displaySeatCount / 2);
                                const rightCount = Math.floor(displaySeatCount / 2);
                                const seatSize = Math.max(10, Math.round(14 * (previewZoom / 100)));
                                return (
                                  <div key={section.id} className="rounded-xl border border-amber-200 bg-white p-3">
                                    <div className="mx-auto rounded-xl px-4 py-2 text-white" style={{ width: `${width}%`, backgroundColor: section.color || '#0ea5e9' }}>
                                      <div className="flex items-center justify-between">
                                        <p className="font-semibold">{section.name}</p>
                                        <p className="text-sm opacity-95">{section.price.toLocaleString()}₮</p>
                                      </div>
                                      <p className="text-xs opacity-90 mt-1">{section.total} суудал</p>
                                    </div>

                                    <div className="mt-3 overflow-x-auto">
                                      <div className="min-w-[560px] space-y-1.5">
                                        {Array.from({ length: section.rows }, (_, rowIndex) => (
                                          <div key={`${section.id}-${rowIndex}`} className="flex items-center gap-2">
                                            <div className="w-7 text-[10px] font-semibold text-gray-500 text-right">{rowLabel(rowIndex)}</div>
                                            <div className="flex items-center gap-1">
                                              {Array.from({ length: leftCount }, (_, seatIndex) => (
                                                <div
                                                  key={`${section.id}-${rowIndex}-l-${seatIndex}`}
                                                  className="rounded-[4px] border border-slate-300"
                                                  style={{ width: `${seatSize}px`, height: `${seatSize}px`, backgroundColor: section.color || '#0ea5e9', opacity: 0.82 }}
                                                  title={`${rowLabel(rowIndex)}${seatIndex + 1}`}
                                                />
                                              ))}
                                            </div>
                                            <div className="mx-2 h-5 w-4 rounded-full bg-slate-200/80" title="Төв коридор" />
                                            <div className="flex items-center gap-1">
                                              {Array.from({ length: rightCount }, (_, seatIndex) => (
                                                <div
                                                  key={`${section.id}-${rowIndex}-r-${seatIndex}`}
                                                  className="rounded-[4px] border border-slate-300"
                                                  style={{ width: `${seatSize}px`, height: `${seatSize}px`, backgroundColor: section.color || '#0ea5e9', opacity: 0.82 }}
                                                  title={`${rowLabel(rowIndex)}${leftCount + seatIndex + 1}`}
                                                />
                                              ))}
                                            </div>
                                            {hasHiddenSeats && (
                                              <div className="text-[10px] text-gray-500">+{section.seatsPerRow - maxVisibleSeats}</div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {regularSections.length > 0 && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-700">Standard бүс</p>
                            <div className="space-y-4">
                              {regularSections.map((section, index) => {
                                const width = 65 + Math.min(index, 3) * 10;
                                const maxVisibleSeats = 24;
                                const displaySeatCount = Math.min(section.seatsPerRow, maxVisibleSeats);
                                const hasHiddenSeats = section.seatsPerRow > maxVisibleSeats;
                                const leftCount = Math.ceil(displaySeatCount / 2);
                                const rightCount = Math.floor(displaySeatCount / 2);
                                const seatSize = Math.max(10, Math.round(14 * (previewZoom / 100)));
                                return (
                                  <div key={section.id} className="rounded-xl border border-gray-200 bg-white p-3">
                                    <div className="mx-auto rounded-xl px-4 py-2 text-white" style={{ width: `${width}%`, backgroundColor: section.color || '#0ea5e9' }}>
                                      <div className="flex items-center justify-between">
                                        <p className="font-semibold">{section.name}</p>
                                        <p className="text-sm opacity-95">{section.price.toLocaleString()}₮</p>
                                      </div>
                                      <p className="text-xs opacity-90 mt-1">{section.total} суудал</p>
                                    </div>

                                    <div className="mt-3 overflow-x-auto">
                                      <div className="min-w-[560px] space-y-1.5">
                                        {Array.from({ length: section.rows }, (_, rowIndex) => (
                                          <div key={`${section.id}-${rowIndex}`} className="flex items-center gap-2">
                                            <div className="w-7 text-[10px] font-semibold text-gray-500 text-right">{rowLabel(rowIndex)}</div>
                                            <div className="flex items-center gap-1">
                                              {Array.from({ length: leftCount }, (_, seatIndex) => (
                                                <div
                                                  key={`${section.id}-${rowIndex}-l-${seatIndex}`}
                                                  className="rounded-[4px] border border-slate-300"
                                                  style={{ width: `${seatSize}px`, height: `${seatSize}px`, backgroundColor: section.color || '#0ea5e9', opacity: 0.75 }}
                                                  title={`${rowLabel(rowIndex)}${seatIndex + 1}`}
                                                />
                                              ))}
                                            </div>
                                            <div className="mx-2 h-5 w-4 rounded-full bg-slate-200/80" title="Төв коридор" />
                                            <div className="flex items-center gap-1">
                                              {Array.from({ length: rightCount }, (_, seatIndex) => (
                                                <div
                                                  key={`${section.id}-${rowIndex}-r-${seatIndex}`}
                                                  className="rounded-[4px] border border-slate-300"
                                                  style={{ width: `${seatSize}px`, height: `${seatSize}px`, backgroundColor: section.color || '#0ea5e9', opacity: 0.75 }}
                                                  title={`${rowLabel(rowIndex)}${leftCount + seatIndex + 1}`}
                                                />
                                              ))}
                                            </div>
                                            {hasHiddenSeats && (
                                              <div className="text-[10px] text-gray-500">+{section.seatsPerRow - maxVisibleSeats}</div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Online event settings */}
          {isOnline && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 text-blue-700">
                <Video className="w-5 h-5" />
                <span className="font-medium">Онлайн арга хэмжээний тохиргоо</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Платформ</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {meetingPlatforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setMeetingPlatform(platform.id)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                        meetingPlatform === platform.id
                          ? 'border-blue-500 bg-white text-blue-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span>{platform.icon}</span>
                      <span>{platform.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Уулзалтын холбоос
                  {meetingPlatform === 'google_meet' && (
                    <span className="ml-1 text-xs text-gray-500">
                      (Жишээ: https://meet.google.com/abc-defg-hij)
                    </span>
                  )}
                </label>
                <input
                  type="url"
                  required={isOnline}
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  placeholder={
                    meetingPlatform === 'google_meet'
                      ? 'https://meet.google.com/xxx-xxxx-xxx'
                      : meetingPlatform === 'zoom'
                      ? 'https://zoom.us/j/xxxxxxxxx'
                      : meetingPlatform === 'teams'
                      ? 'https://teams.microsoft.com/...'
                      : 'Уулзалтын холбоос оруулна уу'
                  }
                />
              </div>

              <div className="text-xs text-blue-600 bg-blue-100 rounded-lg p-3">
                💡 Зөвлөгөө: Оролцогчдод илгээх уулзалтын холбоосыг урьдчилан үүсгээрэй. 
                Google Meet холбоосыг Google Calendar эсвэл meet.google.com-оос үүсгэж болно.
              </div>
            </div>
          )}

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
            <label className="block text-sm font-medium text-gray-700 mb-2">Зураг (сонголттой)</label>
            <ImageUpload
              onImagesUploaded={setImages}
              existingImages={images}
              maxImages={5}
            />
            <p className="mt-2 text-xs text-gray-500">
              Эхний зураг нь thumbnail болно. Хамгийн ихдээ 5 зураг оруулах боломжтой.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || (!isOnline && (loadingVenues || venues.length === 0 || selectedSections.length === 0))}
            className="w-full rounded-xl bg-primary-500 text-white py-3 font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Үүсгэж байна...' : 'Арга хэмжээ үүсгэх'}
          </button>
        </form>
      </div>
    </div>
  );
}
