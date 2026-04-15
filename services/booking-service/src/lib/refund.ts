export type RefundInfo = {
  refundAmount: number;
  refundPercentage: number;
  message: string;
};

/**
 * Refund policy (docs/02-SYSTEM-REQUIREMENTS.md)
 * - 48+ hours before event: 100%
 * - 24-48 hours before event: 50%
 * - <24 hours: 0%
 */
export function calculateRefundAmount(params: {
  totalAmount: number;
  eventDate: Date;
  bookingStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | string;
}): RefundInfo {
  const now = Date.now();
  const eventTime = new Date(params.eventDate).getTime();
  const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60);

  // Payment not completed => no refund.
  if (params.bookingStatus !== 'CONFIRMED') {
    return {
      refundAmount: 0,
      refundPercentage: 0,
      message: 'Төлбөр хийгээгүй захиалга',
    };
  }

  if (hoursUntilEvent >= 48) {
    return {
      refundAmount: params.totalAmount,
      refundPercentage: 100,
      message: '48+ цагийн өмнө цуцалсан - 100% буцаалт',
    };
  }

  if (hoursUntilEvent >= 24) {
    return {
      refundAmount: params.totalAmount * 0.5,
      refundPercentage: 50,
      message: '24-48 цагийн өмнө цуцалсан - 50% буцаалт',
    };
  }

  return {
    refundAmount: 0,
    refundPercentage: 0,
    message: '24 цагаас бага хугацаанд цуцалсан - буцаалт байхгүй',
  };
}
