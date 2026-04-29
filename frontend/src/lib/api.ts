const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000').replace('http://localhost', 'http://127.0.0.1');

interface FetchOptions extends RequestInit {
  token?: string;
}

type RefreshedSession = {
  accessToken: string;
  refreshToken: string;
  user: any;
};

let refreshSessionPromise: Promise<RefreshedSession> | null = null;

export async function api<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge existing headers if any
  if (options.headers) {
    const existingHeaders = options.headers as Record<string, string>;
    Object.assign(headers, existingHeaders);
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data?.error || 'Алдаа гарлаа');
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }
  
  return data;
}

// Retry once on 401 by refreshing token (if available)
async function apiWithAuthRetry<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  try {
    return await api<T>(endpoint, options);
  } catch (err: any) {
    const isUnauthorized = err?.status === 401;
    if (!options.token || !isUnauthorized) {
      throw err;
    }

    try {
      const accessToken = await getFreshAccessToken();
      return api<T>(endpoint, { ...options, token: accessToken });
    } catch {
      await clearAuthAndRedirect();
      const sessionError = new Error('Сессийн хугацаа дууссан. Дахин нэвтэрнэ үү.');
      (sessionError as any).status = 401;
      throw sessionError;
    }
  }
}

async function getFreshAccessToken(): Promise<string> {
  // Lazy import to avoid circular deps
  const { useAuthStore } = await import('@/store');

  if (!refreshSessionPromise) {
    refreshSessionPromise = (async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        throw new Error('Refresh token байхгүй байна');
      }

      const refreshed = await authApi.refresh(refreshToken) as any;
      if (!refreshed?.accessToken || !refreshed?.refreshToken) {
        throw new Error('Refresh token шинэчилж чадсангүй');
      }

      const me = await authApi.me(refreshed.accessToken) as any;
      if (!me?.user) {
        throw new Error('Хэрэглэгчийн мэдээлэл авах боломжгүй');
      }

      useAuthStore.getState().setAuth(me.user, refreshed.accessToken, refreshed.refreshToken);
      return {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        user: me.user,
      };
    })();
  }

  try {
    const session = await refreshSessionPromise;
    return session.accessToken;
  } finally {
    refreshSessionPromise = null;
  }
}

async function clearAuthAndRedirect(): Promise<void> {
  const { useAuthStore } = await import('@/store');
  useAuthStore.getState().logout();

  if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
    window.location.assign('/auth');
  }
}

const ALLOWED_EVENT_CATEGORIES = new Set([
  'CONCERT',
  'CONFERENCE',
  'WORKSHOP',
  'MEETUP',
  'SPORTS',
  'WRESTLING',
  'EXHIBITION',
  'OTHER',
]);

type AnyRecord = Record<string, any>;

function legacyId<T extends AnyRecord>(obj: T): T & { _id: string } {
  const id = (obj as any)?._id ?? (obj as any)?.id;
  if (!id) return obj as any;
  if ((obj as any)._id) return obj as any;
  return { ...(obj as any), _id: id };
}

function normalizeEvent<T extends AnyRecord>(event: T): T & { _id: string } {
  if (!event) return event as any;
  const withId = legacyId(event);
  const date = (withId as any).date ?? (withId as any).startDate;
  const image = (withId as any).image ?? (withId as any).thumbnail ?? (withId as any).images?.[0];
  return {
    ...(withId as any),
    ...(date ? { date } : null),
    ...(image ? { image } : null),
  };
}

function normalizeVenue<T extends AnyRecord>(venue: T): T & { _id: string } {
  if (!venue) return venue as any;
  return legacyId(venue);
}

function normalizeNotification<T extends AnyRecord>(notification: T): T & { _id: string; read?: boolean } {
  if (!notification) return notification as any;
  const withId = legacyId(notification);
  const read = (withId as any).read ?? (withId as any).isRead;
  return {
    ...(withId as any),
    ...(typeof read === 'boolean' ? { read } : null),
  };
}

function normalizeNotificationsResponse<T extends AnyRecord>(res: T): T {
  if (!res) return res as any;
  const list = (res as any).notifications;
  if (!Array.isArray(list)) return res as any;
  return {
    ...(res as any),
    notifications: list.map(normalizeNotification),
  };
}

function normalizeBooking<T extends AnyRecord>(booking: T): T & { totalPrice?: number } {
  if (!booking) return booking as any;
  const totalPrice = (booking as any).totalPrice ?? (booking as any).totalAmount;
  return {
    ...(booking as any),
    ...(typeof totalPrice === 'number' ? { totalPrice } : null),
  };
}

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    
  login: (data: { email: string; password: string }) =>
    api('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    
  refresh: (refreshToken: string) =>
    api('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    
  me: (token: string) =>
    api('/api/users/me', { token }),

  resendOtp: (
    data: { type: 'EMAIL_VERIFY' | 'PHONE_VERIFY' | 'PASSWORD_RESET' | 'BECOME_ORGANIZER' },
    token: string
  ) => apiWithAuthRetry('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify(data), token }),

  verifyOtp: (
    data: { code: string; type: 'EMAIL_VERIFY' | 'PHONE_VERIFY' | 'PASSWORD_RESET' | 'BECOME_ORGANIZER' },
    token: string
  ) => apiWithAuthRetry('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify(data), token }),

  forgotPassword: (data: { email: string }) =>
    api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),

  resetPassword: (data: { email: string; code: string; newPassword: string }) =>
    api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  becomeOrganizer: (
    data: { organizationName: string; description?: string; website?: string },
    token: string
  ) => apiWithAuthRetry('/api/auth/become-organizer', { method: 'POST', body: JSON.stringify(data), token }),
};

// Events API
export const eventsApi = {
  getAll: (params?: {
    page?: number;
    category?: string;
    search?: string;
    tags?: string[];
    dateRange?: 'today' | 'week' | 'month';
    hasTickets?: boolean;
    limit?: number;
    status?: string;
    city?: string;
    upcoming?: boolean;
    recommend?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.category) {
      const category = params.category.toUpperCase();
      if (ALLOWED_EVENT_CATEGORIES.has(category)) {
        searchParams.set('category', category);
      }
    }
    if (params?.search) searchParams.set('search', params.search);
    if (params?.tags && Array.isArray(params.tags) && params.tags.length > 0) {
      const clean = params.tags.map((t) => String(t || '').trim()).filter(Boolean);
      if (clean.length > 0) searchParams.set('tags', clean.join(','));
    }
    if (params?.recommend) searchParams.set('recommend', 'true');
    if (params?.dateRange) searchParams.set('dateRange', params.dateRange);
    if (typeof params?.hasTickets === 'boolean') searchParams.set('hasTickets', String(params.hasTickets));
    if (params?.city) searchParams.set('city', params.city);
    if (typeof params?.upcoming === 'boolean') searchParams.set('upcoming', String(params.upcoming));
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    searchParams.set('status', params?.status || 'PUBLISHED');
    return api<any>(`/api/events?${searchParams.toString()}`).then((res) => {
      const events = Array.isArray(res?.events) ? res.events.map(normalizeEvent) : res?.events;
      return { ...res, ...(events ? { events } : null) };
    });
  },
  
  // Organizer - get my events
  getMyEvents: (token: string, params?: { page?: number; status?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('mine', 'true');
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return apiWithAuthRetry<any>(`/api/events?${searchParams.toString()}`, { token }).then((res) => {
      const events = Array.isArray(res?.events) ? res.events.map(normalizeEvent) : res?.events;
      return { ...res, ...(events ? { events } : null) };
    });
  },
  
  getById: (id: string) =>
    api<any>(`/api/events/${id}`).then((res) => {
      const event = res?.event ? normalizeEvent(res.event) : res?.event;
      return { ...res, ...(event ? { event } : null) };
    }),

  getLayout: (id: string) => api<any>(`/api/events/${id}/layout`),
    
  // Organizer endpoints
  create: (data: any, token: string) =>
    api<any>('/api/events', { method: 'POST', body: JSON.stringify(data), token }).then((res) => {
      const event = res?.event ? normalizeEvent(res.event) : res?.event;
      return { ...res, ...(event ? { event } : null) };
    }),
    
  update: (id: string, data: any, token: string) =>
    api<any>(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }).then((res) => {
      const event = res?.event ? normalizeEvent(res.event) : res?.event;
      return { ...res, ...(event ? { event } : null) };
    }),
    
  delete: (id: string, token: string) =>
    api(`/api/events/${id}`, { method: 'DELETE', token }),

  cancel: (id: string, token: string) =>
    api(`/api/events/${id}/cancel`, { method: 'POST', token }),
};

// Venues API
export const venuesApi = {
  getAll: () =>
    api<any>('/api/venues').then((res) => {
      const venues = Array.isArray(res?.venues) ? res.venues.map(normalizeVenue) : res?.venues;
      return { ...res, ...(venues ? { venues } : null) };
    }),
  getById: (id: string) =>
    api<any>(`/api/venues/${id}`).then((res) => {
      const venue = res?.venue ? normalizeVenue(res.venue) : res?.venue;
      return { ...res, ...(venue ? { venue } : null) };
    }),
  create: (data: any, token: string) =>
    api('/api/venues', { method: 'POST', body: JSON.stringify(data), token }),

  update: (id: string, data: any, token: string) =>
    api(`/api/venues/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),

  delete: (id: string, token: string) =>
    api(`/api/venues/${id}`, { method: 'DELETE', token }),
};

// Booking API
export const bookingApi = {
  lockSeats: (
    data:
      | { eventId: string; seats: Array<{ sectionId: string; row: number; seatNumber: number }> }
      | { eventId: string; seatIds: string[] },
    token: string
  ) =>
    apiWithAuthRetry('/api/seats/lock', { method: 'POST', body: JSON.stringify(data), token }),
    
  unlockSeats: (
    data:
      | { eventId: string; seats: Array<{ sectionId: string; row: number; seatNumber: number }> }
      | { eventId: string; seatIds: string[] },
    token: string
  ) =>
    apiWithAuthRetry('/api/seats/unlock', { method: 'POST', body: JSON.stringify(data), token }),
    
  getSeatsStatus: (eventId: string) =>
    api(`/api/seats/status?eventId=${eventId}`),
    
  create: (data: {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    venueId: string;
    venueName: string;
    seats: Array<{ sectionId: string; sectionName: string; row: number; seatNumber: number; price: number }>;
    totalPrice?: number;
  }, token: string) =>
    apiWithAuthRetry<any>('/api/bookings', { method: 'POST', body: JSON.stringify(data), token }).then((res) => {
      const booking = res?.booking ? normalizeBooking(res.booking) : res?.booking;
      return { ...res, ...(booking ? { booking } : null) };
    }),
    
  getMyBookings: (token: string, params?: { page?: number; status?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return apiWithAuthRetry<any>(`/api/bookings?${searchParams.toString()}`, { token }).then((res) => {
      const bookings = Array.isArray(res?.bookings) ? res.bookings.map(normalizeBooking) : res?.bookings;
      return { ...res, ...(bookings ? { bookings } : null) };
    });
  },
  
  getById: (id: string, token: string) =>
    apiWithAuthRetry<any>(`/api/bookings/${id}`, { token }).then((res) => {
      const booking = res?.booking ? normalizeBooking(res.booking) : res?.booking;
      return { ...res, ...(booking ? { booking } : null) };
    }),
    
  confirm: (
    id: string,
    data: { paymentId?: string; paymentMethod?: string } = {},
    token: string
  ) => apiWithAuthRetry(`/api/bookings/${id}/confirm`, { method: 'POST', body: JSON.stringify(data), token }),
    
  cancel: (id: string, data?: { reason?: string }, token?: string) =>
    apiWithAuthRetry(`/api/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify(data || {}), token }),
    
  getRefundInfo: (id: string, token: string) =>
    apiWithAuthRetry(`/api/bookings/${id}/cancel`, { token }),

  getEventParticipants: (eventId: string, token: string, params?: { page?: number; status?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const qs = searchParams.toString();
    return apiWithAuthRetry<any>(`/api/bookings/event/${eventId}${qs ? `?${qs}` : ''}`, { token });
  },

  getEventSalesSummary: async (
    eventId: string,
    token: string,
    params?: { status?: string; limit?: number; maxPages?: number }
  ): Promise<{ ticketsSold: number; revenue: number }> => {
    const limit = params?.limit ?? 200;
    const maxPages = params?.maxPages ?? 50;
    const status = params?.status ?? 'CONFIRMED';

    let page = 1;
    let ticketsSold = 0;
    let revenue = 0;
    let totalPages: number | null = null;

    while (page <= maxPages) {
      const res = (await bookingApi.getEventParticipants(eventId, token, {
        page,
        limit,
        status,
      })) as {
        participants?: Array<any>;
        bookings?: Array<any>;
        pagination?: { totalPages?: number };
      };

      const list = Array.isArray(res?.participants)
        ? res.participants
        : Array.isArray(res?.bookings)
          ? res.bookings
          : [];

      for (const item of list) {
        const seatCount =
          typeof item?.seatCount === 'number'
            ? item.seatCount
            : Array.isArray(item?.seats)
              ? item.seats.length
              : 1;
        const amount =
          typeof item?.totalAmount === 'number'
            ? item.totalAmount
            : typeof item?.totalPrice === 'number'
              ? item.totalPrice
              : 0;
        ticketsSold += seatCount;
        revenue += amount;
      }

      const tp = res?.pagination?.totalPages;
      if (typeof tp === 'number' && Number.isFinite(tp)) totalPages = tp;

      if (totalPages !== null) {
        if (page >= totalPages) break;
        page += 1;
        continue;
      }

      if (list.length < limit) break;
      page += 1;
    }

    return { ticketsSold, revenue };
  },
};

export const userApi = {
  updateMe: (data: { firstName?: string; lastName?: string; phone?: string; avatar?: string }, token: string) =>
    apiWithAuthRetry<{ message: string; user: any }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }, token: string) =>
    apiWithAuthRetry<{ message: string }>('/api/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),
};

// Admin API
export const adminApi = {
  // Stats
  getStats: (token: string) =>
    api('/api/admin/stats', { token }),

  getUsersStats: (token: string) =>
    api('/api/admin/users/stats', { token }),

  getEventsStats: (token: string) =>
    api('/api/admin/events/stats', { token }),

  // Users
  getUsers: (
    token: string,
    params?: { page?: number; role?: string; search?: string; limit?: number; isActive?: boolean }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.role) searchParams.set('role', params.role);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (typeof params?.isActive === 'boolean') searchParams.set('isActive', String(params.isActive));
    return api(`/api/admin/users?${searchParams.toString()}`, { token });
  },

  updateUser: (id: string, data: { role?: string; isActive?: boolean }, token: string) =>
    api(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),

  deleteUser: (id: string, token: string) =>
    api(`/api/users/${id}`, { method: 'DELETE', token }),
  
  // Events
  getEvents: (token: string, params?: { page?: number; status?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return api<any>(`/api/admin/events?${searchParams.toString()}`, { token }).then((res) => {
      const events = Array.isArray(res?.events) ? res.events.map(normalizeEvent) : res?.events;
      return { ...res, ...(events ? { events } : null) };
    });
  },
  
  approveEvent: (id: string, data?: { isFeatured?: boolean }, token?: string) =>
    api(`/api/admin/events/${id}/approve`, { method: 'POST', body: JSON.stringify(data || {}), token }),
    
  rejectEvent: (id: string, data: { reason: string }, token: string) =>
    api(`/api/admin/events/${id}/reject`, { method: 'POST', body: JSON.stringify(data), token }),

  // Bookings (admin)
  getBookings: (token: string, params?: { page?: number; status?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return api<any>(`/api/bookings?${searchParams.toString()}`, { token }).then((res) => {
      const bookings = Array.isArray(res?.bookings) ? res.bookings.map(normalizeBooking) : res?.bookings;
      return { ...res, ...(bookings ? { bookings } : null) };
    });
  },

  updateBooking: (
    id: string,
    data: { status?: string; paymentId?: string; paymentMethod?: string },
    token: string
  ) => api(`/api/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),

  cancelBooking: (id: string, token: string) =>
    api(`/api/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({}), token }),

  // Notifications (broadcast)
  broadcastNotification: (data: { title: string; message: string; userIds?: string[] }, token: string) =>
    api('/api/admin/broadcast', { method: 'POST', body: JSON.stringify(data), token }),

  // Logs (audit)
  getLogs: (
    token: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      action?: string;
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
    const qs = searchParams.toString();
    return api(`/api/admin/logs${qs ? `?${qs}` : ''}`, { token });
  },
};

// Notifications API
export const notificationsApi = {
  getAll: (token: string, params?: { page?: number; limit?: number; unread?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (typeof params?.unread === 'boolean') searchParams.set('unread', String(params.unread));
    const qs = searchParams.toString();
    return apiWithAuthRetry<any>(`/api/notifications${qs ? `?${qs}` : ''}`, { token }).then(normalizeNotificationsResponse);
  },
  
  markAsRead: (notificationIds: string[], token: string) =>
    apiWithAuthRetry('/api/notifications', { method: 'PATCH', body: JSON.stringify({ notificationIds }), token }),
    
  markAllAsRead: (token: string) =>
    apiWithAuthRetry('/api/notifications', { method: 'PATCH', body: JSON.stringify({ markAllAsRead: true }), token }),
};

// Upload API - separate function for multipart/form-data
export const uploadApi = {
  uploadImages: async (files: File[], token: string): Promise<{ 
    message: string; 
    files: Array<{ url: string; originalName: string }>; 
    errors?: string[];
  }> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Зураг оруулах алдаа');
    }

    return data;
  },

  getConfig: () => api<{ 
    allowedTypes: string[]; 
    maxFileSize: number; 
    maxFileSizeMB: number;
  }>('/api/upload'),
};
