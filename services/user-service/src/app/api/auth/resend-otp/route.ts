import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { createOtp, sendOtpEmail, sendOtpSms } from '@/lib/otp';
import { OtpType } from '@prisma/client';
import { z } from 'zod';

// Rate limiting: 60 секундэд 1 удаа л дахин илгээх боломжтой
const RESEND_COOLDOWN_SECONDS = 60;

// Resend OTP schema
const resendOtpSchema = z.object({
  type: z.enum(['EMAIL_VERIFY', 'PHONE_VERIFY', 'PASSWORD_RESET', 'BECOME_ORGANIZER']),
});

// POST /api/auth/resend-otp - OTP дахин илгээх
export async function POST(request: NextRequest) {
  try {
    // Token шалгах
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

    // Request body шалгах
    const body = await request.json();
    const validationResult = resendOtpSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { type } = validationResult.data;

    // Хэрэглэгчийн мэдээлэл авах
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Хэрэглэгч олдсонгүй' },
        { status: 404 }
      );
    }

    // Сүүлийн OTP-ийг шалгах (rate limiting)
    const lastOtp = await prisma.userOtp.findFirst({
      where: {
        userId: user.id,
        type: type as OtpType,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (lastOtp) {
      const secondsSinceLastOtp = Math.floor(
        (Date.now() - lastOtp.createdAt.getTime()) / 1000
      );

      if (secondsSinceLastOtp < RESEND_COOLDOWN_SECONDS) {
        const remainingSeconds = RESEND_COOLDOWN_SECONDS - secondsSinceLastOtp;
        return NextResponse.json(
          { 
            error: `${remainingSeconds} секундын дараа дахин оролдоно уу`,
            remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    // Target (email эсвэл phone) тодорхойлох
    let target: string;
    let sendMethod: 'email' | 'sms';

    switch (type) {
      case 'EMAIL_VERIFY':
      case 'PASSWORD_RESET':
      case 'BECOME_ORGANIZER':
        target = user.email;
        sendMethod = 'email';
        break;
      case 'PHONE_VERIFY':
        if (!user.phone) {
          return NextResponse.json(
            { error: 'Утасны дугаар бүртгээгүй байна' },
            { status: 400 }
          );
        }
        target = user.phone;
        sendMethod = 'sms';
        break;
      default:
        return NextResponse.json(
          { error: 'Буруу OTP төрөл' },
          { status: 400 }
        );
    }

    // Шинэ OTP үүсгэх
    const { code, expiresAt } = await createOtp(user.id, type as OtpType, target);

    // Илгээх
    let sent = false;
    if (sendMethod === 'email') {
      sent = await sendOtpEmail(target, code, type as OtpType);
    } else {
      sent = await sendOtpSms(target, code, type as OtpType);
    }

    if (!sent) {
      return NextResponse.json(
        { error: 'OTP илгээх үйлчилгээ түр ажиллахгүй байна. Дараа дахин оролдоно уу' },
        { status: 502 }
      );
    }

    // Mask target for response
    const maskedTarget = sendMethod === 'email'
      ? target.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      : target.replace(/(\d{2})(\d+)(\d{2})/, '$1****$3');

    return NextResponse.json({
      message: 'Шинэ код амжилттай илгээгдлээ',
      target: maskedTarget,
      expiresAt,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { error: 'Код дахин илгээх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
