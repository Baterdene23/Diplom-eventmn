import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/lib/auth';
import { z } from 'zod';
import { getRedisClient } from '@/lib/redis';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_SECONDS = 15 * 60;

// Нэвтрэх validation schema
const loginSchema = z.object({
  email: z.string().email('И-мэйл хаяг буруу байна'),
  password: z.string().min(1, 'Нууц үг оруулна уу'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    const emailKey = email.trim().toLowerCase();
    const failKey = `auth:login:fail:${emailKey}`;
    const lockKey = `auth:login:lock:${emailKey}`;

    // Lockout check (best-effort; fail open if Redis unavailable)
    try {
      const redis = getRedisClient();
      const ttl = await redis.ttl(lockKey);
      if (ttl > 0) {
        return NextResponse.json(
          {
            error: 'Хэт олон удаа буруу оролдлого. Түр хүлээгээд дахин оролдоно уу',
            remainingSeconds: ttl,
          },
          { status: 429 }
        );
      }
    } catch {
      // ignore
    }

    // Хэрэглэгч хайх
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      try {
        const redis = getRedisClient();
        const count = await redis.incr(failKey);
        if (count === 1) await redis.expire(failKey, LOGIN_LOCK_SECONDS);
        if (count >= MAX_FAILED_LOGIN_ATTEMPTS) {
          await redis.set(lockKey, '1', 'EX', LOGIN_LOCK_SECONDS);
          await redis.del(failKey);
          return NextResponse.json(
            {
              error: 'Хэт олон удаа буруу оролдлого. 15 минутын дараа дахин оролдоно уу',
              remainingSeconds: LOGIN_LOCK_SECONDS,
            },
            { status: 429 }
          );
        }
      } catch {
        // ignore
      }

      return NextResponse.json(
        { error: 'И-мэйл эсвэл нууц үг буруу байна' },
        { status: 401 }
      );
    }

    // Идэвхгүй хэрэглэгч
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Таны бүртгэл идэвхгүй байна' },
        { status: 403 }
      );
    }

    // Нууц үг шалгах
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      try {
        const redis = getRedisClient();
        const count = await redis.incr(failKey);
        if (count === 1) await redis.expire(failKey, LOGIN_LOCK_SECONDS);
        if (count >= MAX_FAILED_LOGIN_ATTEMPTS) {
          await redis.set(lockKey, '1', 'EX', LOGIN_LOCK_SECONDS);
          await redis.del(failKey);
          return NextResponse.json(
            {
              error: 'Хэт олон удаа буруу оролдлого. 15 минутын дараа дахин оролдоно уу',
              remainingSeconds: LOGIN_LOCK_SECONDS,
            },
            { status: 429 }
          );
        }
      } catch {
        // ignore
      }

      return NextResponse.json(
        { error: 'И-мэйл эсвэл нууц үг буруу байна' },
        { status: 401 }
      );
    }

    // Success => clear lockout counters (best-effort)
    try {
      const redis = getRedisClient();
      await redis.del(failKey, lockKey);
    } catch {
      // ignore
    }

    // Token үүсгэх
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Хуучин refresh token-уудыг устгах (optional - security)
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    // Шинэ refresh token хадгалах
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Activity log
    await prisma.userActivityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: { method: 'password' },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      message: 'Нэвтрэлт амжилттай',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Нэвтрэлт амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
