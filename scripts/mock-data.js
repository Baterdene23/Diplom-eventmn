// Mock Data for EventMN Microservices
// Run: node scripts/seed-data.js

const bcrypt = require('bcryptjs');

// =====================================================
// USERS (15 users - 10 USER, 3 ORGANIZER, 2 ADMIN)
// =====================================================
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
    isVerified: false  // Not verified user for testing
  }
];

// =====================================================
// VENUES (12 venues) - Matches Venue.ts schema with sections array
// sections: { id, name, rows, seatsPerRow, price, color }
// =====================================================
const venues = [
  {
    _id: '6507f1f1f1f1f1f1f1f1f001',
    name: 'Төв Концертын Ордон',
    address: 'Сүхбаатарын талбай 3',
    city: 'Улаанбаатар',
    capacity: 1500,
    description: 'Монголын хамгийн том концертын заал. 1500 суудалтай, олон улсын стандартад нийцсэн.',
    images: ['/images/venues/concert-hall-1.jpg', '/images/venues/concert-hall-2.jpg'],
    sections: [
      { id: 'vip', name: 'VIP', rows: 5, seatsPerRow: 20, price: 150000, color: '#FFD700' },
      { id: 'standard', name: 'Standard', rows: 15, seatsPerRow: 30, price: 80000, color: '#3B82F6' },
      { id: 'balcony', name: 'Balcony', rows: 10, seatsPerRow: 25, price: 60000, color: '#10B981' }
    ],
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true
  },
  {
    _id: '6507f1f1f1f1f1f1f1f1f002',
    name: 'Драмын Эрдмийн Театр',
    address: 'Бага тойруу 46',
    city: 'Улаанбаатар',
    capacity: 800,
    description: 'Түүхэн театрын байр. Жүжиг, концертод тохиромжтой.',
    images: ['/images/venues/drama-theater-1.jpg'],
    sections: [
      { id: 'orchestra', name: 'Orchestra', rows: 10, seatsPerRow: 25, price: 80000, color: '#8B5CF6' },
      { id: 'mezzanine', name: 'Mezzanine', rows: 8, seatsPerRow: 20, price: 64000, color: '#EC4899' },
      { id: 'balcony', name: 'Balcony', rows: 10, seatsPerRow: 24, price: 45000, color: '#10B981' }
    ],
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true
  },
  {
    _id: '6507f1f1f1f1f1f1f1f1f003',
    name: 'Буянт-Ухаа Спорт Цогцолбор',
    address: 'Буянт-Ухаа',
    city: 'Улаанбаатар',
    capacity: 12000,
    description: 'Монголын хамгийн том спортын цогцолбор. UFC, концерт, спорт тэмцээнүүдэд зориулагдсан.',
    images: ['/images/venues/buyant-ukhaa-1.jpg'],
    sections: [
      { id: 'vip-box', name: 'VIP Box', rows: 5, seatsPerRow: 30, price: 250000, color: '#FFD700' },
      { id: 'lower-bowl', name: 'Lower Bowl', rows: 20, seatsPerRow: 50, price: 125000, color: '#3B82F6' },
      { id: 'upper-bowl', name: 'Upper Bowl', rows: 30, seatsPerRow: 40, price: 75000, color: '#10B981' },
      { id: 'standing', name: 'Standing', rows: 10, seatsPerRow: 100, price: 40000, color: '#6B7280' }
    ],
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true
  },
  {
    _id: '6507f1f1f1f1f1f1f1f1f004',
    name: 'Shangri-La Mall Event Hall',
    address: 'Олимпийн гудамж 19',
    city: 'Улаанбаатар',
    capacity: 500,
    description: 'Орчин үеийн арга хэмжээний танхим. Хурал, семинарт тохиромжтой.',
    images: ['/images/venues/shangri-la-1.jpg'],
    sections: [
      { id: 'main-hall', name: 'Main Hall', rows: 10, seatsPerRow: 50, price: 100000, color: '#3B82F6' }
    ],
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true
  },
  {
    _id: '6507f1f1f1f1f1f1f1f1f005',
    name: 'Монгол Кино Ордон',
    address: 'Энхтайваны өргөн чөлөө',
    city: 'Улаанбаатар',
    capacity: 350,
    description: 'Кино театр, жижиг концертод зориулсан танхим.',
    images: ['/images/venues/mongol-kino-1.jpg'],
    sections: [
      { id: 'premium', name: 'Premium', rows: 3, seatsPerRow: 20, price: 75000, color: '#FFD700' },
      { id: 'standard', name: 'Standard', rows: 12, seatsPerRow: 22, price: 50000, color: '#3B82F6' }
    ],
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true
  },
  {
    _id: '6507f1f1f1f1f1f1f1f1f006',
    name: 'Чингис Хаан Хүндэтгэлийн Ордон',
    address: 'Чингисийн өргөн чөлөө',
    city: 'Улаанбаатар',
    capacity: 2000,
    description: 'Монголын хамгийн нэр хүндтэй хүндэтгэлийн танхим. Том концерт, хуралд зориулагдсан.',
    images: ['/images/venues/chinggis-palace-1.jpg'],
    sections: [
      { id: 'vip', name: 'VIP', rows: 8, seatsPerRow: 25, price: 200000, color: '#FFD700' },
      { id: 'a-section', name: 'A Section', rows: 15, seatsPerRow: 40, price: 120000, color: '#8B5CF6' },
      { id: 'b-section', name: 'B Section', rows: 20, seatsPerRow: 45, price: 80000, color: '#3B82F6' }
    ],
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true
  },
  {
    _id: '6507f1f1f1f1f1f1f1f1f007',
    name: 'UB Palace',
    address: 'Жуков гудамж',
    city: 'Улаанбаатар',
    capacity: 1200,
    description: 'Олон зориулалттай арга хэмжээний төв. Концерт, хурим, банкетд тохиромжтой.',
    images: ['/images/venues/ub-palace-1.jpg'],
    sections: [
      { id: 'diamond', name: 'Diamond', rows: 4, seatsPerRow: 15, price: 150000, color: '#E5E7EB' },
      { id: 'gold', name: 'Gold', rows: 8, seatsPerRow: 25, price: 100000, color: '#FFD700' },
      { id: 'silver', name: 'Silver', rows: 15, seatsPerRow: 35, price: 75000, color: '#9CA3AF' },
      { id: 'bronze', name: 'Bronze', rows: 15, seatsPerRow: 40, price: 50000, color: '#D97706' }
    ],
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true
  },
  {
    _id: '6507f1f1f1f1f1f1f1f1f008',
    name: 'Номин Экспо Төв',
    address: 'Баянзүрх дүүрэг',
    city: 'Улаанбаатар',
    capacity: 3000,
    description: 'Том хэмжээний хурал, үзэсгэлэнд зориулсан экспо төв.',
    images: ['/images/venues/nomin-expo-1.jpg'],
    sections: [
      { id: 'hall-a', name: 'Hall A', rows: 25, seatsPerRow: 60, price: 100000, color: '#3B82F6' },
      { id: 'hall-b', name: 'Hall B', rows: 25, seatsPerRow: 60, price: 100000, color: '#10B981' }
    ],
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true
  },
  {
    _id: '6507f1f1f1f1f1f1f1f1f009',
    name: 'Misheel Expo',
    address: 'Хан-Уул дүүрэг',
    city: 'Улаанбаатар',
    capacity: 5000,
    description: 'Монголын хамгийн том үзэсгэлэнгийн төв. Авто шоу, урлагийн үзэсгэлэнд тохиромжтой.',
    images: ['/images/venues/misheel-expo-1.jpg'],
    sections: [
      { id: 'main-floor', name: 'Main Floor', rows: 40, seatsPerRow: 50, price: 50000, color: '#3B82F6' },
      { id: 'gallery', name: 'Gallery', rows: 10, seatsPerRow: 50, price: 40000, color: '#10B981' }
    ],
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true
  },
  {
    _id: '6507f1f1f1f1f1f1f1f1f010',
    name: 'National Amusement Park Stage',
    address: 'Үндэсний цэцэрлэгт хүрээлэн',
    city: 'Улаанбаатар',
    capacity: 8000,
    description: 'Задгай агаарын тайз. Том фестиваль, концертод зориулагдсан.',
    images: ['/images/venues/national-park-1.jpg'],
    sections: [
      { id: 'front-stage', name: 'Front Stage', rows: 10, seatsPerRow: 50, price: 100000, color: '#FFD700' },
      { id: 'general', name: 'General', rows: 30, seatsPerRow: 60, price: 50000, color: '#3B82F6' },
      { id: 'standing', name: 'Standing Area', rows: 20, seatsPerRow: 100, price: 30000, color: '#6B7280' }
    ],
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true
  },
  {
    _id: '6507f1f1f1f1f1f1f1f1f011',
    name: 'Дархан Хүндэтгэлийн Ордон',
    address: 'Төв талбай',
    city: 'Дархан',
    capacity: 600,
    description: 'Дархан хотын гол арга хэмжээний танхим.',
    images: ['/images/venues/darkhan-hall-1.jpg'],
    sections: [
      { id: 'main', name: 'Main', rows: 15, seatsPerRow: 40, price: 60000, color: '#3B82F6' }
    ],
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true
  },
  {
    _id: '6507f1f1f1f1f1f1f1f1f012',
    name: 'Эрдэнэт Спорт Заал',
    address: 'Спортын гудамж',
    city: 'Эрдэнэт',
    capacity: 4000,
    description: 'Эрдэнэт хотын том спортын заал. Тэмцээн, концертод тохиромжтой.',
    images: ['/images/venues/erdenet-sports-1.jpg'],
    sections: [
      { id: 'vip', name: 'VIP', rows: 5, seatsPerRow: 30, price: 60000, color: '#FFD700' },
      { id: 'standard', name: 'Standard', rows: 30, seatsPerRow: 40, price: 30000, color: '#3B82F6' },
      { id: 'standing', name: 'Standing', rows: 10, seatsPerRow: 100, price: 15000, color: '#6B7280' }
    ],
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true
  }
];

// =====================================================
// EVENTS (15 events - various categories and statuses)
// Matches Event.ts schema: organizer object, venueName, ticketInfo[], images[]
// Categories: CONCERT, CONFERENCE, WORKSHOP, MEETUP, SPORTS, EXHIBITION, OTHER
// Statuses: DRAFT, PENDING, PUBLISHED, CANCELLED, COMPLETED
// =====================================================
const events = [
  // CONCERT events
  {
    _id: '6507e2e2e2e2e2e2e2e2e001',
    title: 'The HU - Шинэ Жилийн Концерт',
    description: 'Дэлхийд алдартай The HU хамтлагийн шинэ жилийн тусгай концерт. Шинэ дуунууд болон хит дуунууд.',
    category: 'CONCERT',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Болд Батбаяр'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f001',
    venueName: 'Төв Концертын Ордон',
    startDate: '2026-12-31T18:00:00Z',
    endDate: '2026-12-31T23:00:00Z',
    images: ['/images/the-hu-concert.jpg'],
    thumbnail: '/images/the-hu-concert.jpg',
    status: 'PUBLISHED',
    isFeatured: true,
    tags: ['rock', 'folk', 'new year'],
    ticketInfo: [
      { sectionId: 'vip', sectionName: 'VIP', price: 300000, available: 80, total: 100 },
      { sectionId: 'standard', sectionName: 'Standard', price: 150000, available: 400, total: 450 },
      { sectionId: 'balcony', sectionName: 'Balcony', price: 120000, available: 220, total: 250 }
    ]
  },
  {
    _id: '6507e2e2e2e2e2e2e2e2e002',
    title: 'Magnolian - Acoustic Night',
    description: 'Magnolian хамтлагийн acoustic тоглолт. Дуртай дуунуудыг шинэ хувилбараар.',
    category: 'CONCERT',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Болд Батбаяр'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f002',
    venueName: 'Драмын Эрдмийн Театр',
    startDate: '2026-04-15T19:00:00Z',
    endDate: '2026-04-15T22:00:00Z',
    images: ['/images/magnolian-acoustic.jpg'],
    thumbnail: '/images/magnolian-acoustic.jpg',
    status: 'PUBLISHED',
    isFeatured: false,
    tags: ['acoustic', 'indie', 'rock'],
    ticketInfo: [
      { sectionId: 'orchestra', sectionName: 'Orchestra', price: 120000, available: 200, total: 250 },
      { sectionId: 'mezzanine', sectionName: 'Mezzanine', price: 96000, available: 140, total: 160 },
      { sectionId: 'balcony', sectionName: 'Balcony', price: 80000, available: 210, total: 240 }
    ]
  },
  {
    _id: '6507e2e2e2e2e2e2e2e2e003',
    title: 'Болд - 20 жилийн ой',
    description: 'Дуучин Болдын урлагийн 20 жилийн ойн концерт. Тусгай зочид, хит дуунууд.',
    category: 'CONCERT',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Сараа Дорж'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f006',
    venueName: 'Чингис Хаан Хүндэтгэлийн Ордон',
    startDate: '2026-05-20T18:00:00Z',
    endDate: '2026-05-20T22:00:00Z',
    images: ['/images/bold-concert.jpg'],
    thumbnail: '/images/bold-concert.jpg',
    status: 'PENDING',
    isFeatured: false,
    tags: ['pop', 'anniversary'],
    ticketInfo: [
      { sectionId: 'vip', sectionName: 'VIP', price: 250000, available: 200, total: 200 },
      { sectionId: 'a-section', sectionName: 'A Section', price: 150000, available: 600, total: 600 },
      { sectionId: 'b-section', sectionName: 'B Section', price: 100000, available: 900, total: 900 }
    ]
  },
  // CONFERENCE events
  {
    _id: '6507e2e2e2e2e2e2e2e2e004',
    title: 'Tech Summit Mongolia 2026',
    description: 'Монголын хамгийн том технологийн хурал. AI, Blockchain, Startup илтгэлүүд.',
    category: 'CONFERENCE',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Сараа Дорж'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f008',
    venueName: 'Номин Экспо Төв',
    startDate: '2026-06-10T09:00:00Z',
    endDate: '2026-06-11T18:00:00Z',
    images: ['/images/tech-summit.jpg'],
    thumbnail: '/images/tech-summit.jpg',
    status: 'PUBLISHED',
    isFeatured: true,
    tags: ['technology', 'AI', 'startup', 'blockchain'],
    ticketInfo: [
      { sectionId: 'hall-a', sectionName: 'Hall A', price: 200000, available: 1300, total: 1500 },
      { sectionId: 'hall-b', sectionName: 'Hall B', price: 200000, available: 1200, total: 1500 }
    ]
  },
  {
    _id: '6507e2e2e2e2e2e2e2e2e005',
    title: 'Digital Marketing Conference',
    description: 'Дижитал маркетингийн чиг хандлага, практик туршлага хуваалцах хурал.',
    category: 'CONFERENCE',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440005',
      name: 'Тэмүүлэн Ганбат'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f004',
    venueName: 'Shangri-La Mall Event Hall',
    startDate: '2026-04-25T10:00:00Z',
    endDate: '2026-04-25T17:00:00Z',
    images: ['/images/digital-marketing.jpg'],
    thumbnail: '/images/digital-marketing.jpg',
    status: 'PUBLISHED',
    isFeatured: false,
    tags: ['marketing', 'digital', 'social media'],
    ticketInfo: [
      { sectionId: 'main-hall', sectionName: 'Main Hall', price: 150000, available: 350, total: 500 }
    ]
  },
  // SPORTS events (changed from SPORT)
  {
    _id: '6507e2e2e2e2e2e2e2e2e006',
    title: 'UFC Fight Night - Ulaanbaatar',
    description: 'UFC-ийн анхны Монгол дахь тулаан. Олон улсын од тамирчид.',
    category: 'SPORTS',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Болд Батбаяр'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f003',
    venueName: 'Буянт-Ухаа Спорт Цогцолбор',
    startDate: '2026-09-15T17:00:00Z',
    endDate: '2026-09-15T23:00:00Z',
    images: ['/images/ufc-mongolia.jpg'],
    thumbnail: '/images/ufc-mongolia.jpg',
    status: 'PUBLISHED',
    isFeatured: true,
    tags: ['MMA', 'UFC', 'sports'],
    ticketInfo: [
      { sectionId: 'vip-box', sectionName: 'VIP Box', price: 750000, available: 100, total: 150 },
      { sectionId: 'lower-bowl', sectionName: 'Lower Bowl', price: 375000, available: 800, total: 1000 },
      { sectionId: 'upper-bowl', sectionName: 'Upper Bowl', price: 250000, available: 2000, total: 2400 },
      { sectionId: 'standing', sectionName: 'Standing', price: 125000, available: 1600, total: 2000 }
    ]
  },
  {
    _id: '6507e2e2e2e2e2e2e2e2e007',
    title: 'Монголын Чөлөөт Бөхийн Аварга Шалгаруулах',
    description: 'Улсын аварга шалгаруулах тэмцээн. Бүх насны ангиллууд.',
    category: 'SPORTS',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Сараа Дорж'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f003',
    venueName: 'Буянт-Ухаа Спорт Цогцолбор',
    startDate: '2026-07-20T10:00:00Z',
    endDate: '2026-07-22T18:00:00Z',
    images: ['/images/wrestling.jpg'],
    thumbnail: '/images/wrestling.jpg',
    status: 'PUBLISHED',
    isFeatured: false,
    tags: ['wrestling', 'championship', 'national'],
    ticketInfo: [
      { sectionId: 'vip-box', sectionName: 'VIP Box', price: 90000, available: 150, total: 150 },
      { sectionId: 'lower-bowl', sectionName: 'Lower Bowl', price: 45000, available: 1000, total: 1000 },
      { sectionId: 'upper-bowl', sectionName: 'Upper Bowl', price: 30000, available: 2400, total: 2400 },
      { sectionId: 'standing', sectionName: 'Standing', price: 15000, available: 2000, total: 2000 }
    ]
  },
  // OTHER category events (THEATER mapped to OTHER since not in enum)
  {
    _id: '6507e2e2e2e2e2e2e2e2e008',
    title: 'Тогтохын Зөн - Жүжиг',
    description: 'Д.Нацагдоржийн "Учиртай гурван толгой" зохиолоос сэдэвлэсэн жүжиг.',
    category: 'OTHER',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440005',
      name: 'Тэмүүлэн Ганбат'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f002',
    venueName: 'Драмын Эрдмийн Театр',
    startDate: '2026-05-05T19:00:00Z',
    endDate: '2026-05-05T21:30:00Z',
    images: ['/images/theater-play.jpg'],
    thumbnail: '/images/theater-play.jpg',
    status: 'PUBLISHED',
    isFeatured: false,
    tags: ['theater', 'drama', 'classic'],
    ticketInfo: [
      { sectionId: 'orchestra', sectionName: 'Orchestra', price: 67500, available: 200, total: 250 },
      { sectionId: 'mezzanine', sectionName: 'Mezzanine', price: 54000, available: 130, total: 160 },
      { sectionId: 'balcony', sectionName: 'Balcony', price: 45000, available: 200, total: 240 }
    ]
  },
  {
    _id: '6507e2e2e2e2e2e2e2e2e009',
    title: 'Балетын шөнө - Лебедийн нуур',
    description: 'Чайковскийн алдарт балет. Олон улсын балетчид оролцоно.',
    category: 'OTHER',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440005',
      name: 'Тэмүүлэн Ганбат'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f001',
    venueName: 'Төв Концертын Ордон',
    startDate: '2026-08-10T18:30:00Z',
    endDate: '2026-08-10T21:00:00Z',
    images: ['/images/swan-lake.jpg'],
    thumbnail: '/images/swan-lake.jpg',
    status: 'PUBLISHED',
    isFeatured: true,
    tags: ['ballet', 'classical', 'international'],
    ticketInfo: [
      { sectionId: 'vip', sectionName: 'VIP', price: 240000, available: 80, total: 100 },
      { sectionId: 'standard', sectionName: 'Standard', price: 120000, available: 380, total: 450 },
      { sectionId: 'balcony', sectionName: 'Balcony', price: 96000, available: 200, total: 250 }
    ]
  },
  // EXHIBITION events
  {
    _id: '6507e2e2e2e2e2e2e2e2e010',
    title: 'Монгол Зураг - Орчин Үеийн Урлаг',
    description: 'Монголын орчин үеийн уран бүтээлчдийн үзэсгэлэн.',
    category: 'EXHIBITION',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Сараа Дорж'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f009',
    venueName: 'Misheel Expo',
    startDate: '2026-06-01T10:00:00Z',
    endDate: '2026-06-30T20:00:00Z',
    images: ['/images/art-exhibition.jpg'],
    thumbnail: '/images/art-exhibition.jpg',
    status: 'PUBLISHED',
    isFeatured: false,
    tags: ['art', 'exhibition', 'contemporary'],
    ticketInfo: [
      { sectionId: 'main-floor', sectionName: 'Main Floor', price: 15000, available: 4000, total: 4000 },
      { sectionId: 'gallery', sectionName: 'Gallery', price: 12000, available: 1000, total: 1000 }
    ]
  },
  {
    _id: '6507e2e2e2e2e2e2e2e2e011',
    title: 'Auto Show Mongolia 2026',
    description: 'Автомашины үзэсгэлэн. Шинэ загварууд, цахилгаан машинууд.',
    category: 'EXHIBITION',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Болд Батбаяр'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f009',
    venueName: 'Misheel Expo',
    startDate: '2026-09-01T10:00:00Z',
    endDate: '2026-09-07T20:00:00Z',
    images: ['/images/auto-show.jpg'],
    thumbnail: '/images/auto-show.jpg',
    status: 'PENDING',
    isFeatured: false,
    tags: ['auto', 'exhibition', 'electric cars'],
    ticketInfo: [
      { sectionId: 'main-floor', sectionName: 'Main Floor', price: 20000, available: 4000, total: 4000 },
      { sectionId: 'gallery', sectionName: 'Gallery', price: 16000, available: 1000, total: 1000 }
    ]
  },
  // OTHER category events
  {
    _id: '6507e2e2e2e2e2e2e2e2e012',
    title: 'Stand-up Comedy Night',
    description: 'Монголын шилдэг Stand-up комикууд. Инээдэм шог.',
    category: 'OTHER',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440005',
      name: 'Тэмүүлэн Ганбат'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f007',
    venueName: 'UB Palace',
    startDate: '2026-04-01T20:00:00Z',
    endDate: '2026-04-01T23:00:00Z',
    images: ['/images/comedy-night.jpg'],
    thumbnail: '/images/comedy-night.jpg',
    status: 'PUBLISHED',
    isFeatured: false,
    tags: ['comedy', 'standup', 'entertainment'],
    ticketInfo: [
      { sectionId: 'diamond', sectionName: 'Diamond', price: 150000, available: 50, total: 60 },
      { sectionId: 'gold', sectionName: 'Gold', price: 100000, available: 160, total: 200 },
      { sectionId: 'silver', sectionName: 'Silver', price: 75000, available: 450, total: 525 },
      { sectionId: 'bronze', sectionName: 'Bronze', price: 50000, available: 500, total: 600 }
    ]
  },
  {
    _id: '6507e2e2e2e2e2e2e2e2e013',
    title: 'Food Festival UB 2026',
    description: 'Хоолны их баяр. 100+ рестораны оролцоотой.',
    category: 'OTHER',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Болд Батбаяр'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f010',
    venueName: 'National Amusement Park Stage',
    startDate: '2026-07-15T11:00:00Z',
    endDate: '2026-07-17T22:00:00Z',
    images: ['/images/food-festival.jpg'],
    thumbnail: '/images/food-festival.jpg',
    status: 'DRAFT',
    isFeatured: false,
    tags: ['food', 'festival', 'outdoor'],
    ticketInfo: [
      { sectionId: 'front-stage', sectionName: 'Front Stage', price: 50000, available: 1000, total: 1000 },
      { sectionId: 'general', sectionName: 'General', price: 25000, available: 6000, total: 6000 },
      { sectionId: 'standing', sectionName: 'Standing Area', price: 15000, available: 2000, total: 2000 }
    ]
  },
  // CANCELLED event (replaced REJECTED as it's not in schema)
  {
    _id: '6507e2e2e2e2e2e2e2e2e014',
    title: 'Test Event - Cancelled',
    description: 'Энэ эвент цуцлагдсан. Тест зориулалтаар.',
    category: 'OTHER',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Сараа Дорж'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f004',
    venueName: 'Shangri-La Mall Event Hall',
    startDate: '2026-03-01T10:00:00Z',
    endDate: '2026-03-01T15:00:00Z',
    images: ['/images/test.jpg'],
    thumbnail: '/images/test.jpg',
    status: 'CANCELLED',
    isFeatured: false,
    tags: ['test'],
    ticketInfo: [
      { sectionId: 'main-hall', sectionName: 'Main Hall', price: 10000, available: 500, total: 500 }
    ]
  },
  // Regional event
  {
    _id: '6507e2e2e2e2e2e2e2e2e015',
    title: 'Дархан Rock Festival',
    description: 'Дархан хотод анх удаа болох рок фестиваль.',
    category: 'CONCERT',
    organizer: {
      id: '550e8400-e29b-41d4-a716-446655440005',
      name: 'Тэмүүлэн Ганбат'
    },
    venueId: '6507f1f1f1f1f1f1f1f1f011',
    venueName: 'Дархан Хүндэтгэлийн Ордон',
    startDate: '2026-08-20T16:00:00Z',
    endDate: '2026-08-20T23:00:00Z',
    images: ['/images/darkhan-rock.jpg'],
    thumbnail: '/images/darkhan-rock.jpg',
    status: 'PUBLISHED',
    isFeatured: false,
    tags: ['rock', 'festival', 'darkhan'],
    ticketInfo: [
      { sectionId: 'main', sectionName: 'Main', price: 60000, available: 550, total: 600 }
    ]
  }
];

// =====================================================
// BOOKINGS (12 bookings - various statuses)
// row = мөр (A=1, B=2, ...), seatNumber = суудлын дугаар
// =====================================================
const bookings = [
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440006',
    userEmail: 'user1@gmail.com',
    userName: 'Бат Эрдэнэ',
    eventId: '6507e2e2e2e2e2e2e2e2e001',
    eventTitle: 'The HU - Шинэ Жилийн Концерт',
    eventDate: '2026-12-31T18:00:00Z',
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
    eventDate: '2026-12-31T18:00:00Z',
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
    eventDate: '2026-04-15T19:00:00Z',
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
    eventDate: '2026-06-10T09:00:00Z',
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
    eventDate: '2026-09-15T17:00:00Z',
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
    eventDate: '2026-05-05T19:00:00Z',
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
    eventDate: '2026-08-10T18:30:00Z',
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
    eventDate: '2026-04-25T10:00:00Z',
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
    eventDate: '2026-04-01T20:00:00Z',
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
    eventDate: '2026-06-01T10:00:00Z',
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
    eventDate: '2026-08-20T16:00:00Z',
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
    eventDate: '2026-07-20T10:00:00Z',
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

// =====================================================
// NOTIFICATIONS (10 notifications)
// =====================================================
const notifications = [
  {
    _id: '650701010101010101010001',
    userId: '550e8400-e29b-41d4-a716-446655440006',
    type: 'BOOKING_CONFIRMED',
    title: 'Захиалга баталгаажлаа',
    message: 'Таны The HU концертын захиалга амжилттай баталгаажлаа.',
    data: { bookingId: '660e8400-e29b-41d4-a716-446655440001', eventId: '6507e2e2e2e2e2e2e2e2e001' },
    channel: 'EMAIL',
    status: 'SENT'
  },
  {
    _id: '650701010101010101010002',
    userId: '550e8400-e29b-41d4-a716-446655440007',
    type: 'BOOKING_CONFIRMED',
    title: 'Захиалга баталгаажлаа',
    message: 'Таны The HU концертын захиалга амжилттай баталгаажлаа.',
    data: { bookingId: '660e8400-e29b-41d4-a716-446655440002', eventId: '6507e2e2e2e2e2e2e2e2e001' },
    channel: 'EMAIL',
    status: 'SENT'
  },
  {
    _id: '650701010101010101010003',
    userId: '550e8400-e29b-41d4-a716-446655440012',
    type: 'BOOKING_CANCELLED',
    title: 'Захиалга цуцлагдлаа',
    message: 'Таны Балетын шөнө эвентийн захиалга цуцлагдлаа. Буцаалт: 240,000₮',
    data: { bookingId: '660e8400-e29b-41d4-a716-446655440007', refundAmount: 240000 },
    channel: 'EMAIL',
    status: 'SENT'
  },
  {
    _id: '650701010101010101010004',
    userId: '550e8400-e29b-41d4-a716-446655440003',
    type: 'EVENT_APPROVED',
    title: 'Эвент зөвшөөрөгдлөө',
    message: 'Таны "The HU - Шинэ Жилийн Концерт" эвент зөвшөөрөгдлөө.',
    data: { eventId: '6507e2e2e2e2e2e2e2e2e001' },
    channel: 'EMAIL',
    status: 'SENT'
  },
  {
    _id: '650701010101010101010005',
    userId: '550e8400-e29b-41d4-a716-446655440004',
    type: 'EVENT_REJECTED',
    title: 'Эвент татгалзагдлаа',
    message: 'Таны "Test Event - Rejected" эвент татгалзагдлаа.',
    data: { eventId: '6507e2e2e2e2e2e2e2e2e014', reason: 'Мэдээлэл дутуу' },
    channel: 'EMAIL',
    status: 'SENT'
  },
  {
    _id: '650701010101010101010006',
    userId: '550e8400-e29b-41d4-a716-446655440006',
    type: 'EVENT_REMINDER',
    title: 'Эвент сануулга',
    message: 'The HU концерт маргааш болно!',
    data: { eventId: '6507e2e2e2e2e2e2e2e2e001' },
    channel: 'EMAIL',
    status: 'PENDING'
  },
  {
    _id: '650701010101010101010007',
    userId: '550e8400-e29b-41d4-a716-446655440008',
    type: 'BOOKING_CONFIRMED',
    title: 'Захиалга баталгаажлаа',
    message: 'Таны Magnolian концертын захиалга амжилттай баталгаажлаа.',
    data: { bookingId: '660e8400-e29b-41d4-a716-446655440003', eventId: '6507e2e2e2e2e2e2e2e2e002' },
    channel: 'IN_APP',
    status: 'READ'
  },
  {
    _id: '650701010101010101010008',
    userId: '550e8400-e29b-41d4-a716-446655440009',
    type: 'SYSTEM',
    title: 'Тавтай морилно уу!',
    message: 'EventMN системд тавтай морилно уу. Эвентүүдээ сонгоорой!',
    data: {},
    channel: 'IN_APP',
    status: 'SENT'
  },
  {
    _id: '650701010101010101010009',
    userId: '550e8400-e29b-41d4-a716-446655440010',
    type: 'BOOKING_CONFIRMED',
    title: 'Захиалга баталгаажлаа',
    message: 'Таны UFC тулааны захиалга амжилттай баталгаажлаа.',
    data: { bookingId: '660e8400-e29b-41d4-a716-446655440005', eventId: '6507e2e2e2e2e2e2e2e2e006' },
    channel: 'EMAIL',
    status: 'SENT'
  },
  {
    _id: '650701010101010101010010',
    userId: '550e8400-e29b-41d4-a716-446655440003',
    type: 'EVENT_APPROVED',
    title: 'Эвент зөвшөөрөгдлөө',
    message: 'Таны "Magnolian - Acoustic Night" эвент зөвшөөрөгдлөө.',
    data: { eventId: '6507e2e2e2e2e2e2e2e2e002' },
    channel: 'EMAIL',
    status: 'SENT'
  }
];

// Export all mock data
module.exports = {
  users,
  venues,
  events,
  bookings,
  notifications
};

// Display summary
console.log('='.repeat(50));
console.log('EventMN Mock Data Summary');
console.log('='.repeat(50));
console.log(`Users: ${users.length}`);
console.log(`  - Admins: ${users.filter(u => u.role === 'ADMIN').length}`);
console.log(`  - Organizers: ${users.filter(u => u.role === 'ORGANIZER').length}`);
console.log(`  - Users: ${users.filter(u => u.role === 'USER').length}`);
console.log(`Venues: ${venues.length}`);
console.log(`Events: ${events.length}`);
console.log(`  - Published: ${events.filter(e => e.status === 'PUBLISHED').length}`);
console.log(`  - Pending: ${events.filter(e => e.status === 'PENDING').length}`);
console.log(`  - Draft: ${events.filter(e => e.status === 'DRAFT').length}`);
console.log(`  - Cancelled: ${events.filter(e => e.status === 'CANCELLED').length}`);
console.log(`Bookings: ${bookings.length}`);
console.log(`  - Confirmed: ${bookings.filter(b => b.status === 'CONFIRMED').length}`);
console.log(`  - Pending: ${bookings.filter(b => b.status === 'PENDING').length}`);
console.log(`  - Cancelled: ${bookings.filter(b => b.status === 'CANCELLED').length}`);
console.log(`Notifications: ${notifications.length}`);
console.log('='.repeat(50));
