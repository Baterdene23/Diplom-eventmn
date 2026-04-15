import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishMessage, ROUTING_KEYS } from '@/lib/rabbitmq';
import { z } from 'zod';
import { requireGatewaySignature } from '@/lib/internal-auth';
import { calculateRefundAmount } from '@/lib/refund';

// Цуцлах хүсэлтийн schema
const cancelBookingSchema = z.object({
  reason: z.string().optional(),
  requestRefund: z.boolean().default(true),
});

// POST /api/bookings/[id]/cancel - Захиалга цуцлах (refund-тай)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/bookings/${params.id}/cancel`);
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

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

    // Зөвхөн өөрийн захиалга эсвэл admin
    if (booking.userId !== userId && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Эрх хүрэхгүй байна' },
        { status: 403 }
      );
    }

    // Аль хэдийн цуцлагдсан бол
    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Захиалга аль хэдийн цуцлагдсан байна' },
        { status: 400 }
      );
    }

    // Эвент дууссан бол цуцлах боломжгүй
    if (booking.status === 'EXPIRED') {
      return NextResponse.json(
        { error: 'Хугацаа дууссан захиалгыг цуцлах боломжгүй' },
        { status: 400 }
      );
    }

    if (new Date(booking.eventDate).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Дууссан арга хэмжээний захиалгыг цуцлах боломжгүй' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = cancelBookingSchema.safeParse(body);
    
    const { reason, requestRefund } = validationResult.success 
      ? validationResult.data 
      : { reason: undefined, requestRefund: true };

    // Refund тооцоолох
    const refundInfo = calculateRefundAmount({
      totalAmount: booking.totalAmount,
      eventDate: booking.eventDate,
      bookingStatus: booking.status,
    });

    // Захиалга цуцлах
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
      },
      include: { seats: true },
    });

    // Payment gateway integration is out of scope for current release.

    // RabbitMQ-руу мессеж илгээх (Notification Service хүлээн авна)
    await publishMessage(ROUTING_KEYS.BOOKING_CANCELLED, {
      bookingId: booking.id,
      userId: booking.userId,
      userEmail: booking.userEmail,
      userName: booking.userName,
      eventTitle: booking.eventTitle,
      refundInfo,
      reason,
    });

    return NextResponse.json({
      message: 'Захиалга амжилттай цуцлагдлаа',
      booking: updatedBooking,
      refund: requestRefund ? refundInfo : null,
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return NextResponse.json(
      { error: 'Захиалга цуцлах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}

// GET /api/bookings/[id]/cancel - Refund мэдээлэл авах (preview)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/bookings/${params.id}/cancel`);
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Захиалга олдсонгүй' },
        { status: 404 }
      );
    }

    if (booking.userId !== userId && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Эрх хүрэхгүй байна' },
        { status: 403 }
      );
    }

    const refundInfo = calculateRefundAmount({
      totalAmount: booking.totalAmount,
      eventDate: booking.eventDate,
      bookingStatus: booking.status,
    });

    return NextResponse.json({
      bookingId: booking.id,
      totalAmount: booking.totalAmount,
      refund: refundInfo,
      canCancel: booking.status !== 'CANCELLED' && booking.status !== 'EXPIRED',
    });
  } catch (error) {
    console.error('Get refund info error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json({ error: 'Refund мэдээлэл авах амжилтгүй боллоо' }, { status: 500 });
  }
}
