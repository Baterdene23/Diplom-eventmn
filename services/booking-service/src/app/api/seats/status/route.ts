import { NextRequest, NextResponse } from 'next/server';
import { getEventSeatIdLocks, getEventSeatsStatus } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/seats/status?eventId=xxx - Event-ийн суудлын төлөв
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId шаардлагатай' },
        { status: 400 }
      );
    }

    // Redis-ээс түгжигдсэн суудлууд (legacy + v2)
    const [lockedSeats, lockedSeatIds] = await Promise.all([
      getEventSeatsStatus(eventId),
      getEventSeatIdLocks(eventId),
    ]);

    // Database-аас захиалагдсан суудлууд (CONFIRMED)
    const bookedSeats = await prisma.bookingSeat.findMany({
      where: {
        booking: {
          eventId,
          status: 'CONFIRMED',
        },
      },
      select: {
        seatId: true,
        sectionId: true,
        row: true,
        seatNumber: true,
      },
    });

    // Format хийх
    const locked: Array<{ sectionId: string; row: number; seatNumber: number; lockedBy: string }> = [];
    lockedSeats.forEach((userId, key) => {
      const [sectionId, row, seatNumber] = key.split(':');
      locked.push({
        sectionId,
        row: parseInt(row),
        seatNumber: parseInt(seatNumber),
        lockedBy: userId,
      });
    });

    const booked = bookedSeats
      .filter((seat) => typeof seat.row === 'number' && typeof seat.seatNumber === 'number')
      .map(seat => ({
        sectionId: seat.sectionId,
        row: seat.row as number,
        seatNumber: seat.seatNumber as number,
      }));

    const bookedSeatIds = bookedSeats.map((s) => s.seatId).filter((v): v is string => Boolean(v));

    const lockedBySeatId: Record<string, string> = {};
    lockedSeatIds.forEach((userId, seatId) => {
      lockedBySeatId[seatId] = userId;
    });

    return NextResponse.json({
      eventId,
      locked,  // Түгжигдсэн (10 минут хүлээж байгаа)
      booked,  // Захиалагдсан (төлбөр хийгдсэн)
      lockedBySeatId,
      bookedSeatIds,
    });
  } catch (error) {
    console.error('Get seats status error:', error);
    return NextResponse.json(
      { error: 'Суудлын төлөв авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
