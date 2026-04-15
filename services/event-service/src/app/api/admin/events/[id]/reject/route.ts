import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishMessage, ROUTING_KEYS } from '@/lib/rabbitmq';
import { z } from 'zod';
import { requireGatewaySignature } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

// Reject хүсэлтийн schema
const rejectSchema = z.object({
  reason: z.string().min(10, 'Шалтгаан хамгийн багадаа 10 тэмдэгт байх ёстой'),
});

// POST /api/admin/events/[id]/reject - Event татгалзах
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/admin/events/${params.id}/reject`);
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Админ эрх шаардлагатай' },
        { status: 403 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event олдсонгүй' },
        { status: 404 }
      );
    }

    if (event.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Event "${event.status}" төлөвтэй байна. Зөвхөн PENDING төлөвтэй event-ийг татгалзах боломжтой` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = rejectSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { reason } = validationResult.data;

    // Event-ийг DRAFT руу буцаах (organizer дахин засаж submit хийх боломжтой)
    const updatedEvent = await prisma.event.update({
      where: { id: params.id },
      data: {
        status: 'DRAFT',
        rejectionReason: reason,
        rejectedAt: new Date(),
        rejectedBy: userId,
      },
    });

    // RabbitMQ-аар notification илгээх (Notification Service хүлээн авна)
    await publishMessage(ROUTING_KEYS.EVENT_REJECTED, {
      eventId: event.id,
      organizerId: event.organizerId,
      eventTitle: event.title,
      reason,
    });

    return NextResponse.json({
      message: 'Event татгалзагдлаа',
      event: updatedEvent,
      reason,
    });
  } catch (error) {
    console.error('Reject event error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Event татгалзах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
