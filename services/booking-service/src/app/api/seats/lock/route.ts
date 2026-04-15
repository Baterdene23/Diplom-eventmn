import { NextRequest, NextResponse } from 'next/server';
import { lockSeats } from '@/lib/redis';
import { z } from 'zod';
import { requireGatewaySignature } from '@/lib/internal-auth';

// Суудал түгжих validation
const lockSeatsSchema = z.object({
  eventId: z.string().min(1),
  seats: z.array(z.object({
    sectionId: z.string(),
    row: z.number(),
    seatNumber: z.number(),
  })).min(1).max(10), // Max 10 суудал нэг дор
});

// POST /api/seats/lock - Суудал түгжих
export async function POST(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/seats/lock');
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validationResult = lockSeatsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { eventId, seats } = validationResult.data;

    // Redis-ээр суудлуудыг түгжих
    const result = await lockSeats(eventId, seats, userId);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Зарим суудал аль хэдийн сонгогдсон байна',
          failedSeats: result.failedSeats,
          lockedSeats: result.lockedSeats,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: 'Суудлууд амжилттай түгжигдлээ',
      lockedSeats: result.lockedSeats,
      expiresIn: 600,
    });
  } catch (error) {
    console.error('Lock seats error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Суудал түгжих амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
