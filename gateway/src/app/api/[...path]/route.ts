import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';

// CORS headers
function allowedOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin');
  const configured = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Non-browser clients don't need CORS.
  if (!origin) return '';

  if (configured.length === 0) {
    // Safe default: allow same-origin only.
    const host = request.headers.get('host');
    if (!host) return '';
    const sameHttp = `http://${host}`;
    const sameHttps = `https://${host}`;
    return origin === sameHttp || origin === sameHttps ? origin : '';
  }

  return configured.includes(origin) ? origin : '';
}

function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = allowedOrigin(request);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }

  return headers;
}

// Service URLs
const SERVICES = {
  users: process.env.USER_SERVICE_URL || 'http://user-service:3000',
  events: process.env.EVENT_SERVICE_URL || 'http://event-service:3000',
  venues: process.env.EVENT_SERVICE_URL || 'http://event-service:3000',
  bookings: process.env.BOOKING_SERVICE_URL || 'http://booking-service:3000',
  seats: process.env.BOOKING_SERVICE_URL || 'http://booking-service:3000',
  notifications: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3000',
  auth: process.env.USER_SERVICE_URL || 'http://user-service:3000',
  upload: process.env.EVENT_SERVICE_URL || 'http://event-service:3000', // Image upload -> Event Service
};

// Public endpoints (no auth required)
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/events', // GET only
  '/api/venues', // GET only
];

function isPublicPath(method: string, path: string): boolean {
  const isReadMethod = method === 'GET' || method === 'HEAD';

  // Auth endpoints
  if (path.startsWith('/api/auth/')) {
    return true;
  }
  
  // GET events & venues are public
  if (isReadMethod && (path.startsWith('/api/events') || path.startsWith('/api/venues'))) {
    return true;
  }

  // GET seats/status is public (seat map display)
  if (isReadMethod && path.startsWith('/api/seats/status')) {
    return true;
  }

  return false;
}

function getServiceUrl(path: string): string | null {
  const parts = path.split('/').filter(Boolean);
  // /api/{service}/...
  if (parts.length >= 2 && parts[0] === 'api') {
    const serviceName = parts[1];
    return SERVICES[serviceName as keyof typeof SERVICES] || null;
  }
  return null;
}

async function handler(request: NextRequest, { params }: { params: { path: string[] } }) {
  const CORS_HEADERS = corsHeaders(request);
  const path = '/' + (params.path?.join('/') || '');
  const fullPath = '/api' + path;
  const method = request.method;
  // Some clients (and proxies) issue HEAD even when the backend only supports GET.
  // Forward HEAD as GET and strip the body on the way back.
  const forwardMethod = method === 'HEAD' ? 'GET' : method;

  // Global API rate limit (NFR-S06): 100 requests/minute
  // NOTE: Uses in-memory fallback; in a scaled deployment this should be backed by Redis.
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const { allowed, remaining, resetSeconds } = await checkRateLimit(`ip:${ip}`, {
      limit: 100,
      windowSeconds: 60,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            'Retry-After': String(Math.max(1, resetSeconds)),
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.max(1, resetSeconds)),
          },
        }
      );
    }

    CORS_HEADERS['X-RateLimit-Limit'] = '100';
    CORS_HEADERS['X-RateLimit-Remaining'] = String(remaining);
    CORS_HEADERS['X-RateLimit-Reset'] = String(Math.max(1, resetSeconds));
  } catch (e) {
    // Best-effort: do not block requests on rate limiter failures.
    console.warn('Rate limit check failed:', e);
  }

  // Get target service URL
  const pathParts = path.split('/').filter(Boolean);
  const serviceName = pathParts[0];
  
  let serviceUrl: string;
  let targetPath: string;

  // Admin routes - /api/admin/{resource}/... -> дагуу service рүү чиглүүлэх
  if (serviceName === 'admin') {
    const adminResource = pathParts[1]; // users, events, bookings, etc.
    
    if (adminResource === 'users' || adminResource === 'logs') {
      serviceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3000';
    } else if (adminResource === 'events') {
      serviceUrl = process.env.EVENT_SERVICE_URL || 'http://event-service:3000';
    } else if (adminResource === 'bookings' || adminResource === 'stats') {
      serviceUrl = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3000';
    } else if (adminResource === 'notifications' || adminResource === 'broadcast') {
      serviceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3000';
    } else {
      return NextResponse.json(
        { error: 'Admin resource not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }
    
    // /api/admin/events/123/approve -> /api/admin/events/123/approve
    targetPath = '/api/' + pathParts.join('/');
  } else if (serviceName === 'auth') {
    // Auth routes -> User Service
    // /api/auth/login -> /api/auth/login
    serviceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3000';
    targetPath = '/api/' + pathParts.join('/');
  } else {
    // Regular service routing
    serviceUrl = SERVICES[serviceName as keyof typeof SERVICES] as string;
    
    if (!serviceUrl) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }
    
    // /api/events/123 -> /api/events/123
    targetPath = '/api/' + pathParts.join('/');
  }

  // Build target URL
  const targetUrl = new URL(targetPath, serviceUrl);
  
  // Copy query params
  const { searchParams } = new URL(request.url);
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  // Prepare headers
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    return NextResponse.json(
      { error: 'Gateway misconfigured: INTERNAL_API_SECRET is not set' },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  let signedUserId = '';
  let signedUserRole = '';

  const isMineEventsRequest =
    (method === 'GET' || method === 'HEAD') &&
    fullPath.startsWith('/api/events') &&
    new URL(request.url).searchParams.get('mine') === 'true';

  // Auth check for protected routes
  if (!isPublicPath(method, fullPath) || isMineEventsRequest) {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token буруу эсвэл хугацаа дууссан' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Add user info to headers for downstream services
    headers.set('x-user-id', payload.userId);
    headers.set('x-user-email', payload.email);
    headers.set('x-user-role', payload.role);
    headers.set('x-user-name', payload.email.split('@')[0]); // Simple name extraction

    signedUserId = payload.userId;
    signedUserRole = payload.role;
  }

  // Internal request signature for downstream services
  const internalTs = Date.now().toString();
  const signatureBase = `${internalTs}.${forwardMethod}.${targetPath}.${signedUserId}.${signedUserRole}`;
  const internalSig = crypto
    .createHmac('sha256', internalSecret)
    .update(signatureBase)
    .digest('hex');
  headers.set('x-internal-ts', internalTs);
  headers.set('x-internal-signature', internalSig);

  // Forward authorization header if present
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }

  try {
    // Build fetch options
    const fetchOptions: RequestInit = {
      method: forwardMethod,
    };

    // Check if this is a multipart/form-data request (file upload)
    const contentType = request.headers.get('content-type');
    const isMultipart = contentType?.includes('multipart/form-data');

    if (isMultipart) {
      // For multipart requests, forward the body as-is with original headers
      const formData = await request.formData();
      fetchOptions.body = formData;
      // Don't set Content-Type header - let fetch set it with boundary
      const multipartHeaders = new Headers();
      if (headers.has('x-user-id')) multipartHeaders.set('x-user-id', headers.get('x-user-id')!);
      if (headers.has('x-user-email')) multipartHeaders.set('x-user-email', headers.get('x-user-email')!);
      if (headers.has('x-user-role')) multipartHeaders.set('x-user-role', headers.get('x-user-role')!);
      if (headers.has('x-user-name')) multipartHeaders.set('x-user-name', headers.get('x-user-name')!);
      if (headers.has('Authorization')) multipartHeaders.set('Authorization', headers.get('Authorization')!);
      if (headers.has('x-internal-ts')) multipartHeaders.set('x-internal-ts', headers.get('x-internal-ts')!);
      if (headers.has('x-internal-signature')) multipartHeaders.set('x-internal-signature', headers.get('x-internal-signature')!);
      fetchOptions.headers = multipartHeaders;
    } else {
      fetchOptions.headers = headers;
      // Add body for non-GET requests
      if (forwardMethod !== 'GET' && forwardMethod !== 'HEAD') {
        try {
          const body = await request.json();
          fetchOptions.body = JSON.stringify(body);
        } catch {
          // No body or invalid JSON
        }
      }
    }

    // Forward request to service
    const response = await fetch(targetUrl.toString(), fetchOptions);

    // For client HEAD, do not attempt to read/parse a body.
    if (method === 'HEAD') {
      return new NextResponse(null, {
        status: response.status,
        headers: CORS_HEADERS,
      });
    }
    
    // Get response data
    let data;
    const responseContentType = response.headers.get('content-type');
    if (responseContentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (responseContentType?.includes('application/json')) {
      return NextResponse.json(data, {
        status: response.status,
        headers: CORS_HEADERS,
      });
    }

    return new NextResponse(data, {
      status: response.status,
      headers: {
        ...CORS_HEADERS,
        ...(responseContentType ? { 'Content-Type': responseContentType } : {}),
      },
    });
  } catch (error) {
    console.error('Gateway error:', error);
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
