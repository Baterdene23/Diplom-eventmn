import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOtp, sendOtpEmail } from '@/lib/otp';
import { OtpType } from '@prisma/client';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('И-мэйл хаяг буруу байна'),
});

// POST /api/auth/forgot-password - Password reset OTP илгээх
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Prevent account enumeration: always respond 200.
    const genericResponse = NextResponse.json({
      message: 'Хэрэв энэ и-мэйл бүртгэлтэй бол сэргээх код илгээгдэнэ',
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return genericResponse;
    }

    const { code } = await createOtp(user.id, 'PASSWORD_RESET' as OtpType, user.email);
    await sendOtpEmail(user.email, code, 'PASSWORD_RESET' as OtpType);

    return genericResponse;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Код илгээх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
