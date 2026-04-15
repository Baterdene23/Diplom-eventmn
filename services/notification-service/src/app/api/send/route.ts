import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, emailTemplates } from '@/lib/email';
import { z } from 'zod';
import { requireGatewaySignature } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

// Мэдэгдэл илгээх validation
const sendNotificationSchema = z.object({
  userId: z.string().min(1),
  userEmail: z.string().email().optional(),
  type: z.enum(['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'EVENT_REMINDER', 'EVENT_UPDATED', 'EVENT_CANCELLED', 'SYSTEM']),
  title: z.string().min(1),
  message: z.string().min(1),
  data: z.record(z.any()).optional(),
  sendEmail: z.boolean().optional(),
});

// POST /api/send - Мэдэгдэл илгээх (Internal API - бусад service-үүдээс дуудна)
export async function POST(request: NextRequest) {
  try {
    // Internal API - should not be callable directly.
    // Accept either legacy INTERNAL_API_KEY (if set) or the gateway HMAC signature.
    try {
      requireGatewaySignature(request, '/api/send');
    } catch (e: any) {
      const apiKey = request.headers.get('x-api-key');
      const internalKey = process.env.INTERNAL_API_KEY;

      if (!internalKey || apiKey !== internalKey) {
        const status = e?.status;
        if (typeof status === 'number') {
          return NextResponse.json({ error: e?.message || 'Unauthorized' }, { status });
        }
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    
    const validationResult = sendNotificationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { userId, userEmail, type, title, message, data, sendEmail: shouldSendEmail } = validationResult.data;

    // Мэдэгдэл хадгалах
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data,
        emailSent: false,
      },
    });

    // И-мэйл илгээх (хэрэв шаардлагатай бол)
    let emailSent = false;
    if (shouldSendEmail && userEmail) {
      let emailContent;

      switch (type) {
        case 'BOOKING_CONFIRMED':
          if (data) {
            emailContent = emailTemplates.bookingConfirmation({
              userName: data.userName || 'Хэрэглэгч',
              eventTitle: data.eventTitle || '',
              eventDate: data.eventDate || '',
              venueName: data.venueName || '',
              seats: data.seats || '',
              totalAmount: data.totalAmount || 0,
              qrCode: data.qrCode || '',
            });
          }
          break;
        case 'BOOKING_CANCELLED':
          if (data) {
            emailContent = emailTemplates.bookingCancelled({
              userName: data.userName || 'Хэрэглэгч',
              eventTitle: data.eventTitle || '',
            });
          }
          break;
        case 'EVENT_REMINDER':
          if (data) {
            emailContent = emailTemplates.eventReminder({
              userName: data.userName || 'Хэрэглэгч',
              eventTitle: data.eventTitle || '',
              eventDate: data.eventDate || '',
              venueName: data.venueName || '',
            });
          }
          break;
        default:
          emailContent = {
            subject: title,
            html: `<p>${message}</p>`,
          };
      }

      if (emailContent) {
        emailSent = await sendEmail({
          to: userEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (emailSent) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { emailSent: true },
          });
        }
      }
    }

    return NextResponse.json({
      message: 'Мэдэгдэл амжилттай илгээгдлээ',
      notification,
      emailSent,
    });
  } catch (error) {
    console.error('Send notification error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Мэдэгдэл илгээх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
