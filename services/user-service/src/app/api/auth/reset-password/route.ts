import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, hashPassword } from '@/lib/auth';
import { verifyOtp } from '@/lib/otp';
import { OtpType } from '@prisma/client';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  email: z.string().email('И-мэйл хаяг буруу байна'),
  code: z.string().length(6, 'OTP код 6 оронтой байх ёстой'),
  newPassword: z.string().min(8, 'Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой'),
});

// POST /api/auth/reset-password - OTP ашиглан нууц үг солих (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, code, newPassword } = validationResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true, isActive: true },
    });

    // Prevent account enumeration
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Код буруу эсвэл хугацаа дууссан' },
        { status: 400 }
      );
    }

    const otpResult = await verifyOtp(user.id, code, 'PASSWORD_RESET' as OtpType);
    if (!otpResult.success) {
      return NextResponse.json(
        { error: otpResult.error || 'Код буруу эсвэл хугацаа дууссан' },
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

    const hashed = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    // Invalidate sessions
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.userActivityLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      message: 'Нууц үг амжилттай солигдлоо. Одоо нэвтэрнэ үү.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Нууц үг солих амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
