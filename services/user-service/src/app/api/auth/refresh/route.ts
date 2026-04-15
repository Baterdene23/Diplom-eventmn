import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, generateAccessToken, generateRefreshToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token шаардлагатай' },
        { status: 400 }
      );
    }

    // Token-ийг database-аас хайх
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      return NextResponse.json(
        { error: 'Refresh token буруу байна' },
        { status: 401 }
      );
    }

    // Token хугацаа дууссан эсэх
    if (storedToken.expiresAt < new Date()) {
      // Хуучин token устгах
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      return NextResponse.json(
        { error: 'Refresh token хугацаа дууссан' },
        { status: 401 }
      );
    }

    // JWT signature шалгах
    const payload = verifyToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: 'Refresh token буруу байна' },
        { status: 401 }
      );
    }

    const user = storedToken.user;

    // Шинэ token үүсгэх
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Хуучин token устгаж шинийг хадгалах (rotation)
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Token сэргээх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
