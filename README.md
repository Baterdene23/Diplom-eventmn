# EventMN Microservices

**Дипломын сэдэв:** Microservices архитектур бүхий уулзалт, эвент төлөвлөлтийн систем

## Архитектур

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│                         Port: 8080                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (Next.js)                       │
│                         Port: 3000                               │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ User Service  │       │ Event Service │       │Booking Service│
│   Port: 3001  │       │   Port: 3002  │       │   Port: 3003  │
│  PostgreSQL   │       │  PostgreSQL   │       │  PostgreSQL   │
└───────────────┘       └───────────────┘       │    + Redis    │
        │                       │               └───────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Notification Service │
                    │      Port: 3004       │
        │     PostgreSQL        │
                    └───────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌───────────┐           ┌───────────┐
            │  RabbitMQ │           │   Redis   │
            │Port: 5672 │           │Port: 6379 │
            └───────────┘           └───────────┘
```

## Services

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| Gateway | 3000 | - | API Gateway, routing, auth middleware |
| User Service | 3001 | PostgreSQL (5432) | Auth, JWT, OTP, хэрэглэгчийн удирдлага |
| Event Service | 3002 | PostgreSQL (5432, schema=event) | Event CRUD, venue, суудлын тохиргоо |
| Booking Service | 3003 | PostgreSQL (5432, schema=booking) + Redis | Захиалга, суудал түгжих |
| Notification Service | 3004 | PostgreSQL (5432, schema=notification) | Email, WebSocket мэдэгдэл |
| Frontend | 8080 | - | React UI |

## Хэрэглэгчийн төрлүүд

| Role | Description |
|------|-------------|
| USER | Энгийн хэрэглэгч - event үзэх, захиалга хийх |
| ORGANIZER | Зохион байгуулагч - event үүсгэх, удирдах |
| ADMIN | Админ - системийн бүх хэсэгт хандах |

## Системийн зорилго ба хүрээ

Энэхүү системийн зорилго нь уулзалт, эвент төлөвлөлтийн веб системийг хэрэгжүүлж дараах үндсэн боломжуудыг бүрдүүлэхэд оршино:

- Хэрэглэгч: эвент хайх, дэлгэрэнгүй харах, суудлын зураглал харах, бүртгүүлэх
- Зохион байгуулагч: эвент үүсгэх, бүртгэлтэй заал сонгох, эвентээ удирдах
- Админ: заал бүртгэх, хэрэглэгч/эвентийн ерөнхий хяналт хийх

Төслийн хэрэгжилт нь дээрх хүрээнд төвлөрсөн бөгөөд шаардлагаас хэтэрсэн нэмэлт функц оруулахгүй байх зарчмаар хөгжүүлж байна.

## Зорилгод хүрэх алхмууд (шаардлагын хүрээнд)

Доорх дарааллаар хөгжүүлбэл scope-оо хэтрүүлэхгүй, хамгаалалт дээр хэмжигдэхүйц үр дүнтэй байна.

### 1) Суурь архитектур (хийсэн)
- [x] Frontend + Gateway + 4 service-г тусдаа контейнер болгох
- [x] PostgreSQL schema тусгаарлалт (user/event/booking/notification)
- [x] Redis seat locking
- [x] RabbitMQ event-driven notification

### 2) Үндсэн хэрэглэгчийн урсгал (ихэнх нь хийсэн)
- [x] Бүртгэл, нэвтрэлт, JWT
- [x] Эвент жагсаалт, дэлгэрэнгүй
- [x] Суудал сонголт, lock/unlock/status
- [x] Захиалга үүсгэх, баталгаажуулах, цуцлах

### 3) Зохион байгуулагчийн урсгал (ихэнх нь хийсэн)
- [x] Эвент үүсгэх, засах, өөрийн эвентүүдээ харах
- [x] Venue сонгож ticket section/үнэ тохируулах

### 4) Админ урсгал (хэсэгчлэн)
- [x] Хэрэглэгч удирдлага (API + UI)
- [x] Эвент approve/reject (API + UI)
- [x] Заал удирдлагын admin UI-г API руу шилжүүлэх
- [x] Admin bookings/notifications UI-г API руу шилжүүлэх

### 5) Production бэлэн байдал (үлдсэн)
- [ ] Booking create/update event-д RabbitMQ publish дутуу хэсгийг гүйцээх
- [ ] Refund/payment gateway интеграц (одоогийн дипломын scope-оос гадуур)
- [ ] OTP email/SMS provider (SMTP/SMS gateway) production түвшинд холбох
- [x] Event reminder producer (Booking Service reminder scheduler)

### 6) Баримт бичгийн нэг мөр болголт (үлдсэн)
- [ ] README, architecture, requirements баримтуудыг кодын одоогийн төлөвтэй 100% синк болгох

## Эхлүүлэх (Docker)

### 1. Шаардлага
- Docker Desktop
- Docker Compose

### 2. Ажиллуулах

```bash
# Clone repository
git clone <repository-url>
cd eventmn-microservices

# Бүх service-үүдийг эхлүүлэх
docker-compose up -d

# Build хийгээд эхлүүлэх (анх удаа)
docker-compose up -d --build

# Логуудыг харах
docker-compose logs -f

# Тодорхой service-ийн лог
docker-compose logs -f user-service

# Бүгдийг зогсоох
docker-compose down

# Бүгдийг зогсоох (volume-ууд устгахгүй)
docker-compose down

# Бүгдийг устгах (volume-ууд хамт)
docker-compose down -v
```

### 3. Хандах URL-ууд

- **Frontend:** http://localhost:8080
- **API Gateway:** http://localhost:3000
- **RabbitMQ Management:** http://localhost:15672 (rabbitmq / rabbitmq123)

## Хөгжүүлэлт (Local Development)

### 1. Database-үүд эхлүүлэх

```bash
# Зөвхөн database-үүд болон message broker-ийг эхлүүлэх
docker-compose up -d postgres redis rabbitmq
```

### 2. Environment тохируулах

```bash
# Service бүрт .env файл үүсгэх
cp services/user-service/.env.example services/user-service/.env
cp services/event-service/.env.example services/event-service/.env
cp services/booking-service/.env.example services/booking-service/.env
cp services/notification-service/.env.example services/notification-service/.env
cp gateway/.env.example gateway/.env
cp frontend/.env.example frontend/.env
```

### 3. Service-үүдийг ажиллуулах

```bash
# User Service
cd services/user-service
npm install
npx prisma generate
npx prisma db push  # Database schema үүсгэх
npm run dev

# Event Service
cd services/event-service
npm install
npx prisma generate
npx prisma db push
npm run dev

# Booking Service
cd services/booking-service
npm install
npx prisma generate
npx prisma db push
npm run dev

# Notification Service
cd services/notification-service
npm install
npx prisma generate
npx prisma db push
npm run dev

# Gateway
cd gateway
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## API Endpoints

### Auth (User Service)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Бүртгүүлэх |
| POST | /api/auth/login | Нэвтрэх |
| POST | /api/auth/refresh | Token шинэчлэх |
| POST | /api/auth/verify-otp | OTP баталгаажуулах |
| POST | /api/auth/resend-otp | OTP дахин илгээх |
| POST | /api/auth/forgot-password | Нууц үг сэргээх OTP хүсэх |
| POST | /api/auth/reset-password | OTP-оор нууц үг шинэчлэх |

### Events (Event Service)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/events | Event жагсаалт |
| GET | /api/events/:id | Event дэлгэрэнгүй |
| POST | /api/events | Event үүсгэх (ORGANIZER) |
| PUT | /api/events/:id | Event засах |
| DELETE | /api/events/:id | Event устгах |

### Admin Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/events | Бүх event (ADMIN) |
| POST | /api/admin/events/:id/approve | Event зөвшөөрөх |
| POST | /api/admin/events/:id/reject | Event татгалзах |

### Bookings (Booking Service)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/bookings | Миний захиалгууд |
| POST | /api/bookings | Захиалга үүсгэх |
| POST | /api/bookings/:id/confirm | Захиалга баталгаажуулах |
| POST | /api/bookings/:id/cancel | Захиалга цуцлах |

### Seats (Booking Service)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/seats/lock | Суудал түгжих (10 мин) |
| POST | /api/seats/unlock | Суудал сулгах |
| GET | /api/seats/status?eventId=xxx | Суудлын төлөв |

### Admin Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/users | Хэрэглэгчийн жагсаалт |

## Үндсэн функцууд

### Суудал түгжих (Seat Locking)
- Redis TTL ашиглан 10 минутын дотор түгжинэ
- Хугацаа дуусвал автоматаар сулгагдана
- Countdown timer frontend дээр харагдана

### Refund Policy
- 48+ цаг өмнө: 100% буцаалт
- 24-48 цаг өмнө: 50% буцаалт
- 24 цагаас бага: Буцаалт байхгүй

### Notification System
- RabbitMQ-ээр async мэдэгдэл
- Email templates: Booking confirmed, cancelled, Event approved, rejected, reminder

## Диаграмууд (README-д шууд ашиглах)

### 1. Architecture Diagram

```mermaid
flowchart LR
    FE[Frontend :8080] --> GW[API Gateway :3000]

    GW --> US[User Service :3001]
    GW --> ES[Event Service :3002]
    GW --> BS[Booking Service :3003]
    GW --> NS[Notification Service :3004]

    US --> PG[(PostgreSQL\n schema=user)]
    ES --> PG2[(PostgreSQL\n schema=event)]
    BS --> PG3[(PostgreSQL\n schema=booking)]
    NS --> PG4[(PostgreSQL\n schema=notification)]

    BS --> R[(Redis)]
    ES --> MQ[(RabbitMQ Exchange: eventmn)]
    BS --> MQ
    MQ --> NS
```

### 2. Use Case Diagram

```mermaid
flowchart TB
    U[User]
    O[Organizer]
    A[Admin]

    UC1((Эвент хайх))
    UC2((Эвент дэлгэрэнгүй харах))
    UC3((Суудлын зураглал харах))
    UC4((Захиалга үүсгэх))
    UC5((Захиалга цуцлах))

    UC6((Эвент үүсгэх))
    UC7((Заал сонгох))
    UC8((Эвент засах/удирдах))

    UC9((Эвент approve/reject))
    UC10((Хэрэглэгч хянах))
    UC11((Заал бүртгэх))

    U --> UC1
    U --> UC2
    U --> UC3
    U --> UC4
    U --> UC5

    O --> UC6
    O --> UC7
    O --> UC8

    A --> UC9
    A --> UC10
    A --> UC11
```

### 3. Class Diagram (Домэйн хялбаршуулсан)

```mermaid
classDiagram
    class User {
      +id: string
      +email: string
      +role: USER|ORGANIZER|ADMIN
      +isVerified: boolean
    }

    class OrganizerProfile {
      +userId: string
      +organizationName: string
      +isVerified: boolean
    }

    class Event {
      +id: string
      +title: string
      +status: DRAFT|PENDING|PUBLISHED|CANCELLED
      +organizerId: string
      +venueId: string
    }

    class Venue {
      +id: string
      +name: string
      +city: string
      +sections: json
      +isActive: boolean
    }

    class Booking {
      +id: string
      +userId: string
      +eventId: string
      +status: PENDING|CONFIRMED|CANCELLED
      +totalAmount: number
      +qrCode: string
    }

    class BookingSeat {
      +bookingId: string
      +sectionId: string
      +row: int
      +seatNumber: int
      +price: number
    }

    class Notification {
      +id: string
      +userId: string
      +type: string
      +title: string
      +isRead: boolean
    }

    User "1" --> "0..1" OrganizerProfile
    User "1" --> "0..*" Booking
    User "1" --> "0..*" Notification

    Event "1" --> "0..*" Booking
    Venue "1" --> "0..*" Event
    Booking "1" --> "1..*" BookingSeat
```

## Өгөгдөл хэрхэн дамждаг вэ? (Redis, RabbitMQ)

### Redis ашиглалт (синхрон, хурдан төлөв)

- Booking service суудлыг Redis key хэлбэрээр түгжинэ: seat:{eventId}:{sectionId}:{row}:{seatNumber}
- TTL = 600 секунд (10 минут)
- Төлбөр баталгаажихад Redis lock устгаж, суудал DB дээр баталгаажна

Flow:
1. User суудал сонгоно
2. Booking service Redis дээр atomic lock хийнэ
3. User confirm хийхэд booking CONFIRMED болно
4. Redis lock-ууд устна

### RabbitMQ ашиглалт (асинхрон event)

- Booking/Event service-үүд eventmn exchange рүү publish хийнэ
- Notification service queue-уудаар consume хийгээд notification + email үүсгэнэ

Flow:
1. booking.confirmed / booking.cancelled / event.approved / event.rejected publish
2. Notification service consume
3. Notification DB-д хадгална
4. Email template-ээр хэрэглэгч рүү илгээнэ

## Өгөгдлийн сангаа яаж харах, хянах вэ?

### 1) PostgreSQL-г шууд шалгах (docker compose)

```bash
docker compose exec postgres psql -U postgres -d eventmn
```

Host машинаас (Prisma Studio, scripts) Docker дээрх Postgres руу холбогдох бол:
- Host port: `5433`
- Жишээ: `postgresql://postgres:123456@localhost:5433/eventmn`

psql дотор:

```sql
\dn
\dt user.*
\dt event.*
\dt booking.*
\dt notification.*

SELECT COUNT(*) FROM user."User";
SELECT COUNT(*) FROM event."Event";
SELECT COUNT(*) FROM booking."Booking";
SELECT COUNT(*) FROM notification."Notification";
```

### 2) Prisma Studio ашиглах (service бүрээр)

```bash
cd services/user-service && npx prisma studio
cd services/event-service && npx prisma studio
cd services/booking-service && npx prisma studio
cd services/notification-service && npx prisma studio
```

### 3) Redis seat lock харах

```bash
docker compose exec redis redis-cli
SCAN 0 MATCH seat:* COUNT 100
TTL seat:<eventId>:<sectionId>:<row>:<seatNumber>
GET seat:<eventId>:<sectionId>:<row>:<seatNumber>
```

### 4) RabbitMQ queue, message урсгал харах

- UI: http://localhost:15672
- user/pass: rabbitmq / rabbitmq123
- Exchange: eventmn
- Queue: booking.confirmed, booking.cancelled, event.approved, event.rejected, event.reminder

### 5) Service log-оор урсгал батлах

```bash
docker compose logs -f booking-service
docker compose logs -f notification-service
docker compose logs -f gateway
```

## Dataset бэлтгэх (бодит эвент, оролцогч, заал, суудлын дүүргэлт)

Доорх скрипт нь одоогийн архитектурт таарсан PostgreSQL schema-ууд дээр demo dataset үүсгэнэ.

### 1) Script ажиллуулах

```bash
cd scripts
npm install

# Demo dataset үүсгэх
npm run dataset:real

# Demo dataset-ийг дахин цэвэрлээд шинээр үүсгэх
npm run dataset:real:reset
```

Анхаарах: Host машин дээр local PostgreSQL ажиллаж байвал 5432 port давхардаж төөрөлдөх боломжтой.
Энэ repo дээр Docker Postgres host port-ыг `5433` болгосон тул scripts нь Docker DB руу seed хийнэ.

Үүсэх зүйлс:
- Admin, organizer, 120 оролцогч хэрэглэгч
- [DEMO] prefix-тэй venues болон events
- Event бүр дээр confirmed booking-ууд (судлагдсан суудлын дүүргэлттэй)
- Pending seat selection-ийг төлөөлөх seat_locks мөрүүд
- Demo notification бичлэгүүд

Тайлбар:
- `dataset:real` нь PostgreSQL-ийн `user/event/booking/notification` schema-ууд дээр шууд seed хийнэ (Prisma seed-үүдээс тусдаа).

Хэрэв service тус бүрийн жижиг seed ашиглах бол (сонголт):

```bash
cd services/user-service && npm run db:seed
cd services/event-service && npm run db:seed
cd services/booking-service && npm run db:seed
cd services/notification-service && npm run db:seed
```

## Venue (заал) үүсгэх / шинэчлэх

Заалын мэдээлэл `event-service` дээр хадгалагдана.

- Шинэ заал бүртгэх: `POST /api/venues` (ADMIN шаардлагатай)
- Заал шинэчлэх: `PATCH /api/venues/:id` (ADMIN эсвэл тухайн заалыг үүсгэсэн хэрэглэгч)
- Заал идэвхгүй болгох (soft delete): `DELETE /api/venues/:id`

Жишээ хүсэлт (gateway-р дамжуулж):

```bash
curl -X POST http://localhost:3000/api/venues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{
    "name": "Бөхийн Өргөө (Demo)",
    "address": "Баянзүрх, Улаанбаатар",
    "city": "Улаанбаатар",
    "capacity": 8000,
    "description": "Бөхийн барилдаан, концерт зохион байгуулах боломжтой.",
    "images": ["/images/venues/urguu.jpg"],
    "sections": [
      {"id":"vip","name":"VIP","rows":10,"seatsPerRow":20,"price":180000,"color":"#f59e0b"},
      {"id":"standard","name":"Энгийн","rows":40,"seatsPerRow":150,"price":80000,"color":"#3b82f6"}
    ]
  }'
```

## Бодит эвент дата импорт (TicketMN маягийн JSON)

`services/event-service/scripts/import-ticketmn.js` нь JSON файлнаас venue + event үүсгэж импорт хийнэ.

- Sample файл: `services/event-service/scripts/ticketmn-events.sample.json`
- Ашиглах:

```bash
cp services/event-service/scripts/ticketmn-events.sample.json services/event-service/scripts/ticketmn-events.json
cd services/event-service
npm run db:import:ticketmn
```

## Security (Gateway → Services)

- `x-user-id`, `x-user-role` зэрэг header-уудыг сервисүүд өөрсдөө итгэж ашиглахгүй.
- Gateway нь хүсэлтийг `INTERNAL_API_SECRET` ашиглан HMAC signature-тайгаар дамжуулж, сервисүүд signature-г шалгаад дараа нь user context header-уудыг зөвшөөрнө.
- Ингэснээр сервис рүү шууд хандаж header forge хийх эрсдэл буурна (зөвхөн gateway-ээр дамжих урсгал дэмжигдэнэ).

### 2) Нэвтрэх demo аккаунтууд

- Admin: admin.demo@eventmn.mn / Demo@123
- Organizer: organizer.demo1@eventmn.mn / Demo@123
- Participants: participant1@demo.eventmn.mn ... participant120@demo.eventmn.mn / Demo@123

### 3) Суудлын дүүргэлт (occupancy) SQL-ээр шалгах

```sql
SELECT
  b.event_id,
  b.event_title,
  COUNT(bs.id) AS sold_seats,
  ROUND(AVG(b.total_amount)::numeric, 2) AS avg_booking_amount
FROM booking.bookings b
JOIN booking.booking_seats bs ON bs.booking_id = b.id
WHERE b.status = 'CONFIRMED'
  AND b.event_title LIKE '[DEMO]%'
GROUP BY b.event_id, b.event_title
ORDER BY sold_seats DESC;
```

### 4) Суудал сонголтын pending төлөв (seat lock) шалгах

```sql
SELECT
  event_id,
  section_id,
  row,
  seat,
  user_id,
  expires_at
FROM booking.seat_locks
WHERE event_id IN (
  SELECT id FROM event."Event" WHERE title LIKE '[DEMO]%'
)
ORDER BY expires_at DESC;
```

## Технологи

- **Runtime:** Node.js 20
- **Framework:** Next.js 14 (API Routes)
- **Frontend:** React, Tailwind CSS, Zustand
- **Databases:** PostgreSQL 15, Redis 7
- **ORM:** Prisma (PostgreSQL)
- **Message Broker:** RabbitMQ 3
- **Container:** Docker + Docker Compose
- **Authentication:** JWT + OTP

## Folder Structure

```
eventmn-microservices/
├── docker-compose.yml
├── README.md
├── gateway/
│   ├── src/
│   │   ├── app/api/[...path]/route.ts  # Proxy routing
│   │   └── lib/auth.ts                  # JWT verification
│   └── Dockerfile
├── services/
│   ├── user-service/
│   │   ├── src/app/api/
│   │   │   ├── auth/                    # Auth endpoints
│   │   │   └── admin/users/             # Admin endpoints
│   │   ├── prisma/schema.prisma
│   │   └── Dockerfile
│   ├── event-service/
│   │   ├── src/
│   │   │   ├── app/api/
│   │   │   │   ├── events/              # Event CRUD
│   │   │   │   ├── admin/events/        # Admin approval
│   │   │   │   └── venues/              # Venue CRUD
│   │   │   ├── lib/prisma.ts             # Prisma client
│   │   │   └── prisma/schema.prisma      # Prisma schema
│   │   │   └── lib/rabbitmq.ts          # RabbitMQ publisher
│   │   └── Dockerfile
│   ├── booking-service/
│   │   ├── src/
│   │   │   ├── app/api/
│   │   │   │   ├── bookings/            # Booking CRUD
│   │   │   │   └── seats/               # Seat lock/unlock
│   │   │   └── lib/
│   │   │       ├── redis.ts             # Seat locking
│   │   │       └── rabbitmq.ts          # RabbitMQ publisher
│   │   ├── prisma/schema.prisma
│   │   └── Dockerfile
│   └── notification-service/
│       ├── src/
│       │   ├── app/api/                 # Notification endpoints
│       │   └── lib/
│       │       ├── rabbitmq.ts          # RabbitMQ connection
│       │       ├── consumer.ts          # Message handlers
│       │       └── email.ts             # Email templates
│       ├── prisma/schema.prisma
│       └── Dockerfile
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── events/                  # Event pages
    │   │   ├── booking/                 # Booking flow
    │   │   └── admin/                   # Admin dashboard
    │   ├── components/
    │   │   └── events/SeatMap.tsx       # Seat selection
    │   ├── lib/api.ts                   # API functions
    │   └── store/index.ts               # Zustand stores
    └── Dockerfile
```

## Тест хийх

### 1. Бүртгэл + Нэвтрэх
```bash
# Бүртгүүлэх
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Нэвтрэх
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Event үүсгэх (ORGANIZER)
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Test Concert",
    "description": "Amazing concert",
    "category": "CONCERT",
    "startDate": "2024-12-25T19:00:00Z",
    "endDate": "2024-12-25T22:00:00Z",
    "ticketPrice": 50000
  }'
```

### 3. Суудал түгжих
```bash
curl -X POST http://localhost:3000/api/seats/lock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "eventId": "<event-id>",
    "seats": ["A1", "A2"]
  }'
```

## License

MIT
