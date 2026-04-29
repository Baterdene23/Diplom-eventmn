import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

function resolveSafePath(segments: string[]): string {
  const resolved = path.resolve(UPLOAD_DIR, ...segments);
  const base = path.resolve(UPLOAD_DIR);

  // Prevent path traversal (../../etc/passwd)
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw Object.assign(new Error('Invalid path'), { status: 400 });
  }

  return resolved;
}

async function getFilePath(params: Promise<{ path: string[] }>): Promise<string> {
  const { path: parts } = await params;
  const segments = Array.isArray(parts) ? parts : [];
  return resolveSafePath(segments);
}

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const filePath = await getFilePath(context.params);
    const file = await readFile(filePath);

    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(filePath),
        // Filenames are unique; safe to cache long-term.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 404;
    return new NextResponse(null, { status });
  }
}

export async function HEAD(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const filePath = await getFilePath(context.params);
    const info = await stat(filePath);

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(filePath),
        'Content-Length': info.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 404;
    return new NextResponse(null, { status });
  }
}
