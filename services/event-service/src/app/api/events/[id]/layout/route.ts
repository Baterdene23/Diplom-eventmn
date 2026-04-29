import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/events/[id]/layout - Event layout авах (snapshot: event.layoutJson)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true, layoutType: true, layoutJson: true, venueId: true },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event олдсонгүй' }, { status: 404 });
    }

    // Prefer event snapshot; if missing, fallback to venue layout for backward compatibility
    if (!event.layoutJson && event.venueId) {
      const venue = await prisma.venue.findUnique({
        where: { id: event.venueId },
        select: { layoutType: true, layoutJson: true },
      });
      return NextResponse.json({
        eventId: event.id,
        layoutType: venue?.layoutType || event.layoutType,
        layoutJson: venue?.layoutJson || null,
        source: 'venue',
      });
    }

    return NextResponse.json({
      eventId: event.id,
      layoutType: event.layoutType,
      layoutJson: event.layoutJson,
      source: 'event',
    });
  } catch (error) {
    console.error('Get event layout error:', error);
    return NextResponse.json({ error: 'Event layout авах амжилтгүй боллоо' }, { status: 500 });
  }
}
