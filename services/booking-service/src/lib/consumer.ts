import { prisma } from '@/lib/prisma';
import { consumeQueue } from '@/lib/rabbitmq-consume';
import { publishMessage, ROUTING_KEYS } from '@/lib/rabbitmq';

type EventCancelledMessage = {
  eventId: string;
  eventTitle?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelledByRole?: string;
};

async function handleEventCancelled(data: Record<string, unknown>) {
  const { eventId, eventTitle, cancelledAt, cancelledBy, cancelledByRole } =
    data as EventCancelledMessage;

  if (!eventId) {
    throw new Error('eventId is required');
  }

  // Cancel all bookings that are not already cancelled/expired.
  // Refund policy BR-R04: event cancelled -> 100% refund.
  const bookings = await prisma.booking.findMany({
    where: {
      eventId,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: {
      id: true,
      userId: true,
      userEmail: true,
      userName: true,
      eventTitle: true,
      eventDate: true,
      venueName: true,
      totalAmount: true,
    },
  });

  for (const booking of bookings) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' },
    });

    const refundInfo = {
      refundAmount: booking.totalAmount,
      refundPercentage: 100,
      message: 'Арга хэмжээ цуцлагдсан тул 100% буцаалт хийгдэнэ.',
    };

    await publishMessage(ROUTING_KEYS.BOOKING_CANCELLED, {
      bookingId: booking.id,
      userId: booking.userId,
      userEmail: booking.userEmail,
      userName: booking.userName,
      eventTitle: booking.eventTitle,
      refundInfo,
      reason: `EVENT_CANCELLED:${eventTitle || eventId}`,
      meta: {
        eventId,
        cancelledAt,
        cancelledBy,
        cancelledByRole,
      },
    });
  }

  console.log(`[EVENT_CANCELLED] cancelled ${bookings.length} bookings for event ${eventId}`);
}

export async function startConsumers() {
  await consumeQueue(ROUTING_KEYS.EVENT_CANCELLED, handleEventCancelled);
  console.log('Booking-service consumers started');
}
