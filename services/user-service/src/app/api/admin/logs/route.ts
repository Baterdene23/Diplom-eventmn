import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGatewaySignature } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

type Severity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
type Category = 'USER' | 'EVENT' | 'BOOKING' | 'VENUE' | 'PAYMENT' | 'SYSTEM' | 'AUTH';

function severityFromAction(action: string): Severity {
  const a = (action || '').toUpperCase();
  if (a.includes('CRITICAL')) return 'CRITICAL';
  if (a.includes('ERROR') || a.includes('FAIL')) return 'ERROR';
  if (a.includes('WARN')) return 'WARNING';
  return 'INFO';
}

function categoryFromAction(action: string): Category {
  const a = (action || '').toUpperCase();
  if (a.includes('AUTH') || a.includes('LOGIN') || a.includes('LOGOUT') || a.includes('OTP') || a.includes('PASSWORD')) {
    return 'AUTH';
  }
  if (a.includes('USER')) return 'USER';
  return 'SYSTEM';
}

// GET /api/admin/logs - Audit / activity logs (Admin only)
export async function GET(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/admin/logs');

    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Зөвхөн админ энэ үйлдлийг хийх боломжтой' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    const search = (searchParams.get('search') || '').trim();
    const action = (searchParams.get('action') || '').trim();
    const actorUserId = (searchParams.get('userId') || '').trim();
    const dateFrom = (searchParams.get('dateFrom') || '').trim();
    const dateTo = (searchParams.get('dateTo') || '').trim();

    const where: any = {};
    if (actorUserId) where.userId = actorUserId;
    if (action) where.action = { contains: action, mode: 'insensitive' };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.userActivityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userActivityLog.count({ where }),
    ]);

    const logs = items.map((l) => {
      const severity = severityFromAction(l.action);
      const category = categoryFromAction(l.action);
      const userName = [l.user?.firstName, l.user?.lastName].filter(Boolean).join(' ').trim() || l.user?.email;
      const details: any = l.details ?? {};
      const description = (details?.description || details?.message || l.action || '').toString();
      return {
        id: l.id,
        action: l.action,
        category,
        severity,
        description,
        userId: l.userId,
        userName: userName || undefined,
        userRole: l.user?.role || undefined,
        targetId: details?.targetId,
        targetType: details?.targetType,
        ipAddress: l.ipAddress || '-',
        userAgent: l.userAgent || '-',
        metadata: details,
        createdAt: l.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get admin logs error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json({ error: 'Аудит лог авах амжилтгүй боллоо' }, { status: 500 });
  }
}
