import { NextRequest, NextResponse } from 'next/server';
import { lockSeatIds, lockSeats } from '@/lib/redis';
import { z } from 'zod';
import { requireGatewaySignature } from '@/lib/internal-auth';

// Суудал түгжих validation
const lockSeatsSchema = z
  .object({
    eventId: z.string().min(1),
    // V1 (legacy grid): sectionId/row/seatNumber
    seats: z
      .array(
        z.object({
          sectionId: z.string(),
          row: z.number(),
          seatNumber: z.number(),
        })
      )
      .optional(),
    // V2: seatId (supports non-grid layouts)
    seatIds: z.array(z.string().min(1)).optional(),
  })
  .superRefine((data, ctx) => {
    const count = (Array.isArray(data.seatIds) ? data.seatIds.length : 0) + (Array.isArray(data.seats) ? data.seats.length : 0);
    if (count <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'seats эсвэл seatIds шаардлагатай', path: [] });
    }
    if (count > 10) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Нэг дор хамгийн ихдээ 10 сонгоно', path: [] });
    }
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

    const { eventId } = validationResult.data;

    // Prefer seatIds (V2) if provided
    if (Array.isArray(validationResult.data.seatIds) && validationResult.data.seatIds.length > 0) {
      const result = await lockSeatIds(eventId, validationResult.data.seatIds, userId);

      if (!result.success) {
        return NextResponse.json(
          {
            error: 'Зарим суудал аль хэдийн сонгогдсон байна',
            failedSeatIds: result.failedSeatIds,
            lockedSeatIds: result.lockedSeatIds,
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        message: 'Суудлууд амжилттай түгжигдлээ',
        lockedSeatIds: result.lockedSeatIds,
        expiresIn: 600,
      });
    }

    const seats = validationResult.data.seats || [];
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
