import { NextRequest, NextResponse } from 'next/server';
import { unlockSeat } from '@/lib/redis';
import { z } from 'zod';
import { requireGatewaySignature } from '@/lib/internal-auth';

const unlockSeatsSchema = z.object({
  eventId: z.string().min(1),
  seats: z.array(z.object({
    sectionId: z.string(),
    row: z.number(),
    seatNumber: z.number(),
  })),
});

// POST /api/seats/unlock - Суудлын түгжээ тайлах
export async function POST(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/seats/unlock');
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validationResult = unlockSeatsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { eventId, seats } = validationResult.data;

    const results = await Promise.all(
      seats.map(seat => 
        unlockSeat(eventId, seat.sectionId, seat.row, seat.seatNumber, userId)
      )
    );

    const unlockedCount = results.filter(Boolean).length;

    return NextResponse.json({
      message: `${unlockedCount} суудлын түгжээ тайлагдлаа`,
      unlockedCount,
    });
  } catch (error) {
    console.error('Unlock seats error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Түгжээ тайлах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
