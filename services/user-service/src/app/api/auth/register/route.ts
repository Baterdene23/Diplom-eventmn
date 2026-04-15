import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateAccessToken, generateRefreshToken } from '@/lib/auth';
import { z } from 'zod';

// Бүртгэлийн validation schema
const registerSchema = z.object({
  email: z.string().email('И-мэйл хаяг буруу байна'),
  password: z.string().min(8, 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой'),
  firstName: z.string().min(1, 'Нэр оруулна уу'),
  lastName: z.string().min(1, 'Овог оруулна уу'),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, phone } = validationResult.data;

    // И-мэйл давхардаж байгаа эсэхийг шалгах
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Энэ и-мэйл хаягаар бүртгэлтэй хэрэглэгч байна' },
        { status: 409 }
      );
    }

    // Нууц үг hash хийх
    const hashedPassword = await hashPassword(password);

    // Хэрэглэгч үүсгэх
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    // Token үүсгэх
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Refresh token хадгалах
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 хоног
      },
    });

    return NextResponse.json(
      {
        message: 'Бүртгэл амжилттай',
        user,
        accessToken,
        refreshToken,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Бүртгэл амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
