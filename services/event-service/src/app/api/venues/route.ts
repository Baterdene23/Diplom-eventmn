import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireGatewaySignature } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

// Venue үүсгэх validation
const createVenueSchema = z.object({
  name: z.string().min(1, 'Нэр оруулна уу'),
  address: z.string().min(1, 'Хаяг оруулна уу'),
  city: z.string().min(1, 'Хот сонгоно уу'),
  capacity: z.number().min(1, 'Багтаамж оруулна уу'),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  sections: z.array(z.object({
    id: z.string(),
    name: z.string(),
    rows: z.number(),
    seatsPerRow: z.number(),
    price: z.number(),
    color: z.string().optional(),
  })).optional(),
});

// GET /api/venues - Бүх venue жагсаалт
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    // Admin эсвэл includeInactive параметр байвал бүх venue харуулна
    const userRole = request.headers.get('x-user-role');
    const isAdmin = userRole === 'ADMIN';

    // includeInactive=true is meant for admins (frontend uses it).
    // Require a gateway signature to prevent direct-header forgery.
    if (includeInactive && isAdmin) {
      requireGatewaySignature(request, '/api/venues');
    }

    const where: Record<string, any> = {};
    
    // Admin биш бол зөвхөн идэвхтэй venue харуулна
    if (!isAdmin || !includeInactive) {
      where.isActive = true;
    }

    if (city) {
      where.city = city;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const venues = await prisma.venue.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ venues });
  } catch (error) {
    console.error('Get venues error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Venues авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}

// POST /api/venues - Venue үүсгэх
export async function POST(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/venues');
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Зөвхөн админ venue үүсгэх боломжтой' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    const validationResult = createVenueSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const venueData = {
      ...validationResult.data,
      images: validationResult.data.images ?? [],
      sections: validationResult.data.sections ?? [],
      createdBy: userId,
    };

    const venue = await prisma.venue.create({ data: venueData });

    return NextResponse.json(
      { message: 'Venue амжилттай үүсгэгдлээ', venue },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create venue error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Venue үүсгэх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
