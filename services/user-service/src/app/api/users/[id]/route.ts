import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

// GET /api/users/[id] - Хэрэглэгчийн мэдээлэл авах (Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Admin эсвэл өөрийн мэдээлэл
    if (payload.role !== 'ADMIN' && payload.userId !== params.id) {
      return NextResponse.json(
        { error: 'Эрх хүрэхгүй байна' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Хэрэглэгч олдсонгүй' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user by id error:', error);
    return NextResponse.json(
      { error: 'Мэдээлэл авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Хэрэглэгчийн мэдээлэл шинэчлэх (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Зөвхөн админ энэ үйлдлийг хийх боломжтой' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role, isActive } = body;

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(role && { role }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: 'Хэрэглэгчийн мэдээлэл амжилттай шинэчлэгдлээ',
      user,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Мэдээлэл шинэчлэх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Хэрэглэгч устгах (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Зөвхөн админ энэ үйлдлийг хийх боломжтой' },
        { status: 403 }
      );
    }

    // Soft delete - isActive = false
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      message: 'Хэрэглэгч амжилттай устгагдлаа',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Хэрэглэгч устгах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
