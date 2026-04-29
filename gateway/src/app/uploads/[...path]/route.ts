import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getEventServiceBaseUrl(): string {
  return process.env.EVENT_SERVICE_URL || 'http://event-service:3000';
}

function joinPath(segments: string[]): string {
  return segments.map((s) => encodeURIComponent(s)).join('/');
}

async function proxy(request: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const target = new URL(getEventServiceBaseUrl());
  target.pathname = `/uploads/${joinPath(path || [])}`;
  target.search = new URL(request.url).search;

  const response = await fetch(target.toString(), {
    method: request.method,
    // No auth needed; this is a public static asset.
    headers: {
      // Forward range headers for media/image partial requests.
      ...(request.headers.get('range') ? { range: request.headers.get('range') as string } : null),
    } as Record<string, string>,
  });

  // Stream through the response body.
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      // Content headers
      ...(response.headers.get('content-type') ? { 'Content-Type': response.headers.get('content-type') as string } : null),
      ...(response.headers.get('content-length')
        ? { 'Content-Length': response.headers.get('content-length') as string }
        : null),
      ...(response.headers.get('content-range')
        ? { 'Content-Range': response.headers.get('content-range') as string }
        : null),
      ...(response.headers.get('accept-ranges')
        ? { 'Accept-Ranges': response.headers.get('accept-ranges') as string }
        : null),
      // Cache aggressively; filenames are unique.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    return await proxy(request, context.params);
  } catch (error) {
    console.error('Uploads proxy error:', error);
    return NextResponse.json({ error: 'Upload asset unavailable' }, { status: 503 });
  }
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    return await proxy(request, context.params);
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
