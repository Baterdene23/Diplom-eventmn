import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGatewaySignature } from '@/lib/internal-auth';
import { publishMessage, ROUTING_KEYS } from '@/lib/rabbitmq';

export const dynamic = 'force-dynamic';

// POST /api/events/[id]/cancel - Event цуцлах
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/events/${params.id}/cancel`);
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Нэвтрэх шаардлагатай' }, { status: 401 });
    }

    const event = await prisma.event.findUnique({ where: { id: params.id } });
    if (!event) {
      return NextResponse.json({ error: 'Event олдсонгүй' }, { status: 404 });
    }

    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Эрх хүрэхгүй байна' }, { status: 403 });
    }

    if (event.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Event аль хэдийн цуцлагдсан байна' }, { status: 400 });
    }

    // BR-E04: only cancel >= 24h before start
    const startMs = new Date(event.startDate).getTime();
    const msUntilStart = startMs - Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    if (msUntilStart < twentyFourHoursMs) {
      return NextResponse.json(
        { error: 'Эвент эхлэхээс 24 цагийн өмнө л цуцлах боломжтой' },
        { status: 400 }
      );
    }

    const cancelled = await prisma.event.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    });

    await publishMessage(ROUTING_KEYS.EVENT_CANCELLED, {
      eventId: cancelled.id,
      organizerId: cancelled.organizerId,
      eventTitle: cancelled.title,
      startDate: cancelled.startDate?.toISOString?.() || null,
      cancelledAt: new Date().toISOString(),
      cancelledBy: userId,
      cancelledByRole: userRole,
    });

    return NextResponse.json({ message: 'Event амжилттай цуцлагдлаа', event: cancelled });
  } catch (error) {
    console.error('Cancel event error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json({ error: 'Event цуцлах амжилтгүй боллоо' }, { status: 500 });
  }
}
