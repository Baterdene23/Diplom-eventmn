import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Booking store - сонгосон суудлууд
interface Seat {
  seatId?: string;
  sectionId: string;
  sectionName: string;
  row?: number;
  seatNumber?: number;
  price: number;
}

interface BookingState {
  selectedSeats: Seat[];
  eventId: string | null;
  addSeat: (seat: Seat) => void;
  removeSeat: (seat: { seatId?: string; sectionId: string; row?: number; seatNumber?: number }) => void;
  clearSeats: () => void;
  setEventId: (eventId: string) => void;
  getTotalPrice: () => number;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  selectedSeats: [],
  eventId: null,
  addSeat: (seat) =>
    set((state) => ({
      selectedSeats: [...state.selectedSeats, seat],
    })),
  removeSeat: (seat) =>
    set((state) => {
      const seatId = seat?.seatId ? String(seat.seatId) : null;
      if (seatId) {
        return { selectedSeats: state.selectedSeats.filter((s) => s.seatId !== seatId) };
      }
      return {
        selectedSeats: state.selectedSeats.filter(
          (s) => !(s.sectionId === seat.sectionId && (s.row || 0) === (seat.row || 0) && (s.seatNumber || 0) === (seat.seatNumber || 0))
        ),
      };
    }),
  clearSeats: () => set({ selectedSeats: [], eventId: null }),
  setEventId: (eventId) => set({ eventId }),
  getTotalPrice: () => get().selectedSeats.reduce((sum, seat) => sum + seat.price, 0),
}));

// Favorites store - дуртай арга хэмжээнүүд
interface FavoritesState {
  favoritesByUser: Record<string, string[]>;
  anonymousFavorites: string[];
  getFavorites: (userId?: string | null) => string[];
  addFavorite: (eventId: string, userId?: string | null) => void;
  removeFavorite: (eventId: string, userId?: string | null) => void;
  toggleFavorite: (eventId: string, userId?: string | null) => void;
  isFavorite: (eventId: string, userId?: string | null) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoritesByUser: {},
      anonymousFavorites: [],
      getFavorites: (userId) => {
        if (!userId) return get().anonymousFavorites;
        return get().favoritesByUser[userId] || [];
      },
      addFavorite: (eventId, userId) =>
        set((state) => {
          if (!userId) {
            return {
              anonymousFavorites: state.anonymousFavorites.includes(eventId)
                ? state.anonymousFavorites
                : [...state.anonymousFavorites, eventId],
            };
          }

          const currentFavorites = state.favoritesByUser[userId] || [];
          const nextFavorites = currentFavorites.includes(eventId)
            ? currentFavorites
            : [...currentFavorites, eventId];

          return {
            favoritesByUser: {
              ...state.favoritesByUser,
              [userId]: nextFavorites,
            },
          };
        }),
      removeFavorite: (eventId, userId) =>
        set((state) => {
          if (!userId) {
            return {
              anonymousFavorites: state.anonymousFavorites.filter((id) => id !== eventId),
            };
          }

          const currentFavorites = state.favoritesByUser[userId] || [];
          return {
            favoritesByUser: {
              ...state.favoritesByUser,
              [userId]: currentFavorites.filter((id) => id !== eventId),
            },
          };
        }),
      toggleFavorite: (eventId, userId) =>
        set((state) => {
          if (!userId) {
            const exists = state.anonymousFavorites.includes(eventId);
            return {
              anonymousFavorites: exists
                ? state.anonymousFavorites.filter((id) => id !== eventId)
                : [...state.anonymousFavorites, eventId],
            };
          }

          const currentFavorites = state.favoritesByUser[userId] || [];
          const exists = currentFavorites.includes(eventId);

          return {
            favoritesByUser: {
              ...state.favoritesByUser,
              [userId]: exists
                ? currentFavorites.filter((id) => id !== eventId)
                : [...currentFavorites, eventId],
            },
          };
        }),
      isFavorite: (eventId, userId) => get().getFavorites(userId).includes(eventId),
    }),
    {
      name: 'favorites-storage',
      migrate: (persistedState: any) => {
        if (!persistedState) {
          return {
            favoritesByUser: {},
            anonymousFavorites: [],
          };
        }

        // Backward compatibility with old schema: { favorites: string[] }
        if (Array.isArray(persistedState.favorites)) {
          return {
            favoritesByUser: {},
            anonymousFavorites: persistedState.favorites,
          };
        }

        return persistedState;
      },
    }
  )
);

// Interests store - сонирхсон ангиллууд (event recommendation)
interface InterestsState {
  tags: string[];
  toggleTag: (tag: string) => void;
  setTags: (tags: string[]) => void;
  clearTags: () => void;
}

const ALLOWED_INTEREST_TAGS = new Set([
  'Бөхийн барилдаан',
  'Концерт',
  'Спорт',
  'Үзэсгэлэн',
  'Сургалт',
  'Хурал & Семинар',
  'Уулзалт',
]);

function normalizeInterestTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const cleaned = input
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .filter((t) => ALLOWED_INTEREST_TAGS.has(t));
  return Array.from(new Set(cleaned));
}

export const useInterestsStore = create<InterestsState>()(
  persist(
    (set, get) => ({
      tags: [],
      toggleTag: (tag) =>
        set((state) => {
          const key = String(tag || '').trim();
          if (!key) return state;
          if (!ALLOWED_INTEREST_TAGS.has(key)) return state;
          const exists = state.tags.includes(key);
          return { tags: exists ? state.tags.filter((t) => t !== key) : [...state.tags, key] };
        }),
      setTags: (tags) =>
        set({ tags: normalizeInterestTags(tags) }),
      clearTags: () => set({ tags: [] }),
    }),
    {
      name: 'interests-storage',
      migrate: (persistedState: any) => {
        if (!persistedState) return { tags: [] };
        if (Array.isArray(persistedState.categories)) return { tags: normalizeInterestTags(persistedState.categories) };
        if (Array.isArray(persistedState.tags)) return { tags: normalizeInterestTags(persistedState.tags) };
        return { tags: [] };
      },
    }
  )
);
