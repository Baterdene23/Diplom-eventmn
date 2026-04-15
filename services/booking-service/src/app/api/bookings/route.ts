import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSeatLock } from '@/lib/redis';
import { publishMessage, ROUTING_KEYS } from '@/lib/rabbitmq';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { requireGatewaySignature } from '@/lib/internal-auth';

// Захиалга үүсгэх validation
const createBookingSchema = z.object({
  eventId: z.string().min(1),
  eventTitle: z.string().min(1),
  eventDate: z.string().transform(str => new Date(str)),
  venueId: z.string().min(1),
  venueName: z.string().min(1),
  seats: z.array(z.object({
    sectionId: z.string(),
    sectionName: z.string(),
    row: z.number(),
    seatNumber: z.number(),
    price: z.number(),
  })).min(1),
});

// GET /api/bookings - Захиалгын жагсаалт
export async function GET(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/bookings');
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const where: any = {};

    // Admin бүх захиалгыг харна, бусад зөвхөн өөрийнхөө
    if (userRole !== 'ADMIN') {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          seats: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json({ error: 'Захиалга авах амжилтгүй боллоо' }, { status: 500 });
  }
}

// POST /api/bookings - Захиалга үүсгэх
export async function POST(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/bookings');
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email') || '';
    const userName = request.headers.get('x-user-name') || '';

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validationResult = createBookingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { eventId, eventTitle, eventDate, venueId, venueName, seats } = validationResult.data;

    // Event дууссан эсэхийг eventDate-аар шалгана (booking payload-аас ирж байгаа огноо)
    if (eventDate.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Дууссан арга хэмжээнд бүртгүүлэх боломжгүй' },
        { status: 400 }
      );
    }

    // Суудлууд түгжигдсэн эсэхийг шалгах (энэ хэрэглэгчийн түгжээ мөн эсэх)
    for (const seat of seats) {
      const lockOwner = await getSeatLock(eventId, seat.sectionId, seat.row, seat.seatNumber);
      
      if (lockOwner !== userId) {
        return NextResponse.json(
          { 
            error: 'Суудлын түгжээ дууссан эсвэл өөр хэрэглэгч түгжсэн байна',
            seat: `${seat.sectionName} - Эгнээ ${seat.row}, Суудал ${seat.seatNumber}`,
          },
          { status: 409 }
        );
      }
    }

    // Нийт үнэ тооцох
    const totalAmount = seats.reduce((sum, seat) => sum + seat.price, 0);

    // QR код үүсгэх (unique ID)
    const qrCode = nanoid(12);

    // Захиалга үүсгэх
    const booking = await prisma.booking.create({
      data: {
        userId,
        userEmail,
        userName,
        eventId,
        eventTitle,
        eventDate,
        venueId,
        venueName,
        totalAmount,
        qrCode,
        status: 'PENDING',
        seats: {
          create: seats.map(seat => ({
            sectionId: seat.sectionId,
            sectionName: seat.sectionName,
            row: seat.row,
            seatNumber: seat.seatNumber,
            price: seat.price,
          })),
        },
      },
      include: {
        seats: true,
      },
    });

    // RabbitMQ-руу мессеж илгээх (Notification Service-д)
    await publishMessage(ROUTING_KEYS.BOOKING_CREATED, {
      bookingId: booking.id,
      userId: booking.userId,
      userEmail: booking.userEmail,
      userName: booking.userName,
      eventId: booking.eventId,
      eventTitle: booking.eventTitle,
      eventDate: booking.eventDate.toISOString(),
      venueName: booking.venueName,
      seats: booking.seats.map((s) => ({
        sectionName: s.sectionName,
        row: s.row,
        seatNumber: s.seatNumber,
      })),
      totalAmount: booking.totalAmount,
    });

    return NextResponse.json(
      {
        message: 'Захиалга амжилттай үүсгэгдлээ',
        booking,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create booking error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json({ error: 'Захиалга үүсгэх амжилтгүй боллоо' }, { status: 500 });
  }
}
