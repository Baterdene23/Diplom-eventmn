import { NextRequest, NextResponse } from 'next/server';
import { requireGatewaySignature } from '@/lib/internal-auth';
import { prisma } from '@/lib/prisma';

// POST /api/auth/logout - Гарах
export async function POST(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/auth/logout');
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    // JWT stateless учир сервер талд юу ч хийх шаардлагагүй
    // Client талд token устгах хэрэгтэй
    // Хэрэв token blacklist хийх бол Redis ашиглаж болно (одоогоор хийгдээгүй)

    await prisma.userActivityLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      message: 'Амжилттай гарлаа',
    });
  } catch (error) {
    console.error('Logout error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Гарах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
