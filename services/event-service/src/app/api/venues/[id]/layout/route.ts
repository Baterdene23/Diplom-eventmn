import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGatewaySignature } from '@/lib/internal-auth';
import { validateSeatLayoutJson } from '@/lib/layout';

export const dynamic = 'force-dynamic';

// GET /api/venues/[id]/layout - Venue layout авах
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venue = await prisma.venue.findUnique({
      where: { id: params.id },
      select: { id: true, layoutType: true, layoutJson: true },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue олдсонгүй' }, { status: 404 });
    }

    return NextResponse.json({
      venueId: venue.id,
      layoutType: venue.layoutType,
      layoutJson: venue.layoutJson,
    });
  } catch (error) {
    console.error('Get venue layout error:', error);
    return NextResponse.json({ error: 'Venue layout авах амжилтгүй боллоо' }, { status: 500 });
  }
}

// PUT /api/venues/[id]/layout - Venue layout шинэчлэх (ADMIN/OWNER)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/venues/${params.id}/layout`);
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Нэвтрэх шаардлагатай' }, { status: 401 });
    }

    const venue = await prisma.venue.findUnique({
      where: { id: params.id },
      select: { id: true, createdBy: true },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue олдсонгүй' }, { status: 404 });
    }

    if (venue.createdBy !== userId && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Эрх хүрэхгүй байна' }, { status: 403 });
    }

    const body = await request.json();
    const layoutType = String(body?.layoutType || '').toUpperCase();
    const layoutJson = body?.layoutJson;

    if (!layoutType) {
      return NextResponse.json({ error: 'layoutType шаардлагатай' }, { status: 400 });
    }

    const res = validateSeatLayoutJson(layoutJson);
    if (!res.ok) {
      return NextResponse.json({ error: 'layoutJson буруу байна', details: res.error }, { status: 400 });
    }
    if (res.layout.layoutType !== layoutType) {
      return NextResponse.json(
        { error: `layoutType (${layoutType}) ба layoutJson.layoutType (${res.layout.layoutType}) зөрж байна` },
        { status: 400 }
      );
    }

    const updated = await prisma.venue.update({
      where: { id: params.id },
      data: {
        layoutType: layoutType as any,
        layoutJson: res.layout as any,
      },
      select: { id: true, layoutType: true, layoutJson: true },
    });

    return NextResponse.json({ message: 'Venue layout хадгалагдлаа', venue: updated });
  } catch (error) {
    console.error('Update venue layout error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json({ error: 'Venue layout хадгалах амжилтгүй боллоо' }, { status: 500 });
  }
}
