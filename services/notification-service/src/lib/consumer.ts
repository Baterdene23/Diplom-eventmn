import { prisma } from '@/lib/prisma';
import { sendEmail, emailTemplates } from '@/lib/email';
import { consumeQueue, QUEUES } from '@/lib/rabbitmq';

/**
 * Booking үүссэн мессеж боловсруулах
 */
async function handleBookingCreated(data: Record<string, unknown>) {
  const {
    bookingId,
    userId,
    eventTitle,
  } = data as {
    bookingId: string;
    userId: string;
    eventTitle: string;
  };

  await prisma.notification.create({
    data: {
      userId,
      type: 'SYSTEM',
      title: 'Захиалга үүсгэгдлээ',
      message: `"${eventTitle}" арга хэмжээний захиалга үүсэж, төлбөр баталгаажуулах хүлээлтэд орлоо.`,
      data: {
        bookingId,
        eventTitle,
      },
      emailSent: false,
    },
  });

  console.log(`[BOOKING_CREATED] Notification created for user ${userId}`);
}

/**
 * Booking баталгаажсан мессеж боловсруулах
 */
async function handleBookingConfirmed(data: Record<string, unknown>) {
  const {
    bookingId,
    userId,
    userEmail,
    userName,
    eventTitle,
    eventDate,
    venueName,
    seats,
    totalAmount,
    qrCode,
  } = data as {
    bookingId: string;
    userId: string;
    userEmail: string;
    userName: string;
    eventTitle: string;
    eventDate: string;
    venueName: string;
    seats: Array<{ sectionName: string; row: number; seatNumber: number }>;
    totalAmount: number;
    qrCode: string;
  };

  // Суудлуудыг string болгох
  const seatsString = seats
    .map(s => `${s.sectionName} - Эгнээ ${s.row}, Суудал ${s.seatNumber}`)
    .join('; ');

  // Notification хадгалах
  const notification = await prisma.notification.create({
    data: {
    userId,
    type: 'BOOKING_CONFIRMED',
    title: 'Захиалга баталгаажлаа',
    message: `"${eventTitle}" арга хэмжээний захиалга амжилттай баталгаажлаа.`,
    data: {
      bookingId,
      eventTitle,
      eventDate,
      venueName,
      seats: seatsString,
      totalAmount,
      qrCode,
    },
    emailSent: false,
    },
  });

  // Email илгээх
  if (userEmail) {
    const emailContent = emailTemplates.bookingConfirmation({
      userName: userName || 'Хэрэглэгч',
      eventTitle,
      eventDate: new Date(eventDate).toLocaleString('mn-MN'),
      venueName,
      seats: seatsString,
      totalAmount,
      qrCode,
    });

    const sent = await sendEmail({
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (sent) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { emailSent: true },
      });
    }
  }

  console.log(`[BOOKING_CONFIRMED] Notification created for user ${userId}`);
}

/**
 * Booking цуцлагдсан мессеж боловсруулах
 */
async function handleBookingCancelled(data: Record<string, unknown>) {
  const {
    bookingId,
    userId,
    userEmail,
    userName,
    eventTitle,
    refundInfo,
    reason,
  } = data as {
    bookingId: string;
    userId: string;
    userEmail: string;
    userName: string;
    eventTitle: string;
    refundInfo?: { refundAmount: number; refundPercentage: number; message: string };
    reason?: string;
  };

  // Notification хадгалах
  const notification = await prisma.notification.create({
    data: {
    userId,
    type: 'BOOKING_CANCELLED',
    title: 'Захиалга цуцлагдлаа',
    message: `"${eventTitle}" арга хэмжээний захиалга цуцлагдлаа. ${refundInfo?.message || ''}`,
    data: {
      bookingId,
      eventTitle,
      refundInfo,
      reason,
    },
    emailSent: false,
    },
  });

  // Email илгээх
  if (userEmail) {
    const emailContent = emailTemplates.bookingCancelled({
      userName: userName || 'Хэрэглэгч',
      eventTitle,
    });

    const sent = await sendEmail({
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (sent) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { emailSent: true },
      });
    }
  }

  console.log(`[BOOKING_CANCELLED] Notification created for user ${userId}`);
}

/**
 * Event зөвшөөрөгдсөн мессеж боловсруулах
 */
async function handleEventApproved(data: Record<string, unknown>) {
  const {
    eventId,
    organizerId,
    eventTitle,
  } = data as {
    eventId: string;
    organizerId: string;
    eventTitle: string;
  };

  await prisma.notification.create({
    data: {
    userId: organizerId,
    type: 'SYSTEM',
    title: 'Арга хэмжээ зөвшөөрөгдлөө',
    message: `"${eventTitle}" арга хэмжээ админаар зөвшөөрөгдөж, нийтлэгдлээ.`,
    data: {
      eventId,
      eventTitle,
    },
    },
  });

  console.log(`[EVENT_APPROVED] Notification created for organizer ${organizerId}`);
}

/**
 * Event татгалзагдсан мессеж боловсруулах
 */
async function handleEventRejected(data: Record<string, unknown>) {
  const {
    eventId,
    organizerId,
    eventTitle,
    reason,
  } = data as {
    eventId: string;
    organizerId: string;
    eventTitle: string;
    reason: string;
  };

  await prisma.notification.create({
    data: {
    userId: organizerId,
    type: 'SYSTEM',
    title: 'Арга хэмжээ татгалзагдлаа',
    message: `"${eventTitle}" арга хэмжээ татгалзагдлаа. Шалтгаан: ${reason}`,
    data: {
      eventId,
      eventTitle,
      reason,
    },
    },
  });

  console.log(`[EVENT_REJECTED] Notification created for organizer ${organizerId}`);
}

/**
 * Event сануулга мессеж боловсруулах
 */
async function handleEventReminder(data: Record<string, unknown>) {
  const {
    userId,
    userEmail,
    userName,
    eventTitle,
    eventDate,
    venueName,
  } = data as {
    userId: string;
    userEmail: string;
    userName: string;
    eventTitle: string;
    eventDate: string;
    venueName: string;
  };

  const notification = await prisma.notification.create({
    data: {
    userId,
    type: 'EVENT_REMINDER',
    title: 'Арга хэмжээний сануулга',
    message: `"${eventTitle}" арга хэмжээ маргааш болно.`,
    data: {
      eventTitle,
      eventDate,
      venueName,
    },
    emailSent: false,
    },
  });

  // Email илгээх
  if (userEmail) {
    const emailContent = emailTemplates.eventReminder({
      userName: userName || 'Хэрэглэгч',
      eventTitle,
      eventDate: new Date(eventDate).toLocaleString('mn-MN'),
      venueName,
    });

    const sent = await sendEmail({
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (sent) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { emailSent: true },
      });
    }
  }

  console.log(`[EVENT_REMINDER] Notification created for user ${userId}`);
}

/**
 * Event цуцлагдсан мессеж боловсруулах
 */
async function handleEventCancelled(data: Record<string, unknown>) {
  const {
    eventId,
    organizerId,
    eventTitle,
    startDate,
    cancelledAt,
    cancelledBy,
  } = data as {
    eventId: string;
    organizerId?: string;
    eventTitle?: string;
    startDate?: string | null;
    cancelledAt?: string;
    cancelledBy?: string;
  };

  // Organizer/system notification (attendees are handled via booking.cancelled events)
  if (organizerId) {
    await prisma.notification.create({
      data: {
        userId: organizerId,
        type: 'SYSTEM',
        title: 'Арга хэмжээ цуцлагдлаа',
        message: `"${eventTitle || eventId}" арга хэмжээ цуцлагдлаа.`,
        data: {
          eventId,
          eventTitle,
          startDate,
          cancelledAt,
          cancelledBy,
        },
        emailSent: false,
      },
    });
  }

  console.log(`[EVENT_CANCELLED] Notification created for organizer ${organizerId || 'unknown'}`);
}

/**
 * Event шинэчлэгдсэн мессеж боловсруулах
 */
async function handleEventUpdated(data: Record<string, unknown>) {
  const {
    eventId,
    organizerId,
    eventTitle,
    status,
    startDate,
    endDate,
    updatedAt,
    updatedBy,
  } = data as {
    eventId: string;
    organizerId?: string;
    eventTitle?: string;
    status?: string;
    startDate?: string | null;
    endDate?: string | null;
    updatedAt?: string;
    updatedBy?: string;
  };

  if (organizerId) {
    await prisma.notification.create({
      data: {
        userId: organizerId,
        type: 'SYSTEM',
        title: 'Арга хэмжээ шинэчлэгдлээ',
        message: `"${eventTitle || eventId}" арга хэмжээний мэдээлэл шинэчлэгдлээ.`,
        data: {
          eventId,
          eventTitle,
          status,
          startDate,
          endDate,
          updatedAt,
          updatedBy,
        },
        emailSent: false,
      },
    });
  }

  console.log(`[EVENT_UPDATED] Notification created for organizer ${organizerId || 'unknown'}`);
}

/**
 * Бүх consumer-уудыг эхлүүлэх
 */
export async function startConsumers() {
  console.log('Starting RabbitMQ consumers...');

  await consumeQueue(QUEUES.BOOKING_CREATED, handleBookingCreated);
  await consumeQueue(QUEUES.BOOKING_CONFIRMED, handleBookingConfirmed);
  await consumeQueue(QUEUES.BOOKING_CANCELLED, handleBookingCancelled);
  await consumeQueue(QUEUES.EVENT_APPROVED, handleEventApproved);
  await consumeQueue(QUEUES.EVENT_REJECTED, handleEventRejected);
  await consumeQueue(QUEUES.EVENT_REMINDER, handleEventReminder);
  await consumeQueue(QUEUES.EVENT_CANCELLED, handleEventCancelled);
  await consumeQueue(QUEUES.EVENT_UPDATED, handleEventUpdated);

  console.log('All RabbitMQ consumers started!');
}
