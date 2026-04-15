import { NextRequest, NextResponse } from 'next/server';

// Provide a stable redirect so Next/Image optimizer and direct requests don't fail.
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const joined = Array.isArray(params?.path) ? params.path.join('/') : '';
  const filename = joined.split('/').pop() || 'event';
  const seed = filename.replace(/\.[^.]+$/, '') || 'event';

  const url = new URL(`https://picsum.photos/seed/${encodeURIComponent(seed)}/1600/900`);

  // Preserve query params that Next may include (not required, but harmless)
  for (const [k, v] of request.nextUrl.searchParams.entries()) {
    url.searchParams.set(k, v);
  }

  const res = NextResponse.redirect(url, 307);
  res.headers.set('Cache-Control', 'public, max-age=86400');
  return res;
}
