import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGatewaySignature } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

// POST /api/admin/broadcast - Бүх хэрэглэгчдэд мэдэгдэл илгээх (Admin only)
export async function POST(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/admin/broadcast');
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Зөвхөн админ энэ үйлдлийг хийх боломжтой' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, message, userIds, type = 'SYSTEM' } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Гарчиг болон мессеж шаардлагатай' },
        { status: 400 }
      );
    }

    // Хэрэв userIds байвал зөвхөн тэдэнд илгээх
    // Байхгүй бол бүх хэрэглэгчдэд илгээх (userIds-г gateway-аас авах эсвэл user-service-ээс query хийнэ)
    if (userIds && userIds.length > 0) {
      // Тодорхой хэрэглэгчдэд илгээх
      const notifications = userIds.map((userId: string) => ({
        userId,
        type,
        title,
        message,
        isRead: false,
        emailSent: false,
      }));

      await prisma.notification.createMany({
        data: notifications,
      });

      return NextResponse.json({
        message: `${userIds.length} хэрэглэгчид мэдэгдэл амжилттай илгээгдлээ`,
        count: userIds.length,
      });
    } else {
      // Бүх хэрэглэгчдэд илгээх - энэ нь broadcast мэдэгдэл
      // Энд бид "all" гэсэн тусгай userId ашиглана (frontend дээр шүүнэ)
      // Эсвэл user-service-ээс бүх хэрэглэгчийн ID авч болно
      
      const notification = await prisma.notification.create({
        data: {
          userId: 'broadcast',
          type,
          title,
          message,
          data: { isBroadcast: true },
          isRead: false,
          emailSent: false,
        },
      });

      return NextResponse.json({
        message: 'Broadcast мэдэгдэл амжилттай үүсгэгдлээ',
        notification,
      });
    }
  } catch (error) {
    console.error('Broadcast notification error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Мэдэгдэл илгээх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
