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
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (venue: Venue) => {
    setEditing(venue);
    setName(venue.name || '');
    setAddress(venue.address || '');
    setCity(venue.city || 'Улаанбаатар');
    setCapacity(venue.capacity || 100);
    setDescription(venue.description || '');
    setShowForm(true);
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

      const payload = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        capacity: Number(capacity),
        description: description.trim() || undefined,
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
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Хот"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
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
