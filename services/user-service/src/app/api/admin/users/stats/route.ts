import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGatewaySignature } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/users/stats - Admin: user статистик (counts)
export async function GET(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/admin/users/stats');
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Зөвхөн админ энэ үйлдлийг хийх боломжтой' },
        { status: 403 }
      );
    }

    const [totalUsers, activeUsers, roleCounts] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      roleCounts: roleCounts.reduce((acc: Record<string, number>, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Get admin user stats error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Хэрэглэгчийн статистик авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
