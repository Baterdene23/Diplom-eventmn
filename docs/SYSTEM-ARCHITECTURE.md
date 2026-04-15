# EventMN Microservices - Системийн Архитектур ба Тайлбар

> **Зорилго**: Энэхүү баримт бичиг нь EventMN платформын бүрэн тайлбар, сервисүүдийн хоорондын холболт, өгөгдлийн сангийн бүтэц, deploy хийх заавар болон сайжруулах саналуудыг агуулна.

---

## 📋 Агуулга

1. [Системийн Тойм](#1-системийн-тойм)
2. [Архитектурын Диаграм](#2-архитектурын-диаграм)
3. [Сервисүүдийн Дэлгэрэнгүй Тайлбар](#3-сервисүүдийн-дэлгэрэнгүй-тайлбар)
4. [Өгөгдлийн Сан ба Технологиуд](#4-өгөгдлийн-сан-ба-технологиуд)
5. [RabbitMQ - Мессеж Брокер](#5-rabbitmq---мессеж-брокер)
6. [Redis - Кэш ба Seat Locking](#6-redis---кэш-ба-seat-locking)
7. [Сервисүүдийн Хоорондын Харилцаа](#7-сервисүүдийн-хоорондын-харилцаа)
8. [Deploy Хийх Заавар](#8-deploy-хийх-заавар)
9. [Сайжруулах Саналууд](#9-сайжруулах-саналууд)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Системийн Тойм

### 1.1 EventMN гэж юу вэ?

EventMN нь **арга хэмжээний тасалбар захиалах платформ** бөгөөд дараах боломжуудыг олгоно:
- Хэрэглэгчид: Арга хэмжээ хайх, суудал сонгох, тасалбар захиалах
- Зохион байгуулагчид: Арга хэмжээ үүсгэх, удирдах, тайлан харах
- Админ: Системийг хянах, арга хэмжээг зөвшөөрөх/татгалзах

### 1.2 Технологийн Stack

| Давхарга | Технологи |
|----------|-----------|
| **Runtime** | Node.js 20 |
| **Framework** | Next.js 14 (App Router) |
| **Frontend** | React 18, Tailwind CSS, Zustand |
| **PostgreSQL ORM** | Prisma 5 |
| **DB Access** | Prisma 5 |
| **Caching** | Redis 7 (ioredis) |
| **Message Broker** | RabbitMQ 3.12 (amqplib) |
| **Email** | Nodemailer |
| **Validation** | Zod |
| **Auth** | JWT + bcryptjs |
| **Container** | Docker + Docker Compose |

### 1.3 Сервисүүдийн Хураангуй

| Сервис | Порт | Өгөгдлийн Сан | Гол Үүрэг |
|--------|------|---------------|-----------|
| **Gateway** | 3000 | - | API маршрутлалт, JWT баталгаажуулалт |
| **User Service** | 3001 | PostgreSQL (schema=user) | Хэрэглэгч, нэвтрэлт, OTP |
| **Event Service** | 3002 | PostgreSQL (schema=event) | Арга хэмжээ, байршил |
| **Booking Service** | 3003 | PostgreSQL (schema=booking) + Redis | Захиалга, суудал түгжих |
| **Notification Service** | 3004 | PostgreSQL (schema=notification) | Мэдэгдэл, имэйл |
| **Frontend** | 8080 | - | Хэрэглэгчийн интерфейс |

---

## 2. Архитектурын Диаграм

### 2.1 Ерөнхий Архитектур

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   ХЭРЭГЛЭГЧ                                      │
│                              (Web Browser / Mobile)                              │
└─────────────────────────────────────┬───────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Port 8080)                                │
│                    Next.js 14 + React 18 + Tailwind + Zustand                   │
└─────────────────────────────────────┬───────────────────────────────────────────┘
                                      │ HTTP Requests
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY (Port 3000)                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  • JWT Баталгаажуулалт                                                   │    │
│  │  • Маршрутлалт (Routing)                                                 │    │
│  │  • Rate Limiting (хэрэгжүүлэх шаардлагатай)                              │    │
│  │  • Request/Response Logging                                              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└──────┬──────────────┬──────────────┬──────────────┬──────────────────────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ USER SERVICE │ │EVENT SERVICE │ │BOOKING SERV. │ │NOTIF. SERVICE│
│  Port 3001   │ │  Port 3002   │ │  Port 3003   │ │  Port 3004   │
│              │ │              │ │              │ │              │
│ • Нэвтрэлт   │ │ • Арга хэмжээ│ │ • Захиалга   │ │ • Имэйл      │
│ • Бүртгэл    │ │ • Байршил    │ │ • Төлбөр     │ │ • SMS        │
│ • OTP        │ │ • Суудлын    │ │ • Суудал     │ │ • Push       │
│ • JWT        │ │   тохиргоо   │ │   түгжих     │ │              │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │                │
       ▼                ▼                │                │
┌──────────────────────────────────────────────────────────────────────────┐
│               PostgreSQL 15 (schema-per-service)                          │
│  Schemas: user (users, otps, tokens)                                      │
│           event (events, venues)                                          │
│           booking (bookings, seats)                                       │
│           notification (notifications)                                    │
└──────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │    REDIS     │
                                  │  Port 6379   │
                                  │              │
                                  │ • Seat Lock  │
                                  │ • Cache      │
                                  │ • Session    │
                                  └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           RABBITMQ (Port 5672, 15672)                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        Exchange: "eventmn" (topic)                       │    │
│  │                                                                          │    │
│  │  booking.confirmed ──────┐                                               │    │
│  │  booking.cancelled ──────┼─────► Notification Service                    │    │
│  │  event.approved ─────────┤                                               │    │
│  │  event.rejected ─────────┤                                               │    │
│  │  event.reminder ─────────┘                                               │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Request Flow Диаграм

```
                           Хэрэглэгчийн Захиалга Хийх Урсгал
                           ═══════════════════════════════════

Хэрэглэгч          Frontend          Gateway         Booking        Redis        RabbitMQ      Notification
    │                  │                │               │             │              │              │
    │ 1. Суудал сонгох │                │               │             │              │              │
    │─────────────────►│                │               │             │              │              │
    │                  │ 2. POST /seats/lock            │             │              │              │
    │                  │───────────────►│               │             │              │              │
    │                  │                │ 3. Proxy      │             │              │              │
    │                  │                │──────────────►│             │              │              │
    │                  │                │               │ 4. SETNX    │              │              │
    │                  │                │               │────────────►│              │              │
    │                  │                │               │   (TTL 10m) │              │              │
    │                  │                │               │◄────────────│              │              │
    │                  │                │◄──────────────│             │              │              │
    │                  │◄───────────────│               │             │              │              │
    │◄─────────────────│ 5. Locked OK   │               │             │              │              │
    │                  │                │               │             │              │              │
    │ 6. Төлбөр хийх   │                │               │             │              │              │
    │─────────────────►│                │               │             │              │              │
    │                  │ 7. POST /bookings/confirm      │             │              │              │
    │                  │───────────────►│               │             │              │              │
    │                  │                │──────────────►│             │              │              │
    │                  │                │               │ 8. Publish  │              │              │
    │                  │                │               │─────────────┼─────────────►│              │
    │                  │                │               │             │              │ 9. Consume   │
    │                  │                │               │             │              │─────────────►│
    │                  │                │               │             │              │              │ 10. Send
    │                  │                │               │             │              │              │    Email
    │                  │                │◄──────────────│             │              │              │
    │                  │◄───────────────│               │             │              │              │
    │◄─────────────────│ 11. Success    │               │             │              │              │
    │                  │                │               │             │              │              │
```

---

## 3. Сервисүүдийн Дэлгэрэнгүй Тайлбар

### 3.1 API Gateway (Port 3000)

**Үүрэг**: Бүх API хүсэлтүүдийг хүлээн авч, зохих сервис рүү дамжуулна.

**Файлын Бүтэц**:
```
gateway/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── [...path]/
│   │           └── route.ts    # Catch-all proxy router
│   └── lib/
│       └── auth.ts             # JWT verification
├── Dockerfile
├── package.json
└── .env.example
```

**Гол Функцууд**:

1. **Маршрутлалт (Routing)**:
   ```typescript
   // route.ts
   const SERVICE_MAP = {
     auth: USER_SERVICE_URL,      // /api/auth/* -> User Service
     users: USER_SERVICE_URL,     // /api/users/* -> User Service
     events: EVENT_SERVICE_URL,   // /api/events/* -> Event Service
     venues: EVENT_SERVICE_URL,   // /api/venues/* -> Event Service
     bookings: BOOKING_SERVICE_URL, // /api/bookings/* -> Booking Service
     seats: BOOKING_SERVICE_URL,  // /api/seats/* -> Booking Service
     notifications: NOTIFICATION_SERVICE_URL,
   };
   ```

2. **JWT Баталгаажуулалт**:
   - Bearer token шалгах
   - Token decode хийж хэрэглэгчийн мэдээллийг header-т нэмэх
   - `x-user-id`, `x-user-email`, `x-user-role` header

3. **Нээлттэй ба Хамгаалагдсан Endpoint**:
   ```typescript
    const PUBLIC_PATHS = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/events',        // GET only
      '/api/venues',        // GET only
    ];
    ```

4. **Gateway -> Services Internal Signature (HMAC)**:
   - Gateway нь downstream сервисүүд рүү дамжуулахдаа `x-internal-ts`, `x-internal-signature` header-үүдийг нэмнэ.
   - Service бүр `requireGatewaySignature()` ашиглан эдгээрийг шалгаж, gateway-аас ирээгүй шууд дуудлагыг хаана.
   - Implementation proof:
     - Sign + forward: `gateway/src/app/api/[...path]/route.ts`
     - Verify: `services/*/src/lib/internal-auth.ts`

---

### 3.2 User Service (Port 3001)

**Үүрэг**: Хэрэглэгчийн бүртгэл, нэвтрэлт, OTP баталгаажуулалт.

**Өгөгдлийн Сан**: PostgreSQL (Port 5432) + Prisma ORM

**Файлын Бүтэц**:
```
services/user-service/
├── src/
│   ├── app/api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── refresh/route.ts
│   │   │   ├── verify-otp/route.ts
│   │   │   ├── resend-otp/route.ts
│   │   │   └── become-organizer/route.ts
│   │   ├── users/
│   │   │   ├── route.ts         # GET current user
│   │   │   ├── [id]/route.ts    # GET/PATCH/DELETE user
│   │   │   └── profile/route.ts
│   │   └── admin/
│   │       └── users/route.ts   # Admin user management
│   └── lib/
│       ├── prisma.ts           # Prisma client singleton
│       ├── auth.ts             # JWT, password hashing
│       └── otp.ts              # OTP generation
├── prisma/
│   └── schema.prisma
├── Dockerfile
└── package.json
```

**Prisma Schema**:
```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  phone           String?   @unique
  password        String
  firstName       String
  lastName        String
  role            Role      @default(USER)
  isVerified      Boolean   @default(false)
  isActive        Boolean   @default(true)
  avatar          String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  otps            UserOtp[]
  refreshTokens   RefreshToken[]
  organizerProfile OrganizerProfile?
  activityLogs    UserActivityLog[]
}

enum Role {
  USER
  ORGANIZER
  ADMIN
}
```

**API Endpoints**:

| Method | Endpoint | Тайлбар |
|--------|----------|---------|
| POST | `/api/auth/register` | Шинэ хэрэглэгч бүртгэх |
| POST | `/api/auth/login` | Нэвтрэх (JWT буцаана) |
| POST | `/api/auth/refresh` | Access token шинэчлэх |
| POST | `/api/auth/verify-otp` | OTP баталгаажуулах |
| POST | `/api/auth/resend-otp` | OTP дахин илгээх |
| POST | `/api/auth/become-organizer` | Зохион байгуулагч болох хүсэлт |
| GET | `/api/users/me` | Одоогийн хэрэглэгчийн мэдээлэл |
| PATCH | `/api/users/:id` | Хэрэглэгч засах |
| GET | `/api/admin/users` | Бүх хэрэглэгчид (Admin) |

---

### 3.3 Event Service (Port 3002)

**Үүрэг**: Арга хэмжээ, байршил, суудлын тохиргоо удирдах.

**Өгөгдлийн Сан**: PostgreSQL + Prisma (schema=`event`)

**Файлын Бүтэц**:
```
services/event-service/
├── src/
│   ├── app/api/
│   │   ├── events/
│   │   │   ├── route.ts              # GET list, POST create
│   │   │   └── [id]/route.ts         # GET, PATCH, DELETE
│   │   ├── venues/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── admin/
│   │       └── events/
│   │           ├── route.ts          # GET all events
│   │           └── [id]/
│   │               ├── approve/route.ts
│   │               └── reject/route.ts
│   └── lib/
│       ├── internal-auth.ts
│       ├── prisma.ts
│       └── rabbitmq.ts
├── prisma/
│   └── schema.prisma
├── Dockerfile
└── package.json
```

**Prisma Schema (товч)**: `services/event-service/prisma/schema.prisma`

```prisma
enum EventStatus {
  DRAFT
  PENDING
  PUBLISHED
  CANCELLED
  COMPLETED
}

model Event {
  id            String      @id @default(uuid())
  title         String
  description   String
  category      EventCategory
  venueId       String?
  venueName     String?
  startDate     DateTime
  endDate       DateTime
  images        String[]
  thumbnail     String?
  organizerId   String
  organizerName String
  status        EventStatus @default(DRAFT)
  tags          String[]
  ticketInfo    Json?
}
```

**Тэмдэглэл**: Суудлын/тасалбарын уян хатан бүтэц (sections/tickets) нь PostgreSQL дээр Prisma-ийн `Json` талбараар хадгалагдана.

**RabbitMQ Интеграци**:
- Event approve/reject үед Notification Service рүү мессеж илгээнэ
- Routing keys: `event.approved`, `event.rejected`
- Event reminder нь Booking Service доторх reminder scheduler-оос `event.reminder` routing key-ээр publish хийгдэж, Notification Service consume хийж `EVENT_REMINDER` notification үүсгэнэ

---

### 3.4 Booking Service (Port 3003)

**Үүрэг**: Захиалга үүсгэх, суудал түгжих, төлбөр баталгаажуулах.

**Өгөгдлийн Сан**: PostgreSQL (Port 5433) + Redis (Port 6379)

**Файлын Бүтэц**:
```
services/booking-service/
├── src/
│   ├── app/api/
│   │   ├── bookings/
│   │   │   ├── route.ts              # GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET, DELETE
│   │   │       ├── confirm/route.ts  # Confirm payment
│   │   │       └── cancel/route.ts   # Cancel booking
│   │   └── seats/
│   │       ├── lock/route.ts         # Lock seats
│   │       ├── unlock/route.ts       # Unlock seats
│   │       └── status/route.ts       # Get seat status
│   └── lib/
│       ├── prisma.ts
│       ├── redis.ts
│       └── rabbitmq.ts
├── prisma/
│   └── schema.prisma
├── Dockerfile
└── package.json
```

**Prisma Schema**:
```prisma
model Booking {
  id            String        @id @default(uuid())
  userId        String
  eventId       String
  status        BookingStatus @default(PENDING)
  totalAmount   Decimal       @db.Decimal(10, 2)
  paymentMethod String?
  paymentId     String?
  qrCode        String?
  expiresAt     DateTime
  confirmedAt   DateTime?
  cancelledAt   DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  seats         BookingSeat[]
}

model BookingSeat {
  id          String  @id @default(uuid())
  bookingId   String
  sectionId   String
  row         Int
  seatNumber  Int
  price       Decimal @db.Decimal(10, 2)
  
  booking     Booking @relation(fields: [bookingId], references: [id])
  
  @@unique([bookingId, sectionId, row, seatNumber])
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  EXPIRED
}
```

**Redis Seat Locking**:
```typescript
// redis.ts
const SEAT_LOCK_TTL = 600; // 10 минут

export async function lockSeats(
  eventId: string,
  seats: Array<{ sectionId: string; row: number; seatNumber: number }>,
  userId: string
): Promise<{ success: boolean; locked: string[]; failed: string[] }> {
  const pipeline = redis.pipeline();
  
  for (const seat of seats) {
    const key = `seat:${eventId}:${seat.sectionId}:${seat.row}:${seat.seatNumber}`;
    pipeline.set(key, userId, 'EX', SEAT_LOCK_TTL, 'NX');
  }
  
  const results = await pipeline.exec();
  // ... process results
}

export async function unlockSeats(
  eventId: string,
  seats: Array<{ sectionId: string; row: number; seatNumber: number }>,
  userId: string
): Promise<void> {
  const pipeline = redis.pipeline();
  
  for (const seat of seats) {
    const key = `seat:${eventId}:${seat.sectionId}:${seat.row}:${seat.seatNumber}`;
    // Only delete if the lock belongs to this user
    pipeline.eval(
      `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`,
      1, key, userId
    );
  }
  
  await pipeline.exec();
}
```

**Буцаалтын Бодлого (Refund Policy)**:
```typescript
function calculateRefund(event: { startDate: Date }, booking: { totalAmount: number }) {
  const hoursUntilEvent = (event.startDate.getTime() - Date.now()) / (1000 * 60 * 60);
  
  if (hoursUntilEvent >= 48) return booking.totalAmount * 1.0;   // 100%
  if (hoursUntilEvent >= 24) return booking.totalAmount * 0.5;   // 50%
  return 0; // Буцаалт байхгүй
}
```

---

### 3.5 Notification Service (Port 3004)

**Үүрэг**: Имэйл, SMS, push мэдэгдэл илгээх.

**Өгөгдлийн Сан**: PostgreSQL + Prisma (schema=`notification`)

**Файлын Бүтэц**:
```
services/notification-service/
├── src/
│   ├── app/api/
│   │   ├── notifications/
│   │   │   └── route.ts          # GET user notifications, POST mark-as-read
│   │   ├── admin/broadcast/route.ts # Admin broadcast
│   │   └── send/route.ts         # Manual send (admin)
│   └── lib/
│       ├── internal-auth.ts
│       ├── prisma.ts
│       ├── rabbitmq.ts
│       ├── consumer.ts           # Message handlers
│       └── email.ts              # Email templates
├── instrumentation.ts            # Start consumer on boot
├── prisma/
│   └── schema.prisma
├── Dockerfile
└── package.json
```

**Message Consumer**:
```typescript
// consumer.ts
export async function startConsumer() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  
  await channel.assertExchange('eventmn', 'topic', { durable: true });
  
  // Booking confirmations
  const bookingQueue = await channel.assertQueue('booking-notifications', { durable: true });
  await channel.bindQueue(bookingQueue.queue, 'eventmn', 'booking.*');
  
  // Event notifications
  const eventQueue = await channel.assertQueue('event-notifications', { durable: true });
  await channel.bindQueue(eventQueue.queue, 'eventmn', 'event.*');
  
  channel.consume(bookingQueue.queue, async (msg) => {
    if (!msg) return;
    
    const { routingKey } = msg.fields;
    const data = JSON.parse(msg.content.toString());
    
    switch (routingKey) {
      case 'booking.confirmed':
        await sendBookingConfirmation(data);
        break;
      case 'booking.cancelled':
        await sendBookingCancellation(data);
        break;
    }
    
    channel.ack(msg);
  });
}
```

**Email Templates**:
```typescript
// email.ts
export async function sendBookingConfirmation(booking: BookingData) {
  await transporter.sendMail({
    to: booking.userEmail,
    subject: `Захиалга баталгаажлаа - ${booking.eventTitle}`,
    html: `
      <h1>Захиалга Амжилттай!</h1>
      <p>Таны ${booking.eventTitle} арга хэмжээний тасалбар баталгаажлаа.</p>
      <p>Захиалгын дугаар: ${booking.bookingId}</p>
      <p>Огноо: ${booking.eventDate}</p>
      <p>Суудал: ${booking.seats.join(', ')}</p>
      <img src="${booking.qrCode}" alt="QR Code" />
    `
  });
}
```

---

### 3.6 Frontend (Port 8080)

**Үүрэг**: Хэрэглэгчийн интерфейс.

**Технологи**: Next.js 14 + React 18 + Tailwind CSS + Zustand

**Файлын Бүтэц**:
```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Нүүр хуудас
│   │   ├── layout.tsx                  # Root layout
│   │   ├── events/
│   │   │   ├── page.tsx                # Event listing
│   │   │   └── [id]/page.tsx           # Event details
│   │   ├── booking/
│   │   │   ├── [eventId]/page.tsx      # Seat selection
│   │   │   └── confirm/[id]/page.tsx   # Payment
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # User dashboard
│   │   │   ├── bookings/page.tsx       # My bookings
│   │   │   └── events/page.tsx         # My events (organizer)
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── users/page.tsx
│   │       └── events/page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── events/
│   │   │   ├── EventCard.tsx
│   │   │   ├── EventList.tsx
│   │   │   └── SeatMap.tsx
│   │   ├── booking/
│   │   │   └── BookingForm.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Modal.tsx
│   ├── lib/
│   │   ├── api.ts                      # API client
│   │   └── utils.ts
│   └── store/
│       └── index.ts                    # Zustand store
├── tailwind.config.js
├── Dockerfile
└── package.json
```

**Zustand Store**:
```typescript
// store/index.ts
interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  selectedSeats: Seat[];
  
  setUser: (user: User | null) => void;
  addSeat: (seat: Seat) => void;
  removeSeat: (seatId: string) => void;
  clearSeats: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  selectedSeats: [],
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  addSeat: (seat) => set((state) => ({ 
    selectedSeats: [...state.selectedSeats, seat] 
  })),
  removeSeat: (seatId) => set((state) => ({
    selectedSeats: state.selectedSeats.filter(s => s.id !== seatId)
  })),
  clearSeats: () => set({ selectedSeats: [] }),
}));
```

---

## 4. Өгөгдлийн Сан ба Технологиуд

### 4.1 PostgreSQL + Prisma

**Хаана хэрэглэгдэж байна**:
- User Service (schema=`user`)
- Event Service (schema=`event`)
- Booking Service (schema=`booking`)
- Notification Service (schema=`notification`)

**Яагаад PostgreSQL сонгосон**:
- ACID транзакцууд (захиалга, төлбөр)
- Нарийвчилсан query боломж
- Индекс ба query optimization
- Prisma ORM-тай маш сайн ажилладаг

**Schema-per-service (нэг DB дээр schema-гаар тусгаарлах)**:
- `docker-compose.yml` дээр нэг `postgres` container ажиллана (host: `5433`, container: `5432`).
- Сервис бүр `DATABASE_URL`-даа `?schema=user|event|booking|notification` гэж зааж тус тусын schema-д table-аа үүсгэнэ.

**Prisma Connection**:
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Prisma Commands**:
```bash
# Schema sync
npx prisma db push

# Migration
npx prisma migrate dev --name init

# Generate client
npx prisma generate

# Studio (GUI)
npx prisma studio
```

---

### 4.2 Уян хатан өгөгдөл (JSON)

Event/Venue-ийн “tickets/sections” зэрэг бүтэц нь өөрчлөгдөх боломжтой тул NoSQL ашиглахын оронд PostgreSQL дээр Prisma-ийн `Json` талбараар хадгалж байна. Ингэснээр:
- Нэг DB (PostgreSQL) дээр бүх сервисийн өгөгдөл төвлөрнө
- Prisma-аар type-safe access хийнэ
- Migration, backup, мониторинг нэг цэгт хялбар болно

---

## 5. RabbitMQ - Мессеж Брокер

### 5.1 RabbitMQ гэж юу вэ?

RabbitMQ нь **message broker** бөгөөд сервисүүд хооронд асинхрон мессеж дамжуулахад хэрэглэгддэг. Энэ нь:
- Сервисүүдийг decoupled байлгана
- Найдвартай мессеж дамжуулалт
- Load balancing
- Retry механизм

### 5.2 Тохиргоо

```yaml
# docker-compose.yml
rabbitmq:
  image: rabbitmq:3.12-management
  ports:
    - "5672:5672"    # AMQP protocol
    - "15672:15672"  # Management UI
  environment:
    RABBITMQ_DEFAULT_USER: rabbitmq
    RABBITMQ_DEFAULT_PASS: rabbitmq123
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
```

### 5.3 Exchange ба Queues

```
┌─────────────────────────────────────────────────────────────────┐
│                    Exchange: "eventmn" (topic)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ booking.*       │ │ event.*         │ │ user.*          │
│                 │ │                 │ │                 │
│ • confirmed     │ │ • approved      │ │ • registered    │
│ • cancelled     │ │ • rejected      │ │ • verified      │
│ • expired       │ │ • reminder      │ │                 │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
              ┌───────────────────────────┐
              │   NOTIFICATION SERVICE    │
              │                           │
               │  • Save to PostgreSQL     │
              │  • Send Email             │
              │  • Send SMS (future)      │
              │  • Push notification      │
              └───────────────────────────┘
```

### 5.4 Publisher Code

```typescript
// services/booking-service/src/lib/rabbitmq.ts
import amqp, { Channel, Connection } from 'amqplib';

let connection: Connection | null = null;
let channel: Channel | null = null;

export async function getChannel(): Promise<Channel> {
  if (channel) return channel;
  
  connection = await amqp.connect(process.env.RABBITMQ_URL!);
  channel = await connection.createChannel();
  
  await channel.assertExchange('eventmn', 'topic', { durable: true });
  
  return channel;
}

export async function publishMessage(
  routingKey: string,
  message: object
): Promise<void> {
  const ch = await getChannel();
  
  ch.publish(
    'eventmn',
    routingKey,
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );
  
  console.log(`Published to ${routingKey}:`, message);
}

// Usage
await publishMessage('booking.confirmed', {
  bookingId: booking.id,
  userId: booking.userId,
  userEmail: user.email,
  eventId: booking.eventId,
  eventTitle: event.title,
  seats: booking.seats,
  totalAmount: booking.totalAmount,
});
```

### 5.5 Consumer Code

```typescript
// services/notification-service/src/lib/consumer.ts
import amqp from 'amqplib';
import { sendBookingConfirmation, sendBookingCancellation } from './email';
import { Notification } from '../models/Notification';

export async function startConsumer() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL!);
  const channel = await connection.createChannel();
  
  await channel.assertExchange('eventmn', 'topic', { durable: true });
  
  // Queue for booking notifications
  const bookingQueue = await channel.assertQueue('booking-notifications', {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'eventmn-dlx', // Dead letter exchange
    }
  });
  
  await channel.bindQueue(bookingQueue.queue, 'eventmn', 'booking.*');
  
  channel.consume(bookingQueue.queue, async (msg) => {
    if (!msg) return;
    
    try {
      const routingKey = msg.fields.routingKey;
      const data = JSON.parse(msg.content.toString());
      
      // Save notification to database
      await Notification.create({
        userId: data.userId,
        type: routingKey,
        title: getNotificationTitle(routingKey),
        message: getNotificationMessage(routingKey, data),
        data: data,
        isRead: false,
      });
      
      // Send email
      switch (routingKey) {
        case 'booking.confirmed':
          await sendBookingConfirmation(data);
          break;
        case 'booking.cancelled':
          await sendBookingCancellation(data);
          break;
      }
      
      channel.ack(msg);
    } catch (error) {
      console.error('Error processing message:', error);
      // Negative acknowledgment - will retry or go to DLQ
      channel.nack(msg, false, false);
    }
  });
  
  console.log('Consumer started, waiting for messages...');
}
```

### 5.6 Message Format

```typescript
// Booking Confirmed Message
{
  bookingId: "uuid",
  userId: "user-uuid",
  userEmail: "user@example.com",
  userName: "John Doe",
  eventId: "event-id",
  eventTitle: "Concert 2024",
  eventDate: "2024-06-15T19:00:00Z",
  venueName: "Arena",
  seats: [
    { section: "VIP", row: 1, seat: 5 },
    { section: "VIP", row: 1, seat: 6 }
  ],
  totalAmount: 150000,
  qrCode: "data:image/png;base64,..."
}

// Event Approved Message
{
  eventId: "event-id",
  organizerId: "organizer-uuid",
  organizerEmail: "organizer@example.com",
  eventTitle: "Concert 2024",
  approvedAt: "2024-01-15T10:00:00Z"
}
```

---

## 6. Redis - Кэш ба Seat Locking

### 6.1 Redis гэж юу вэ?

Redis нь **in-memory data store** бөгөөд:
- Маш хурдан (memory-based)
- TTL (Time To Live) дэмждэг
- Atomic operations (SETNX, INCR)
- Pub/Sub боломж

### 6.2 Seat Locking Механизм

**Асуудал**: Олон хэрэглэгч нэгэн зэрэг ижил суудал сонгох үед race condition үүсч болно.

**Шийдэл**: Redis SETNX (Set if Not Exists) + TTL

```
┌─────────────────────────────────────────────────────────────────┐
│                     SEAT LOCKING FLOW                           │
└─────────────────────────────────────────────────────────────────┘

User A                    Redis                    User B
  │                         │                         │
  │ 1. Lock Seat A1         │                         │
  │ ───────────────────────►│                         │
  │                         │ SETNX seat:A1 = userA   │
  │                         │ TTL = 600s              │
  │ ◄─────────────────────  │                         │
  │ Success!                │                         │
  │                         │                         │
  │                         │         2. Lock Seat A1 │
  │                         │ ◄────────────────────── │
  │                         │ SETNX seat:A1 = userB   │
  │                         │ (Key exists - FAIL)     │
  │                         │ ──────────────────────► │
  │                         │                  FAIL!  │
  │                         │                         │
  │                         │                         │
  │ (User A doesn't pay)    │                         │
  │                         │                         │
  │                         │ 10 minutes later...     │
  │                         │ TTL expires             │
  │                         │ Key deleted             │
  │                         │                         │
  │                         │         3. Lock Seat A1 │
  │                         │ ◄────────────────────── │
  │                         │ SETNX seat:A1 = userB   │
  │                         │ TTL = 600s              │
  │                         │ ──────────────────────► │
  │                         │                 Success!│
```

### 6.3 Redis Code Implementation

```typescript
// services/booking-service/src/lib/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

const SEAT_LOCK_TTL = 600; // 10 minutes in seconds

interface SeatIdentifier {
  sectionId: string;
  row: number;
  seatNumber: number;
}

// Generate Redis key for a seat
function getSeatKey(eventId: string, seat: SeatIdentifier): string {
  return `seat:${eventId}:${seat.sectionId}:${seat.row}:${seat.seatNumber}`;
}

// Lock multiple seats atomically
export async function lockSeats(
  eventId: string,
  seats: SeatIdentifier[],
  userId: string
): Promise<{ success: boolean; locked: string[]; failed: string[] }> {
  const pipeline = redis.pipeline();
  const keys: string[] = [];
  
  for (const seat of seats) {
    const key = getSeatKey(eventId, seat);
    keys.push(key);
    // SETNX with TTL using SET NX EX
    pipeline.set(key, userId, 'EX', SEAT_LOCK_TTL, 'NX');
  }
  
  const results = await pipeline.exec();
  
  const locked: string[] = [];
  const failed: string[] = [];
  
  results?.forEach((result, index) => {
    if (result[1] === 'OK') {
      locked.push(keys[index]);
    } else {
      failed.push(keys[index]);
    }
  });
  
  // If any seat failed to lock, unlock all that were locked
  if (failed.length > 0 && locked.length > 0) {
    await unlockSeats(eventId, 
      seats.filter((_, i) => results?.[i][1] === 'OK'), 
      userId
    );
    return { success: false, locked: [], failed: keys };
  }
  
  return { 
    success: failed.length === 0, 
    locked, 
    failed 
  };
}

// Unlock seats (only if owned by user)
export async function unlockSeats(
  eventId: string,
  seats: SeatIdentifier[],
  userId: string
): Promise<number> {
  const luaScript = `
    if redis.call('get', KEYS[1]) == ARGV[1] then
      return redis.call('del', KEYS[1])
    else
      return 0
    end
  `;
  
  const pipeline = redis.pipeline();
  
  for (const seat of seats) {
    const key = getSeatKey(eventId, seat);
    pipeline.eval(luaScript, 1, key, userId);
  }
  
  const results = await pipeline.exec();
  return results?.filter(r => r[1] === 1).length || 0;
}

// Get status of multiple seats
export async function getSeatStatuses(
  eventId: string,
  seats: SeatIdentifier[]
): Promise<Map<string, string | null>> {
  const pipeline = redis.pipeline();
  const keys: string[] = [];
  
  for (const seat of seats) {
    const key = getSeatKey(eventId, seat);
    keys.push(key);
    pipeline.get(key);
  }
  
  const results = await pipeline.exec();
  const statuses = new Map<string, string | null>();
  
  results?.forEach((result, index) => {
    statuses.set(keys[index], result[1] as string | null);
  });
  
  return statuses;
}

// Extend lock TTL (when user is still active)
export async function extendLock(
  eventId: string,
  seats: SeatIdentifier[],
  userId: string
): Promise<boolean> {
  const luaScript = `
    if redis.call('get', KEYS[1]) == ARGV[1] then
      return redis.call('expire', KEYS[1], ARGV[2])
    else
      return 0
    end
  `;
  
  const pipeline = redis.pipeline();
  
  for (const seat of seats) {
    const key = getSeatKey(eventId, seat);
    pipeline.eval(luaScript, 1, key, userId, SEAT_LOCK_TTL);
  }
  
  const results = await pipeline.exec();
  return results?.every(r => r[1] === 1) || false;
}
```

### 6.4 Redis Key Pattern

```
seat:{eventId}:{sectionId}:{row}:{seatNumber}
     │          │          │     │
     │          │          │     └── Суудлын дугаар (1, 2, 3...)
     │          │          └──────── Эгнээ (1, 2, 3...)
     │          └─────────────────── Section ID (VIP, Regular...)
     └────────────────────────────── Event ID
     
Жишээ: seat:event123:vip:1:5 -> "user456"
                                   │
                                   └── Түгжсэн хэрэглэгчийн ID
```

---

## 7. Сервисүүдийн Хоорондын Харилцаа

### 7.1 Synchronous vs Asynchronous

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMMUNICATION PATTERNS                           │
└─────────────────────────────────────────────────────────────────────┘

SYNCHRONOUS (HTTP):
  - Шууд хариу хүлээх шаардлагатай үед
  - Frontend -> Gateway -> Services
  
  Жишээ: Login, Get Events, Create Booking
  
  User ──► Gateway ──► Service ──► Database
       ◄────────◄────────◄──────
       
ASYNCHRONOUS (RabbitMQ):
  - Хариу хүлээх шаардлагагүй үед
  - Background tasks
  
  Жишээ: Send Email, Notifications
  
  Booking Service ──► RabbitMQ ──► Notification Service
                   (fire & forget)        │
                                          ▼
                                      Send Email
```

### 7.2 Service Dependencies

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVICE DEPENDENCY GRAPH                         │
└─────────────────────────────────────────────────────────────────────┘

                         ┌──────────┐
                         │ Frontend │
                         └────┬─────┘
                              │
                              ▼
                         ┌──────────┐
                         │ Gateway  │
                         └────┬─────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌──────────┐         ┌──────────┐         ┌──────────┐
   │   User   │         │  Event   │         │ Booking  │
   │ Service  │         │ Service  │         │ Service  │
   └────┬─────┘         └────┬─────┘         └────┬─────┘
        │                    │                    │
        ▼                    ▼                    ▼
    ┌──────────┐         ┌──────────┐         ┌──────────┐
    │PostgreSQL│         │PostgreSQL│         │PostgreSQL│
    │ (schema  │         │ (schema  │         │ (schema  │
    │  user)   │         │  event)  │         │ booking) │
    └──────────┘         └──────────┘         └────┬─────┘
                                                  │
                                                  ▼
                                             ┌──────────┐
                                             │  Redis   │
                                             │  (6379)  │
                                             └──────────┘
        │                    │                    │
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                        ┌──────────┐
                        │ RabbitMQ │
                        │  (5672)  │
                        └────┬─────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Notification  │
                    │    Service     │
                    └────────┬───────┘
                             │
                             ▼
                         ┌──────────┐
                         │PostgreSQL│
                         │ (schema  │
                         │notification)
                         └──────────┘
```

### 7.3 Data Flow Example: Complete Booking

```
┌─────────────────────────────────────────────────────────────────────┐
│           COMPLETE BOOKING FLOW - DATA JOURNEY                      │
└─────────────────────────────────────────────────────────────────────┘

1. ХЭРЭГЛЭГЧ: Суудал сонгоно
   Frontend -> Gateway -> Booking Service
   │
   └── Redis: SETNX seat:event1:vip:1:5 = user123 (TTL 600s)

2. ХЭРЭГЛЭГЧ: Захиалга үүсгэнэ
   Frontend -> Gateway -> Booking Service
   │
   ├── PostgreSQL (Booking DB): INSERT booking
   │
   └── Event Service-с event мэдээлэл авах (internal HTTP call эсвэл
       Gateway-р дамжуулан)

3. ХЭРЭГЛЭГЧ: Төлбөр хийнэ
   Frontend -> Gateway -> Booking Service
   │
   ├── PostgreSQL: UPDATE booking SET status = 'CONFIRMED'
   │
   ├── Redis: DEL seat:event1:vip:1:5 (release lock)
   │
   └── RabbitMQ: PUBLISH 'booking.confirmed' {
         bookingId, userId, eventId, seats, totalAmount
       }

4. NOTIFICATION SERVICE: Мессеж хүлээн авна
   RabbitMQ -> Notification Service
   │
    ├── PostgreSQL (schema=notification): INSERT notification
   │
   └── Nodemailer: Send confirmation email

5. ХЭРЭГЛЭГЧ: Имэйл хүлээн авна
   Email with QR code -> User's inbox
```

---

## 8. Deploy Хийх Заавар

### 8.1 Локал Орчинд (Development)

#### Шаардлагууд
- Docker Desktop (Windows/Mac) эсвэл Docker Engine (Linux)
- Node.js 20+
- Git

#### Алхамууд

```bash
# 1. Repository clone хийх
git clone <repository-url>
cd eventmn-microservices

# 2. Environment файлууд үүсгэх
# Gateway
cp gateway/.env.example gateway/.env

# User Service
cp services/user-service/.env.example services/user-service/.env

# Event Service
cp services/event-service/.env.example services/event-service/.env

# Booking Service
cp services/booking-service/.env.example services/booking-service/.env

# Notification Service
cp services/notification-service/.env.example services/notification-service/.env

# Frontend
cp frontend/.env.example frontend/.env

# 3. Docker Compose эхлүүлэх
docker-compose up -d

# 4. Database migration (User Service)
docker-compose exec user-service npx prisma migrate deploy

# 5. Database migration (Booking Service)
docker-compose exec booking-service npx prisma migrate deploy

# 6. Seed data (optional)
cd scripts
npm install
npm run seed

# 7. Бүх сервис ажиллаж байгаа эсэхийг шалгах
docker-compose ps
```

#### Порт шалгах

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| Gateway | http://localhost:3000 |
| RabbitMQ Management | http://localhost:15672 |
| Prisma Studio (User) | http://localhost:5555 |
| Prisma Studio (Booking) | http://localhost:5556 |

### 8.2 Production Орчинд

#### Docker Compose (Single Server)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  gateway:
    image: eventmn/gateway:latest
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
    networks:
      - eventmn-network

  # ... бусад сервисүүд

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - gateway
      - frontend
```

#### Kubernetes (Cluster)

```yaml
# k8s/gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
  namespace: eventmn
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gateway
  template:
    metadata:
      labels:
        app: gateway
    spec:
      containers:
        - name: gateway
          image: eventmn/gateway:latest
          ports:
            - containerPort: 3000
          env:
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: eventmn-secrets
                  key: jwt-secret
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: gateway
  namespace: eventmn
spec:
  selector:
    app: gateway
  ports:
    - port: 3000
      targetPort: 3000
  type: ClusterIP
```

### 8.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy EventMN

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [gateway, user-service, event-service, booking-service, notification-service, frontend]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./${{ matrix.service == 'frontend' && 'frontend' || (matrix.service == 'gateway' && 'gateway' || format('services/{0}', matrix.service)) }}
          push: true
          tags: eventmn/${{ matrix.service }}:${{ github.sha }},eventmn/${{ matrix.service }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/eventmn
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

---

## 9. Сайжруулах Саналууд

### 9.1 Яаралтай Сайжруулалтууд (High Priority)

#### 1. Rate Limiting нэмэх
```typescript
// gateway/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints - more restrictive
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  message: 'Too many login attempts, please try again later.',
});
```

#### 2. Input Validation сайжруулах
```typescript
// Zod schema-г бүх endpoint-д нэмэх
import { z } from 'zod';

const createBookingSchema = z.object({
  eventId: z.string().uuid(),
  seats: z.array(z.object({
    sectionId: z.string(),
    row: z.number().int().positive(),
    seatNumber: z.number().int().positive(),
  })).min(1).max(10),
});

// Route handler-д
export async function POST(request: Request) {
  const body = await request.json();
  const result = createBookingSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    );
  }
  
  // ... proceed with valid data
}
```

#### 3. Error Handling стандартчилах
```typescript
// shared/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
  }
}

export const ErrorCodes = {
  SEAT_ALREADY_LOCKED: 'SEAT_ALREADY_LOCKED',
  BOOKING_EXPIRED: 'BOOKING_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
} as const;

// Usage
throw new AppError(409, ErrorCodes.SEAT_ALREADY_LOCKED, 'Selected seats are already taken');
```

#### 4. Health Check Endpoints
```typescript
// gateway/src/app/api/health/route.ts
export async function GET() {
  const services = {
    user: await checkService(USER_SERVICE_URL),
    event: await checkService(EVENT_SERVICE_URL),
    booking: await checkService(BOOKING_SERVICE_URL),
    notification: await checkService(NOTIFICATION_SERVICE_URL),
  };
  
  const allHealthy = Object.values(services).every(s => s.healthy);
  
  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services,
  }, { status: allHealthy ? 200 : 503 });
}

async function checkService(url: string) {
  try {
    const response = await fetch(`${url}/api/health`, { 
      signal: AbortSignal.timeout(5000) 
    });
    return { healthy: response.ok, latency: /* measure */ };
  } catch {
    return { healthy: false, error: 'Unreachable' };
  }
}
```

### 9.2 Дунд Хугацааны Сайжруулалтууд (Medium Priority)

#### 1. Caching Strategy
```typescript
// Redis caching for frequently accessed data
export async function getEventWithCache(eventId: string) {
  const cacheKey = `event:${eventId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const event = await Event.findById(eventId);
  
  if (event) {
    await redis.set(cacheKey, JSON.stringify(event), 'EX', 300); // 5 min cache
  }
  
  return event;
}

// Cache invalidation
export async function updateEvent(eventId: string, data: UpdateEventDto) {
  const event = await Event.findByIdAndUpdate(eventId, data, { new: true });
  await redis.del(`event:${eventId}`); // Invalidate cache
  return event;
}
```

#### 2. Logging & Monitoring
```typescript
// Winston logger setup
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'booking-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      userId: req.headers['x-user-id'],
    });
  });
  
  next();
}
```

#### 3. API Versioning
```typescript
// gateway/src/app/api/v1/[...path]/route.ts
// gateway/src/app/api/v2/[...path]/route.ts

// Header-based versioning
const apiVersion = request.headers.get('API-Version') || 'v1';

switch (apiVersion) {
  case 'v1':
    return handleV1Request(request);
  case 'v2':
    return handleV2Request(request);
  default:
    return NextResponse.json({ error: 'Unsupported API version' }, { status: 400 });
}
```

### 9.3 Урт Хугацааны Сайжруулалтууд (Long-term)

#### 1. Event-Driven Architecture Өргөжүүлэх
```
Current:
  Booking -> RabbitMQ -> Notification

Future:
  Booking -> RabbitMQ -> Notification
                     -> Analytics Service
                     -> Recommendation Service
                     -> Inventory Service
```

#### 2. GraphQL Gateway
```typescript
// Олон сервисийн өгөгдлийг нэгтгэх
const typeDefs = `
  type Query {
    booking(id: ID!): Booking
    event(id: ID!): Event
    user(id: ID!): User
  }
  
  type Booking {
    id: ID!
    event: Event!
    user: User!
    seats: [Seat!]!
    status: BookingStatus!
  }
`;

const resolvers = {
  Booking: {
    event: (booking) => eventService.getEvent(booking.eventId),
    user: (booking) => userService.getUser(booking.userId),
  },
};
```

#### 3. Service Mesh (Istio)
```yaml
# Traffic management, security, observability
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: booking-service
spec:
  hosts:
    - booking-service
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: booking-service
            subset: canary
    - route:
        - destination:
            host: booking-service
            subset: stable
```

### 9.4 Аюулгүй Байдлын Хэрэгжүүлэлтүүд

Систем дээр одоогоор дараах хамгаалалтууд бодитоор хэрэгжсэн:
- Gateway дээр JWT шалгалт (`JWT_SECRET`) ба хэрэглэгчийн мэдээллийг header-ээр дамжуулах (`x-user-id`, `x-user-role`)
- Gateway -> service internal request дээр HMAC signature шалгалт (`INTERNAL_API_SECRET`, `x-internal-ts`, `x-internal-signature`)
- Prisma ашигласнаар SQL injection эрсдэл буурах (parameterized queries)
- CORS whitelist (`CORS_ALLOWED_ORIGINS`) gateway дээр тохируулдаг

---

## 10. Troubleshooting

### 10.1 Түгээмэл Асуудлууд

#### Database Connection Error

```bash
# PostgreSQL холболт шалгах
docker-compose exec postgres psql -U postgres -d eventmn -c "SELECT 1"

# Redis холболт шалгах
docker-compose exec redis redis-cli ping
```

#### RabbitMQ Issues

```bash
# Queue status шалгах
docker-compose exec rabbitmq rabbitmqctl list_queues

# Consumer холболт шалгах
docker-compose exec rabbitmq rabbitmqctl list_consumers

# Exchange шалгах
docker-compose exec rabbitmq rabbitmqctl list_exchanges
```

#### Service Not Starting

```bash
# Logs харах
docker-compose logs -f <service-name>

# Container restart
docker-compose restart <service-name>

# Full rebuild
docker-compose down
docker-compose build --no-cache <service-name>
docker-compose up -d
```

### 10.2 Performance Issues

```bash
# Memory usage
docker stats

# Database slow queries (PostgreSQL)
docker-compose exec postgres psql -U postgres -d eventmn -c "SELECT * FROM pg_stat_activity WHERE state = 'active'"

# Redis memory
docker-compose exec redis redis-cli INFO memory
```

### 10.3 Debugging Tips

```typescript
// Enable verbose logging
// .env
DEBUG=*
LOG_LEVEL=debug

// Prisma query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// RabbitMQ message debugging
channel.consume(queue, (msg) => {
  console.log('Received message:', {
    routingKey: msg.fields.routingKey,
    content: msg.content.toString(),
    properties: msg.properties,
  });
});
```

---

## Хавсралт

### A. Environment Variables Reference

| Variable | Service | Description | Example |
|----------|---------|-------------|---------|
| `DATABASE_URL` | All services | PostgreSQL connection (schema-per-service) | `postgresql://postgres:123456@postgres:5432/eventmn?schema=user` |
| `REDIS_URL` | User, Event, Booking | Redis connection | `redis://redis:6379` |
| `RABBITMQ_URL` | All services | RabbitMQ connection | `amqp://rabbitmq:rabbitmq123@rabbitmq:5672` |
| `JWT_SECRET` | Gateway, User | JWT signing secret | `change-me` |
| `INTERNAL_API_SECRET` | Gateway + services | HMAC internal signature secret | `change-me` |
| `CORS_ALLOWED_ORIGINS` | Gateway | Browser allowed origins | `http://localhost:8080` |
| `SMTP_HOST` | Notification | Email server | `smtp.gmail.com` |
| `SMTP_USER` | Notification | Email username | `email@gmail.com` |
| `SMTP_PASS` | Notification | Email password | `app-password` |

### B. API Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT expired |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403 | Role not allowed |
| `BOOKING_SEATS_UNAVAILABLE` | 409 | Seats already taken |
| `BOOKING_EXPIRED` | 410 | Lock timeout |
| `EVENT_NOT_FOUND` | 404 | Event doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid input |

### C. Useful Commands

```bash
# Database migrations
npx prisma migrate dev --name <migration-name>
npx prisma migrate deploy
npx prisma db seed

# Docker
docker-compose up -d --build
docker-compose down -v  # Remove volumes too
docker-compose logs -f --tail=100

# Testing
npm run test
npm run test:e2e
npm run test:coverage
```

---

