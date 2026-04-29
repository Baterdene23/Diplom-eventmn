import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { requireGatewaySignature } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

// Upload directory - public/uploads folder
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Allowed image types
// NOTE: Some clients report JPEG as image/jpg or image/pjpeg.
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Generate unique filename
function generateFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}${ext}`;
}

// POST /api/upload - Upload image(s)
export async function POST(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/upload');
    // Auth check (header-аас user info авах - Gateway-аас дамжуулна)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    // Only ORGANIZER and ADMIN can upload
    if (userRole !== 'ORGANIZER' && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Зураг оруулах эрхгүй байна' },
        { status: 403 }
      );
    }

    // Create upload directory if not exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Зураг сонгоно уу' },
        { status: 400 }
      );
    }

    const uploadedFiles: { url: string; originalName: string }[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Зөвшөөрөгдөөгүй файлын төрөл (${file.type})`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Файлын хэмжээ хэт их (max 5MB)`);
        continue;
      }

      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const filename = generateFilename(file.name);
        const filepath = path.join(UPLOAD_DIR, filename);

        await writeFile(filepath, buffer);

        // Return the URL path (relative to public)
        uploadedFiles.push({
          url: `/uploads/${filename}`,
          originalName: file.name,
        });
      } catch (err) {
        console.error(`Failed to save file ${file.name}:`, err);
        errors.push(`${file.name}: Файл хадгалах алдаа`);
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: 'Зураг оруулах амжилтгүй', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Зураг амжилттай оруулагдлаа',
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Зураг оруулах алдаа гарлаа' },
      { status: 500 }
    );
  }
}

// GET /api/upload - Get upload config info
export async function GET() {
  return NextResponse.json({
    allowedTypes: ALLOWED_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
  });
}
