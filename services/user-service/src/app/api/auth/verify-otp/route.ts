import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader, generateAccessToken, generateRefreshToken } from '@/lib/auth';
import { verifyOtp } from '@/lib/otp';
import { OtpType } from '@prisma/client';
import { z } from 'zod';

// OTP баталгаажуулах schema
const verifyOtpSchema = z.object({
  code: z.string().length(6, 'OTP код 6 оронтой байх ёстой'),
  type: z.enum(['EMAIL_VERIFY', 'PHONE_VERIFY', 'PASSWORD_RESET', 'BECOME_ORGANIZER']),
});

// POST /api/auth/verify-otp - OTP баталгаажуулах
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
    const validationResult = verifyOtpSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { code, type } = validationResult.data;

    // OTP шалгах
    const otpResult = await verifyOtp(payload.userId, code, type as OtpType);

    if (!otpResult.success) {
      return NextResponse.json(
        { error: otpResult.error },
        { status: 400 }
      );
    }

    // OTP төрлөөс хамааран үйлдэл хийх
    let responseData: Record<string, unknown> = { message: 'Баталгаажуулалт амжилттай' };

    switch (type) {
      case 'EMAIL_VERIFY':
        await prisma.user.update({
          where: { id: payload.userId },
          data: { isVerified: true },
        });
        responseData.message = 'И-мэйл амжилттай баталгаажлаа';
        break;

      case 'BECOME_ORGANIZER':
        // Хэрэглэгчийн role-ийг ORGANIZER болгох
        const updatedUser = await prisma.user.update({
          where: { id: payload.userId },
          data: { role: 'ORGANIZER' },
          select: {
            id: true,
            email: true,
            role: true,
          },
        });

        // Organizer profile-ийг verified болгох
        await prisma.organizerProfile.update({
          where: { userId: payload.userId },
          data: {
            isVerified: true,
            verifiedAt: new Date(),
          },
        });

        // Шинэ token үүсгэх (role өөрчлөгдсөн учир)
        const newTokenPayload = {
          userId: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
        };

        const newAccessToken = generateAccessToken(newTokenPayload);
        const newRefreshToken = generateRefreshToken(newTokenPayload);

        // Хуучин refresh token-уудыг устгах
        await prisma.refreshToken.deleteMany({
          where: { userId: payload.userId },
        });

        // Шинэ refresh token хадгалах
        await prisma.refreshToken.create({
          data: {
            userId: payload.userId,
            token: newRefreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        // Activity log
        await prisma.userActivityLog.create({
          data: {
            userId: payload.userId,
            action: 'ROLE_CHANGE',
            details: { from: 'USER', to: 'ORGANIZER' },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            userAgent: request.headers.get('user-agent'),
          },
        });

        responseData = {
          message: 'Та амжилттай зохион байгуулагч боллоо!',
          user: updatedUser,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        };
        break;

      case 'PASSWORD_RESET':
        // Password reset flow - клиент талдаа шинэ нууц үг оруулах form харуулна
        responseData.message = 'OTP баталгаажлаа. Шинэ нууц үгээ оруулна уу';
        responseData.canResetPassword = true;
        break;

      default:
        break;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Баталгаажуулах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
