import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishMessage, ROUTING_KEYS } from '@/lib/rabbitmq';
import { requireGatewaySignature } from '@/lib/internal-auth';

// GET /api/bookings/[id] - Захиалгын дэлгэрэнгүй
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/bookings/${params.id}`);
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

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    return NextResponse.json(
      { error: 'Захиалга авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}

// PATCH /api/bookings/[id] - Захиалга шинэчлэх (төлбөр баталгаажуулах)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/bookings/${params.id}`);
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

    const body = await request.json();
    const { status, paymentId, paymentMethod } = body;

    // Safety: this endpoint should not be used to cancel bookings (use /cancel to include refund policy)
    if (status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Цуцлалт хийх бол /api/bookings/[id]/cancel endpoint ашиглана уу' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
      if (status === 'CONFIRMED') {
        updateData.paidAt = new Date();
      }
    }

    if (paymentId) updateData.paymentId = paymentId;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: updateData,
      include: { seats: true },
    });

    // Статус өөрчлөгдсөн үед RabbitMQ-руу мессеж илгээх
    if (status === 'CONFIRMED' && booking.status !== 'CONFIRMED') {
      await publishMessage(ROUTING_KEYS.BOOKING_CONFIRMED, {
        bookingId: booking.id,
        userId: booking.userId,
        userEmail: booking.userEmail,
        userName: booking.userName,
        eventTitle: booking.eventTitle,
        eventDate: booking.eventDate.toISOString(),
        venueName: booking.venueName,
        seats: booking.seats.map((s) => ({
          sectionName: s.sectionName,
          row: s.row,
          seatNumber: s.seatNumber,
        })),
        totalAmount: booking.totalAmount,
        qrCode: booking.qrCode,
      });
    }

    // Note: cancellation notifications/refund are handled in /api/bookings/[id]/cancel

    return NextResponse.json({
      message: 'Захиалга амжилттай шинэчлэгдлээ',
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json(
      { error: 'Захиалга шинэчлэх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/[id] - Захиалга цуцлах (deprecated - use /cancel)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/bookings/${params.id}`);
    return NextResponse.json(
      { error: 'Deprecated endpoint. /api/bookings/[id]/cancel ашиглана уу' },
      { status: 410 }
    );
  } catch (error) {
    console.error('Cancel booking error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json({ error: 'Захиалга цуцлах амжилтгүй боллоо' }, { status: 500 });
  }
}
