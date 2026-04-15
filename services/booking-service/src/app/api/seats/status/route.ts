import { NextRequest, NextResponse } from 'next/server';
import { getEventSeatsStatus } from '@/lib/redis';
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

    // Redis-ээс түгжигдсэн суудлууд
    const lockedSeats = await getEventSeatsStatus(eventId);

    // Database-аас захиалагдсан суудлууд (CONFIRMED)
    const bookedSeats = await prisma.bookingSeat.findMany({
      where: {
        booking: {
          eventId,
          status: 'CONFIRMED',
        },
      },
      select: {
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

    const booked = bookedSeats.map(seat => ({
      sectionId: seat.sectionId,
      row: seat.row,
      seatNumber: seat.seatNumber,
    }));

    return NextResponse.json({
      eventId,
      locked,  // Түгжигдсэн (10 минут хүлээж байгаа)
      booked,  // Захиалагдсан (төлбөр хийгдсэн)
    });
  } catch (error) {
    console.error('Get seats status error:', error);
    return NextResponse.json(
      { error: 'Суудлын төлөв авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
