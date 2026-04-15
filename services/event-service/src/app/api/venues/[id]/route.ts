import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGatewaySignature } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

// GET /api/venues/[id] - Venue дэлгэрэнгүй
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venue = await prisma.venue.findUnique({
      where: { id: params.id },
    });

    if (!venue) {
      return NextResponse.json(
        { error: 'Venue олдсонгүй' },
        { status: 404 }
      );
    }

    return NextResponse.json({ venue });
  } catch (error) {
    console.error('Get venue error:', error);
    return NextResponse.json(
      { error: 'Venue авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}

// PATCH /api/venues/[id] - Venue шинэчлэх
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/venues/${params.id}`);
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    const venue = await prisma.venue.findUnique({
      where: { id: params.id },
    });

    if (!venue) {
      return NextResponse.json(
        { error: 'Venue олдсонгүй' },
        { status: 404 }
      );
    }

    // Зөвхөн өөрийн venue эсвэл admin
    if (venue.createdBy !== userId && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Эрх хүрэхгүй байна' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updatedVenue = await prisma.venue.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json({
      message: 'Venue амжилттай шинэчлэгдлээ',
      venue: updatedVenue,
    });
  } catch (error) {
    console.error('Update venue error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Venue шинэчлэх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}

// DELETE /api/venues/[id] - Venue устгах
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireGatewaySignature(request, `/api/venues/${params.id}`);
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    const venue = await prisma.venue.findUnique({
      where: { id: params.id },
    });

    if (!venue) {
      return NextResponse.json(
        { error: 'Venue олдсонгүй' },
        { status: 404 }
      );
    }

    if (venue.createdBy !== userId && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Эрх хүрэхгүй байна' },
        { status: 403 }
      );
    }

    // Soft delete
    await prisma.venue.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      message: 'Venue амжилттай устгагдлаа',
    });
  } catch (error) {
    console.error('Delete venue error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Venue устгах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
