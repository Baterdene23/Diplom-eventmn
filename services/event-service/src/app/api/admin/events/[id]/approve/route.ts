import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishMessage, ROUTING_KEYS } from '@/lib/rabbitmq';
import { requireGatewaySignature } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

// POST /api/admin/events/[id]/approve - Event зөвшөөрөх
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/admin/events/${params.id}/approve`);
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
        { error: `Event "${event.status}" төлөвтэй байна. Зөвхөн PENDING төлөвтэй event-ийг зөвшөөрөх боломжтой` },
        { status: 400 }
      );
    }

    // Body-аас нэмэлт тохиргоо авах (featured болгох гэх мэт)
    const body = await request.json().catch(() => ({}));

    const updatedEvent = await prisma.event.update({
      where: { id: params.id },
      data: {
        status: 'PUBLISHED',
        ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
      },
    });

    // RabbitMQ-аар notification илгээх (Notification Service хүлээн авна)
    await publishMessage(ROUTING_KEYS.EVENT_APPROVED, {
      eventId: event.id,
      organizerId: event.organizerId,
      eventTitle: event.title,
    });

    return NextResponse.json({
      message: 'Event амжилттай зөвшөөрөгдлөө',
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Approve event error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Event зөвшөөрөх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
