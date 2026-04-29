import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGatewaySignature } from '@/lib/internal-auth';
import { publishMessage, ROUTING_KEYS } from '@/lib/rabbitmq';
import { LayoutTypeEnum, validateEventCategoryLayoutType, validateSeatLayoutJson } from '@/lib/layout';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const patchEventSchema = z
  .object({
    layoutType: LayoutTypeEnum.optional(),
    layoutJson: z.custom<import('@prisma/client').Prisma.InputJsonValue>().optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    if (data.layoutJson) {
      const res = validateSeatLayoutJson(data.layoutJson);
      if (!res.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'layoutJson буруу байна',
          path: ['layoutJson'],
        });
      }
    }
  });

// GET /api/events/[id] - Event дэлгэрэнгүй
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event олдсонгүй' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json(
      { error: 'Event авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}

// PATCH /api/events/[id] - Event шинэчлэх
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/events/${params.id}`);
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
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

    // Зөвхөн өөрийн event эсвэл admin
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Эрх хүрэхгүй байна' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const validationResult = patchEventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Enforce category-layout compatibility when layoutType is changed
    if (validationResult.data.layoutType) {
      const ok = validateEventCategoryLayoutType(event.category, validationResult.data.layoutType);
      if (!ok.ok) {
        return NextResponse.json({ error: ok.message }, { status: 400 });
      }
    }

    // Admin-ий status шинэчлэх эрх
    if (validationResult.data.status && userRole !== 'ADMIN') {
      delete (validationResult.data as any).status;
    }

    // Published эвентэд organizer засвар хийхийг хориглох (business rule)
    if (event.status === 'PUBLISHED' && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Нийтлэгдсэн эвентэд засвар хийх боломжгүй' },
        { status: 400 }
      );
    }

    const updatedEvent = await prisma.event.update({
      where: { id: params.id },
      data: validationResult.data,
    });

    // Publish best-effort update event for downstream notifications/audit.
    // Do not include full body; only a safe/high-level payload.
    await publishMessage(ROUTING_KEYS.EVENT_UPDATED, {
      eventId: updatedEvent.id,
      organizerId: updatedEvent.organizerId,
      eventTitle: updatedEvent.title,
      status: updatedEvent.status,
      startDate: updatedEvent.startDate?.toISOString?.() || null,
      endDate: updatedEvent.endDate?.toISOString?.() || null,
      updatedAt: updatedEvent.updatedAt?.toISOString?.() || new Date().toISOString(),
      updatedBy: userId,
      updatedByRole: userRole,
    });

    return NextResponse.json({
      message: 'Event амжилттай шинэчлэгдлээ',
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Update event error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Event шинэчлэх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id] - Event устгах (зөвхөн DRAFT)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/events/${params.id}`);
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
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

    // Зөвхөн өөрийн event эсвэл admin
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Эрх хүрэхгүй байна' },
        { status: 403 }
      );
    }

    // FR-E06: only DRAFT events can be deleted
    if (event.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Зөвхөн DRAFT төлөвтэй эвентийн устгах боломжтой. Цуцлах бол /cancel ашиглана уу.' },
        { status: 400 }
      );
    }

    await prisma.event.delete({ where: { id: params.id } });

    return NextResponse.json({
      message: 'Event амжилттай устгагдлаа',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Event устгах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
