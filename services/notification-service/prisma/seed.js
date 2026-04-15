// Notification Service Seed Data
// Minimal demo notifications for evaluator checks.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEMO_USER_IDS = [
  // From user-service seed.js
  '550e8400-e29b-41d4-a716-446655440006', // user1@gmail.com
  '550e8400-e29b-41d4-a716-446655440007', // user2@gmail.com
  '550e8400-e29b-41d4-a716-446655440003', // organizer1@eventmn.mn
];

async function main() {
  console.log('Seeding Notification Service database...');

  // Clear existing data
  await prisma.notification.deleteMany();
  console.log('Cleared existing data');

  const now = new Date();

  const rows = [
    {
      userId: DEMO_USER_IDS[0],
      type: 'SYSTEM',
      title: '[DEMO] EventMN мэдэгдэл',
      message: '[DEMO] Систем хэвийн ажиллаж байна.',
      data: { kind: 'healthcheck' },
      isRead: false,
      emailSent: false,
      createdAt: now,
    },
    {
      userId: DEMO_USER_IDS[1],
      type: 'BOOKING_CONFIRMED',
      title: '[DEMO] Захиалга баталгаажлаа',
      message: '[DEMO] Таны захиалга баталгаажлаа (жишээ дата).',
      data: { bookingId: 'DEMO-BOOKING-1' },
      isRead: false,
      emailSent: false,
      createdAt: now,
    },
    {
      userId: DEMO_USER_IDS[2],
      type: 'EVENT_UPDATED',
      title: '[DEMO] Эвент шинэчлэгдлээ',
      message: '[DEMO] Эвентийн мэдээлэл шинэчлэгдсэн байна (жишээ).',
      data: { eventId: 'DEMO-EVENT-1' },
      isRead: true,
      emailSent: false,
      createdAt: now,
    },
  ];

  await prisma.notification.createMany({ data: rows });

  console.log(`Created ${rows.length} notifications`);
  console.log('Notification Service seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
