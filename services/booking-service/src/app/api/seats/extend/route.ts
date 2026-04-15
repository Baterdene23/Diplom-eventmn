import { NextRequest, NextResponse } from 'next/server';
import { extendSeatLock, extendSeatsLock } from '@/lib/redis';
import { z } from 'zod';
import { requireGatewaySignature } from '@/lib/internal-auth';

// Суудлын түгжээ сунгах validation
const extendSeatsSchema = z.object({
  eventId: z.string().min(1),
  seats: z.array(z.object({
    sectionId: z.string(),
    row: z.number(),
    seatNumber: z.number(),
  })).min(1).max(10),
});

// POST /api/seats/extend - Түгжээний хугацаа сунгах
export async function POST(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/seats/extend');
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validationResult = extendSeatsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { eventId, seats } = validationResult.data;

    // Redis-ээр түгжээний хугацааг сунгах
    const result = await extendSeatsLock(eventId, seats, userId);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Зарим суудлын түгжээг сунгах боломжгүй',
          extended: result.extended,
          failed: result.failed,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: 'Түгжээний хугацаа амжилттай сунгагдлаа',
      extended: result.extended,
      expiresIn: 600,
    });
  } catch (error) {
    console.error('Extend seats lock error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Түгжээний хугацаа сунгах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
