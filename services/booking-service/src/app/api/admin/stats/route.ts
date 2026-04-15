import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGatewaySignature } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/stats - Admin статистик
export async function GET(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/admin/stats');
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Зөвхөн админ хандах боломжтой' },
        { status: 403 }
      );
    }

    // Захиалгын статистик
    const [
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      totalRevenue,
      todayBookings,
      weekBookings,
      monthBookings,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.booking.count({ where: { status: 'CANCELLED' } }),
      prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'CONFIRMED' },
      }),
      // Өнөөдрийн захиалга
      prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Энэ 7 хоногийн захиалга
      prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Энэ сарын захиалга
      prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    // Сүүлийн 7 хоногийн өдөр тутмын захиалга
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await prisma.booking.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      const revenue = await prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
          status: 'CONFIRMED',
        },
      });

      last7Days.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('mn-MN', { weekday: 'short' }),
        bookings: count,
        revenue: revenue._sum.totalAmount || 0,
      });
    }

    // Сүүлийн захиалгууд
    const recentBookings = await prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        seats: true,
      },
    });

    // Топ эвентүүд (хамгийн их захиалгатай)
    const topEvents = await prisma.booking.groupBy({
      by: ['eventId', 'eventTitle'],
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    return NextResponse.json({
      overview: {
        totalBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        todayBookings,
        weekBookings,
        monthBookings,
      },
      dailyStats: last7Days,
      recentBookings: recentBookings.map(b => ({
        id: b.id,
        userName: b.userName,
        userEmail: b.userEmail,
        eventTitle: b.eventTitle,
        totalAmount: b.totalAmount,
        status: b.status,
        seatCount: b.seats.length,
        createdAt: b.createdAt,
      })),
      topEvents: topEvents.map(e => ({
        eventId: e.eventId,
        eventTitle: e.eventTitle,
        bookingCount: e._count.id,
        totalRevenue: e._sum.totalAmount || 0,
      })),
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Статистик авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
