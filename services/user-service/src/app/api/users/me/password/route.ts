import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, extractTokenFromHeader, hashPassword, verifyToken } from '@/lib/auth';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Одоогийн нууц үгээ оруулна уу'),
  newPassword: z.string().min(8, 'Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой'),
});

// PATCH /api/users/me/password - Нууц үг солих
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token буруу эсвэл хугацаа дууссан' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = changePasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validationResult.data;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Хэрэглэгч олдсонгүй' },
        { status: 404 }
      );
    }

    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Одоогийн нууц үг буруу байна' },
        { status: 400 }
      );
    }

    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'Шинэ нууц үг өмнөх нууц үгтэй ижил байна' },
        { status: 400 }
      );
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        password: hashedNewPassword,
      },
    });

    // Existing refresh token-уудыг хүчингүй болгох
    await prisma.refreshToken.deleteMany({
      where: { userId: payload.userId },
    });

    await prisma.userActivityLog.create({
      data: {
        userId: payload.userId,
        action: 'PASSWORD_CHANGE',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      message: 'Нууц үг амжилттай солигдлоо. Дахин нэвтэрнэ үү.',
      requireReLogin: true,
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Нууц үг солих амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
