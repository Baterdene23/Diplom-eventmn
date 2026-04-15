import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGatewaySignature } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/events - Admin: Pending event жагсаалт
export async function GET(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/admin/events');
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Админ эрх шаардлагатай' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'PENDING';

    const where: Record<string, any> = {};
    
    // status=all бол бүгдийг харуулна
    if (status !== 'all') {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [events, total, statusCounts] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
      prisma.event.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts: statusCounts.reduce((acc: Record<string, number>, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Admin get events error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Events авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
