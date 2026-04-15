import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGatewaySignature } from '@/lib/internal-auth';

// GET /api/bookings/event/[eventId] - Тухайн эвентийн бүх захиалгууд (оролцогчид)
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    requireGatewaySignature(request, `/api/bookings/event/${params.eventId}`);
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    // Зөвхөн зохион байгуулагч эсвэл админ оролцогчдын мэдээлэл харах эрхтэй
    if (userRole !== 'ORGANIZER' && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Зөвхөн зохион байгуулагч эсвэл админ энэ мэдээллийг харах боломжтой' },
        { status: 403 }
      );
    }

    const { eventId } = params;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID шаардлагатай' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    const where: any = {
      eventId,
    };

    // Зөвхөн confirmed буюу баталгаажсан захиалгууд (default)
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

    // Оролцогчдын мэдээллийг хялбаршуулан буцаах
    const participants = bookings.map((booking) => ({
      id: booking.id,
      userName: booking.userName,
      userEmail: booking.userEmail,
      userId: booking.userId,
      status: booking.status,
      totalAmount: booking.totalAmount,
      qrCode: booking.qrCode,
      seats: booking.seats.map((seat) => ({
        sectionName: seat.sectionName,
        row: seat.row,
        seatNumber: seat.seatNumber,
        price: seat.price,
      })),
      seatCount: booking.seats.length,
      createdAt: booking.createdAt,
    }));

    return NextResponse.json({
      eventId,
      participants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get event participants error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Оролцогчдын жагсаалт авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
