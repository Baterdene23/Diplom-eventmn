import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRedisClient } from '@/lib/redis';
import { publishMessage, ROUTING_KEYS } from '@/lib/rabbitmq';
import { z } from 'zod';
import { requireGatewaySignature } from '@/lib/internal-auth';

// Захиалга баталгаажуулах schema (төлбөрийн интеграц scope-оос гадуур тул optional)
const confirmBookingSchema = z.object({
  paymentId: z.string().optional(),
  paymentMethod: z.enum(['CARD', 'QPAY', 'SOCIALPAY', 'BANK_TRANSFER']).optional(),
  transactionId: z.string().optional(),
  amount: z.number().optional(),
});

// POST /api/bookings/[id]/confirm - Захиалга баталгаажуулах
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/bookings/${params.id}/confirm`);
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { seats: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Захиалга олдсонгүй' },
        { status: 404 }
      );
    }

    // Зөвхөн өөрийн захиалга
    if (booking.userId !== userId) {
      return NextResponse.json(
        { error: 'Эрх хүрэхгүй байна' },
        { status: 403 }
      );
    }

    // PENDING төлөвтэй байх ёстой
    if (booking.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Захиалга "${booking.status}" төлөвтэй байна. Зөвхөн PENDING төлөвтэй захиалгыг баталгаажуулах боломжтой` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = confirmBookingSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { paymentId, paymentMethod, transactionId, amount } = validationResult.data;

    // Үнэ таарч байгаа эсэхийг шалгах (optional)
    if (amount && amount !== booking.totalAmount) {
      return NextResponse.json(
        { error: `Төлбөрийн дүн таарахгүй байна. Хүлээгдэж буй: ${booking.totalAmount}, Ирсэн: ${amount}` },
        { status: 400 }
      );
    }

    // Захиалга баталгаажуулах
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: 'CONFIRMED',
        ...(paymentId ? { paymentId } : {}),
        ...(paymentMethod ? { paymentMethod } : {}),
        paidAt: new Date(),
      },
      include: { seats: true },
    });

    // Redis-аас суудлын түгжээг устгах (одоо database-д хадгалагдсан)
    const redis = getRedisClient();
    const pipeline = redis.pipeline();
    for (const seat of booking.seats) {
      const key = `seat:${booking.eventId}:${seat.sectionId}:${seat.row}:${seat.seatNumber}`;
      pipeline.del(key);
    }
    await pipeline.exec();

    // RabbitMQ-руу мессеж илгээх (Notification Service хүлээн авна)
    await publishMessage(ROUTING_KEYS.BOOKING_CONFIRMED, {
      bookingId: booking.id,
      userId: booking.userId,
      userEmail: booking.userEmail,
      userName: booking.userName,
      eventTitle: booking.eventTitle,
      eventDate: booking.eventDate.toISOString(),
      venueName: booking.venueName,
      seats: booking.seats.map(s => ({
        sectionName: s.sectionName,
        row: s.row,
        seatNumber: s.seatNumber,
      })),
      totalAmount: booking.totalAmount,
      qrCode: booking.qrCode,
    });

    return NextResponse.json({
      message: 'Захиалга амжилттай баталгаажлаа',
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json({ error: 'Захиалга баталгаажуулах амжилтгүй боллоо' }, { status: 500 });
  }
}
