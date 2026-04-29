'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, venuesApi } from '@/lib/api';
import { useAuthStore } from '@/store';

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
  address: string;
  city: string;
  capacity: number;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  sections?: VenueSection[];
  isActive?: boolean;
}

export default function VenuesManagementPage() {
  const { accessToken } = useAuthStore();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Venue | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Улаанбаатар');
  const [capacity, setCapacity] = useState<number>(100);
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [sections, setSections] = useState<VenueSection[]>([]);

  const sectionPalette = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#8b5cf6'];

  const cityOptions = useMemo(() => {
    const fromVenues = (venues || []).map((v) => String(v.city || '').trim()).filter(Boolean);
    const defaults = ['Улаанбаатар', 'Дархан', 'Эрдэнэт'];
    return Array.from(new Set([...fromVenues, ...defaults])).sort((a, b) => a.localeCompare(b, 'mn'));
  }, [venues]);

  const loadVenues = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      // includeInactive=true only returns all venues for ADMIN.
      const res = await api<{ venues: Venue[] }>(
        '/api/venues?includeInactive=true',
        { token: accessToken }
      );

      setVenues((res.venues || []).map((v) => ({ ...v, _id: v._id || (v as any).id })));
    } catch (err: any) {
      setError(err.message || 'Заалын мэдээлэл татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, [accessToken]);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setAddress('');
    setCity('Улаанбаатар');
    setCapacity(100);
    setDescription('');
    setLatitude('');
    setLongitude('');
    setSections([]);
  };

  const startCreate = () => {
    resetForm();
    // Provide a sensible default so new venues can immediately be used for seat booking.
    setSections([
      {
        id: 'main',
        name: 'Main',
        rows: 10,
        seatsPerRow: 16,
        price: 50000,
        color: sectionPalette[0],
      },
    ]);
    setShowForm(true);
  };

  const startEdit = (venue: Venue) => {
    setEditing(venue);
    setName(venue.name || '');
    setAddress(venue.address || '');
    setCity(venue.city || 'Улаанбаатар');
    setCapacity(venue.capacity || 100);
    setDescription(venue.description || '');
    setLatitude(
      typeof venue.latitude === 'number' && Number.isFinite(venue.latitude) ? String(venue.latitude) : ''
    );
    setLongitude(
      typeof venue.longitude === 'number' && Number.isFinite(venue.longitude) ? String(venue.longitude) : ''
    );
    setSections(Array.isArray(venue.sections) ? venue.sections : []);
    setShowForm(true);
  };

  const addSection = () => {
    const id = `sec-${Date.now()}`;
    const color = sectionPalette[sections.length % sectionPalette.length];
    setSections((prev) => [
      ...prev,
      {
        id,
        name: `Section ${prev.length + 1}`,
        rows: 10,
        seatsPerRow: 16,
        price: 50000,
        color,
      },
    ]);
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSection = (id: string, patch: Partial<VenueSection>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const saveVenue = async () => {
    if (!accessToken) return;

    if (!name.trim() || !address.trim() || !city.trim() || capacity <= 0) {
      setError('Нэр, хаяг, хот, багтаамж талбаруудыг зөв оруулна уу');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const lat = latitude.trim() === '' ? undefined : Number(latitude);
      const lng = longitude.trim() === '' ? undefined : Number(longitude);

      if (lat !== undefined && !Number.isFinite(lat)) {
        setError('Latitude утга буруу байна');
        return;
      }
      if (lng !== undefined && !Number.isFinite(lng)) {
        setError('Longitude утга буруу байна');
        return;
      }

      const payload = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        capacity: Number(capacity),
        description: description.trim() || undefined,
        latitude: lat,
        longitude: lng,
        sections: sections
          .map((s) => ({
            id: String(s.id || '').trim(),
            name: String(s.name || '').trim(),
            rows: Number(s.rows),
            seatsPerRow: Number(s.seatsPerRow),
            price: Number(s.price),
            color: s.color,
          }))
          .filter((s) => s.id && s.name && Number.isFinite(s.rows) && Number.isFinite(s.seatsPerRow) && Number.isFinite(s.price)),
      };

      if (editing?._id) {
        await venuesApi.update(editing._id, payload, accessToken);
      } else {
        await venuesApi.create(payload, accessToken);
      }

      setShowForm(false);
      resetForm();
      await loadVenues();
    } catch (err: any) {
      setError(err.message || 'Заал хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (venue: Venue) => {
    if (!accessToken) return;
    try {
      setError(null);
      await venuesApi.update(
        venue._id,
        { isActive: !(venue.isActive ?? true) },
        accessToken
      );
      await loadVenues();
    } catch (err: any) {
      setError(err.message || 'Төлөв шинэчлэхэд алдаа гарлаа');
    }
  };

  const removeVenue = async (venue: Venue) => {
    if (!accessToken) return;
    if (!confirm(`"${venue.name}" заалыг идэвхгүй болгох уу?`)) return;

    try {
      setError(null);
      await venuesApi.delete(venue._id, accessToken);
      await loadVenues();
    } catch (err: any) {
      setError(err.message || 'Заал устгахад алдаа гарлаа');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return venues.filter((v) =>
      `${v.name} ${v.address} ${v.city}`.toLowerCase().includes(q)
    );
  }, [venues, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Заал удирдлага</h1>
          <p className="text-gray-600 mt-1">Бүртгэлтэй заалуудыг хянах, нэмэх, засах</p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Шинэ заал
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <input
          type="text"
          placeholder="Заал хайх..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Заал засах' : 'Шинэ заал нэмэх'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Заалын нэр"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Хаяг"
              className="px-4 py-2 border border-gray-300 rounded-lg md:col-span-2"
            />
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              placeholder="Багтаамж"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <input
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="Latitude (өргөрөг)"
              inputMode="decimal"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <input
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="Longitude (уртраг)"
              inputMode="decimal"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">Заал / сектор</p>
                <p className="text-xs text-gray-500">Эвент дээр суудал сонгох зураглалд ашиглагдана</p>
              </div>
              <button
                type="button"
                onClick={addSection}
                className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Сектор нэмэх
              </button>
            </div>

            {sections.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Одоогоор сектор алга. Сектор нэмээд мөр/суудлын тоо, үнэ оруулна уу.
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((s, idx) => (
                  <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Нэр</label>
                        <input
                          value={s.name}
                          onChange={(e) => updateSection(s.id, { name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder={`Section ${idx + 1}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Эгнээ</label>
                        <input
                          type="number"
                          min={1}
                          value={s.rows}
                          onChange={(e) => updateSection(s.id, { rows: Math.max(1, Number(e.target.value) || 1) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Суудал/эгнээ</label>
                        <input
                          type="number"
                          min={1}
                          value={s.seatsPerRow}
                          onChange={(e) => updateSection(s.id, { seatsPerRow: Math.max(1, Number(e.target.value) || 1) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Үнэ (₮)</label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={s.price}
                          onChange={(e) => updateSection(s.id, { price: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Өнгө</label>
                          <input
                            type="color"
                            value={s.color || '#0ea5e9'}
                            onChange={(e) => updateSection(s.id, { color: e.target.value })}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-2"
                            aria-label="Section color"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSection(s.id)}
                          className="mt-5 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                          title="Устгах"
                        >
                          Устгах
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Нийт суудал: {(Number(s.rows) || 0) * (Number(s.seatsPerRow) || 0)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Тайлбар"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={saveVenue}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Хадгалж байна...' : 'Хадгалах'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Болих
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="text-gray-500">Уншиж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500">Заал олдсонгүй</div>
        ) : (
          filtered.map((venue) => (
            <div key={venue._id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{venue.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${venue.isActive === false ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                  {venue.isActive === false ? 'Идэвхгүй' : 'Идэвхтэй'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{venue.city} • {venue.address}</p>
              <p className="text-sm text-gray-600 mt-2">Багтаамж: {venue.capacity}</p>
              {venue.sections?.length ? (
                <p className="text-sm text-gray-600">Секц: {venue.sections.length}</p>
              ) : null}

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => startEdit(venue)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Засах
                </button>
                <button
                  onClick={() => toggleActive(venue)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {venue.isActive === false ? 'Идэвхжүүлэх' : 'Идэвхгүй болгох'}
                </button>
                <button
                  onClick={() => removeVenue(venue)}
                  className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                >
                  Устгах
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
