import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGatewaySignature } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/events/stats - Admin: event статистик (counts)
export async function GET(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/admin/events/stats');
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Админ эрх шаардлагатай' },
        { status: 403 }
      );
    }

    const [totalEvents, statusCounts] = await Promise.all([
      prisma.event.count(),
      prisma.event.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    return NextResponse.json({
      totalEvents,
      statusCounts: statusCounts.reduce((acc: Record<string, number>, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Get admin event stats error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Эвентийн статистик авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
