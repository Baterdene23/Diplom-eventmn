import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { createOtp, sendOtpEmail } from '@/lib/otp';
import { z } from 'zod';

// Зохион байгуулагч болох хүсэлтийн schema
const becomeOrganizerSchema = z.object({
  organizationName: z.string().min(2, 'Байгууллагын нэр хамгийн багадаа 2 тэмдэгт байх ёстой'),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
});

// POST /api/auth/become-organizer - Зохион байгуулагч болох хүсэлт илгээх
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

    // Хэрэглэгчийн мэдээлэл авах
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        organizerProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Хэрэглэгч олдсонгүй' },
        { status: 404 }
      );
    }

    // Аль хэдийн ORGANIZER эсвэл ADMIN бол
    if (user.role === 'ORGANIZER' || user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Та аль хэдийн зохион байгуулагч эрхтэй байна' },
        { status: 400 }
      );
    }

    // Аль хэдийн хүсэлт илгээсэн бол (profile үүссэн, баталгаажаагүй)
    if (user.organizerProfile && !user.organizerProfile.isVerified) {
      return NextResponse.json(
        { error: 'Та аль хэдийн хүсэлт илгээсэн байна. OTP кодоо оруулна уу' },
        { status: 400 }
      );
    }

    // Request body шалгах
    const body = await request.json();
    const validationResult = becomeOrganizerSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { organizationName, description, website } = validationResult.data;

    // OrganizerProfile үүсгэх (баталгаажаагүй)
    await prisma.organizerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        organizationName,
        description: description || null,
        website: website || null,
      },
      update: {
        organizationName,
        description: description || null,
        website: website || null,
      },
    });

    // OTP үүсгэх ба илгээх
    const { code, expiresAt } = await createOtp(
      user.id,
      'BECOME_ORGANIZER',
      user.email
    );

    // И-мэйл илгээх
    const sent = await sendOtpEmail(user.email, code, 'BECOME_ORGANIZER');
    if (!sent) {
      return NextResponse.json(
        { error: 'OTP илгээх үйлчилгээ түр ажиллахгүй байна. Дараа дахин оролдоно уу' },
        { status: 502 }
      );
    }

    // Activity log
    await prisma.userActivityLog.create({
      data: {
        userId: user.id,
        action: 'BECOME_ORGANIZER_REQUESTED',
        details: { organizationName },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      message: 'Баталгаажуулах код илгээгдлээ',
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
      expiresAt,
    });
  } catch (error) {
    console.error('Become organizer error:', error);
    return NextResponse.json(
      { error: 'Хүсэлт илгээх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
