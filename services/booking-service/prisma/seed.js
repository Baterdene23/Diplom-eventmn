// Booking Service Seed Data
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Sample bookings
const bookings = [
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440006',
    userEmail: 'user1@gmail.com',
    userName: 'Бат Эрдэнэ',
    eventId: '6507e2e2e2e2e2e2e2e2e001',
    eventTitle: 'The HU - Шинэ Жилийн Концерт',
    eventDate: new Date('2026-12-31T18:00:00Z'),
    venueId: '6507f1f1f1f1f1f1f1f1f001',
    venueName: 'Төв Концертын Ордон',
    status: 'CONFIRMED',
    totalAmount: 300000,
    paymentMethod: 'CARD',
    seats: [
      { sectionId: 'vip', sectionName: 'VIP', row: 1, seatNumber: 1, price: 150000 },
      { sectionId: 'vip', sectionName: 'VIP', row: 1, seatNumber: 2, price: 150000 }
    ]
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    userId: '550e8400-e29b-41d4-a716-446655440007',
    userEmail: 'user2@gmail.com',
    userName: 'Оюунаа Мөнх',
    eventId: '6507e2e2e2e2e2e2e2e2e001',
    eventTitle: 'The HU - Шинэ Жилийн Концерт',
    eventDate: new Date('2026-12-31T18:00:00Z'),
    venueId: '6507f1f1f1f1f1f1f1f1f001',
    venueName: 'Төв Концертын Ордон',
    status: 'CONFIRMED',
    totalAmount: 450000,
    paymentMethod: 'QPAY',
    seats: [
      { sectionId: 'vip', sectionName: 'VIP', row: 2, seatNumber: 1, price: 150000 },
      { sectionId: 'vip', sectionName: 'VIP', row: 2, seatNumber: 2, price: 150000 },
      { sectionId: 'vip', sectionName: 'VIP', row: 2, seatNumber: 3, price: 150000 }
    ]
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003',
    userId: '550e8400-e29b-41d4-a716-446655440008',
    userEmail: 'user3@gmail.com',
    userName: 'Тэгш Баяр',
    eventId: '6507e2e2e2e2e2e2e2e2e002',
    eventTitle: 'Magnolian - Acoustic Night',
    eventDate: new Date('2026-04-15T19:00:00Z'),
    venueId: '6507f1f1f1f1f1f1f1f1f002',
    venueName: 'Драмын Эрдмийн Театр',
    status: 'CONFIRMED',
    totalAmount: 160000,
    paymentMethod: 'CARD',
    seats: [
      { sectionId: 'orchestra', sectionName: 'Orchestra', row: 3, seatNumber: 5, price: 80000 },
      { sectionId: 'orchestra', sectionName: 'Orchestra', row: 3, seatNumber: 6, price: 80000 }
    ]
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440004',
    userId: '550e8400-e29b-41d4-a716-446655440009',
    userEmail: 'user4@gmail.com',
    userName: 'Нараа Сүх',
    eventId: '6507e2e2e2e2e2e2e2e2e004',
    eventTitle: 'Tech Summit Mongolia 2026',
    eventDate: new Date('2026-06-10T09:00:00Z'),
    venueId: '6507f1f1f1f1f1f1f1f1f008',
    venueName: 'Номин Экспо Төв',
    status: 'CONFIRMED',
    totalAmount: 400000,
    paymentMethod: 'BANK',
    seats: [
      { sectionId: 'hall-a', sectionName: 'Hall A', row: 4, seatNumber: 1, price: 200000 },
      { sectionId: 'hall-a', sectionName: 'Hall A', row: 4, seatNumber: 2, price: 200000 }
    ]
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440005',
    userId: '550e8400-e29b-41d4-a716-446655440010',
    userEmail: 'user5@gmail.com',
    userName: 'Ану Төмөр',
    eventId: '6507e2e2e2e2e2e2e2e2e006',
    eventTitle: 'UFC Fight Night - Ulaanbaatar',
    eventDate: new Date('2026-09-15T17:00:00Z'),
    venueId: '6507f1f1f1f1f1f1f1f1f003',
    venueName: 'Буянт-Ухаа Спорт Цогцолбор',
    status: 'CONFIRMED',
    totalAmount: 500000,
    paymentMethod: 'QPAY',
    seats: [
      { sectionId: 'lower-bowl', sectionName: 'Lower Bowl', row: 5, seatNumber: 1, price: 250000 },
      { sectionId: 'lower-bowl', sectionName: 'Lower Bowl', row: 5, seatNumber: 2, price: 250000 }
    ]
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440006',
    userId: '550e8400-e29b-41d4-a716-446655440011',
    userEmail: 'user6@gmail.com',
    userName: 'Золбоо Ганхуяг',
    eventId: '6507e2e2e2e2e2e2e2e2e008',
    eventTitle: 'Тогтохын Зөн - Жүжиг',
    eventDate: new Date('2026-05-05T19:00:00Z'),
    venueId: '6507f1f1f1f1f1f1f1f1f002',
    venueName: 'Драмын Эрдмийн Театр',
    status: 'PENDING',
    totalAmount: 90000,
    paymentMethod: null,
    seats: [
      { sectionId: 'orchestra', sectionName: 'Orchestra', row: 6, seatNumber: 3, price: 45000 },
      { sectionId: 'orchestra', sectionName: 'Orchestra', row: 6, seatNumber: 4, price: 45000 }
    ]
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440007',
    userId: '550e8400-e29b-41d4-a716-446655440012',
    userEmail: 'user7@gmail.com',
    userName: 'Мөнхзул Батаа',
    eventId: '6507e2e2e2e2e2e2e2e2e009',
    eventTitle: 'Балетын шөнө - Лебедийн нуур',
    eventDate: new Date('2026-08-10T18:30:00Z'),
    venueId: '6507f1f1f1f1f1f1f1f1f001',
    venueName: 'Төв Концертын Ордон',
    status: 'CANCELLED',
    totalAmount: 240000,
    paymentMethod: 'CARD',
    seats: [
      { sectionId: 'vip', sectionName: 'VIP', row: 7, seatNumber: 1, price: 120000 },
      { sectionId: 'vip', sectionName: 'VIP', row: 7, seatNumber: 2, price: 120000 }
    ]
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440008',
    userId: '550e8400-e29b-41d4-a716-446655440006',
    userEmail: 'user1@gmail.com',
    userName: 'Бат Эрдэнэ',
    eventId: '6507e2e2e2e2e2e2e2e2e005',
    eventTitle: 'Digital Marketing Conference',
    eventDate: new Date('2026-04-25T10:00:00Z'),
    venueId: '6507f1f1f1f1f1f1f1f1f004',
    venueName: 'Shangri-La Mall Event Hall',
    status: 'CONFIRMED',
    totalAmount: 150000,
    paymentMethod: 'CARD',
    seats: [
      { sectionId: 'main-hall', sectionName: 'Main Hall', row: 8, seatNumber: 1, price: 150000 }
    ]
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440009',
    userId: '550e8400-e29b-41d4-a716-446655440013',
    userEmail: 'user8@gmail.com',
    userName: 'Энхжин Цэцэг',
    eventId: '6507e2e2e2e2e2e2e2e2e012',
    eventTitle: 'Stand-up Comedy Night',
    eventDate: new Date('2026-04-01T20:00:00Z'),
    venueId: '6507f1f1f1f1f1f1f1f1f007',
    venueName: 'UB Palace',
    status: 'CONFIRMED',
    totalAmount: 100000,
    paymentMethod: 'QPAY',
    seats: [
      { sectionId: 'gold', sectionName: 'Gold', row: 9, seatNumber: 5, price: 50000 },
      { sectionId: 'gold', sectionName: 'Gold', row: 9, seatNumber: 6, price: 50000 }
    ]
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440010',
    userId: '550e8400-e29b-41d4-a716-446655440014',
    userEmail: 'user9@gmail.com',
    userName: 'Хүслэн Алтан',
    eventId: '6507e2e2e2e2e2e2e2e2e010',
    eventTitle: 'Монгол Зураг - Орчин Үеийн Урлаг',
    eventDate: new Date('2026-06-01T10:00:00Z'),
    venueId: '6507f1f1f1f1f1f1f1f1f009',
    venueName: 'Misheel Expo',
    status: 'CONFIRMED',
    totalAmount: 30000,
    paymentMethod: 'CARD',
    seats: [
      { sectionId: 'main-floor', sectionName: 'Main Floor', row: 10, seatNumber: 1, price: 15000 },
      { sectionId: 'main-floor', sectionName: 'Main Floor', row: 10, seatNumber: 2, price: 15000 }
    ]
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440011',
    userId: '550e8400-e29b-41d4-a716-446655440007',
    userEmail: 'user2@gmail.com',
    userName: 'Оюунаа Мөнх',
    eventId: '6507e2e2e2e2e2e2e2e2e015',
    eventTitle: 'Дархан Rock Festival',
    eventDate: new Date('2026-08-20T16:00:00Z'),
    venueId: '6507f1f1f1f1f1f1f1f1f011',
    venueName: 'Дархан Хүндэтгэлийн Ордон',
    status: 'CONFIRMED',
    totalAmount: 120000,
    paymentMethod: 'BANK',
    seats: [
      { sectionId: 'main', sectionName: 'Main', row: 11, seatNumber: 1, price: 60000 },
      { sectionId: 'main', sectionName: 'Main', row: 11, seatNumber: 2, price: 60000 }
    ]
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440012',
    userId: '550e8400-e29b-41d4-a716-446655440008',
    userEmail: 'user3@gmail.com',
    userName: 'Тэгш Баяр',
    eventId: '6507e2e2e2e2e2e2e2e2e007',
    eventTitle: 'Монголын Чөлөөт Бөхийн Аварга Шалгаруулах',
    eventDate: new Date('2026-07-20T10:00:00Z'),
    venueId: '6507f1f1f1f1f1f1f1f1f003',
    venueName: 'Буянт-Ухаа Спорт Цогцолбор',
    status: 'CONFIRMED',
    totalAmount: 60000,
    paymentMethod: 'QPAY',
    seats: [
      { sectionId: 'upper-bowl', sectionName: 'Upper Bowl', row: 12, seatNumber: 1, price: 30000 },
      { sectionId: 'upper-bowl', sectionName: 'Upper Bowl', row: 12, seatNumber: 2, price: 30000 }
    ]
  }
];

async function main() {
  console.log('Seeding Booking Service database...');

  // Clear existing data
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.seatLock.deleteMany();

  console.log('Cleared existing data');

  // Create bookings with seats
  for (const bookingData of bookings) {
    const { seats, ...booking } = bookingData;
    
    await prisma.booking.create({
      data: {
        id: booking.id,
        userId: booking.userId,
        userEmail: booking.userEmail,
        userName: booking.userName,
        eventId: booking.eventId,
        eventTitle: booking.eventTitle,
        eventDate: booking.eventDate,
        venueId: booking.venueId,
        venueName: booking.venueName,
        totalAmount: booking.totalAmount,
        status: booking.status,
        paymentMethod: booking.paymentMethod,
        paidAt: booking.status === 'CONFIRMED' ? new Date() : null,
        seats: {
          create: seats.map(seat => ({
            sectionId: seat.sectionId,
            sectionName: seat.sectionName,
            row: seat.row,
            seatNumber: seat.seatNumber,
            price: seat.price
          }))
        }
      }
    });
  }

  console.log(`Created ${bookings.length} bookings`);
  console.log('Booking Service seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
