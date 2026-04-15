// User Service Seed Data
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// 15 Users - 2 ADMIN, 3 ORGANIZER, 10 USER
const users = [
  // Admin users
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@eventmn.mn',
    password: 'Admin@123',
    firstName: 'Админ',
    lastName: 'Систем',
    phone: '99001122',
    role: 'ADMIN',
    isVerified: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'superadmin@eventmn.mn',
    password: 'Super@123',
    firstName: 'Супер',
    lastName: 'Админ',
    phone: '99003344',
    role: 'ADMIN',
    isVerified: true
  },
  // Organizer users
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'organizer1@eventmn.mn',
    password: 'Org@1234',
    firstName: 'Болд',
    lastName: 'Батбаяр',
    phone: '88001122',
    role: 'ORGANIZER',
    isVerified: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    email: 'organizer2@eventmn.mn',
    password: 'Org@1234',
    firstName: 'Сараа',
    lastName: 'Дорж',
    phone: '88003344',
    role: 'ORGANIZER',
    isVerified: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    email: 'organizer3@eventmn.mn',
    password: 'Org@1234',
    firstName: 'Тэмүүлэн',
    lastName: 'Ганбат',
    phone: '88005566',
    role: 'ORGANIZER',
    isVerified: true
  },
  // Regular users
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    email: 'user1@gmail.com',
    password: 'User@123',
    firstName: 'Бат',
    lastName: 'Эрдэнэ',
    phone: '95001122',
    role: 'USER',
    isVerified: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    email: 'user2@gmail.com',
    password: 'User@123',
    firstName: 'Оюунаа',
    lastName: 'Мөнх',
    phone: '95003344',
    role: 'USER',
    isVerified: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    email: 'user3@gmail.com',
    password: 'User@123',
    firstName: 'Тэгш',
    lastName: 'Баяр',
    phone: '95005566',
    role: 'USER',
    isVerified: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009',
    email: 'user4@gmail.com',
    password: 'User@123',
    firstName: 'Нараа',
    lastName: 'Сүх',
    phone: '95007788',
    role: 'USER',
    isVerified: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    email: 'user5@gmail.com',
    password: 'User@123',
    firstName: 'Ану',
    lastName: 'Төмөр',
    phone: '95009900',
    role: 'USER',
    isVerified: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    email: 'user6@gmail.com',
    password: 'User@123',
    firstName: 'Золбоо',
    lastName: 'Ганхуяг',
    phone: '96001122',
    role: 'USER',
    isVerified: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    email: 'user7@gmail.com',
    password: 'User@123',
    firstName: 'Мөнхзул',
    lastName: 'Батаа',
    phone: '96003344',
    role: 'USER',
    isVerified: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013',
    email: 'user8@gmail.com',
    password: 'User@123',
    firstName: 'Энхжин',
    lastName: 'Цэцэг',
    phone: '96005566',
    role: 'USER',
    isVerified: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440014',
    email: 'user9@gmail.com',
    password: 'User@123',
    firstName: 'Хүслэн',
    lastName: 'Алтан',
    phone: '96007788',
    role: 'USER',
    isVerified: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440015',
    email: 'user10@gmail.com',
    password: 'User@123',
    firstName: 'Ариунаа',
    lastName: 'Болд',
    phone: '96009900',
    role: 'USER',
    isVerified: false
  }
];

// Organizer profiles
const organizerProfiles = [
  {
    userId: '550e8400-e29b-41d4-a716-446655440003',
    organizationName: 'Болд Продакшн',
    description: 'Монголын томоохон концерт зохион байгуулагч компани',
    website: 'https://boldproduction.mn',
    isVerified: true
  },
  {
    userId: '550e8400-e29b-41d4-a716-446655440004',
    organizationName: 'Сараа Events',
    description: 'Хурал, семинар зохион байгуулалт',
    website: 'https://saraevents.mn',
    isVerified: true
  },
  {
    userId: '550e8400-e29b-41d4-a716-446655440005',
    organizationName: 'TG Entertainment',
    description: 'Театр, жүжгийн зохион байгуулалт',
    website: 'https://tgent.mn',
    isVerified: true
  }
];

async function main() {
  console.log('Seeding User Service database...');

  // Clear existing data
  await prisma.userActivityLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userOtp.deleteMany();
  await prisma.organizerProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing data');

  // Create users
  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    await prisma.user.create({
      data: {
        id: userData.id,
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role,
        isVerified: userData.isVerified,
        isActive: true
      }
    });
  }

  console.log(`Created ${users.length} users`);

  // Create organizer profiles
  for (const profile of organizerProfiles) {
    await prisma.organizerProfile.create({
      data: {
        userId: profile.userId,
        organizationName: profile.organizationName,
        description: profile.description,
        website: profile.website,
        isVerified: profile.isVerified
      }
    });
  }

  console.log(`Created ${organizerProfiles.length} organizer profiles`);

  console.log('User Service seeding completed!');
  console.log('');
  console.log('Test accounts:');
  console.log('  Admin: admin@eventmn.mn / Admin@123');
  console.log('  Organizer: organizer1@eventmn.mn / Org@1234');
  console.log('  User: user1@gmail.com / User@123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
