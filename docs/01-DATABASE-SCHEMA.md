# Өгөгдлийн сангийн зохиомж (Database Schema)

## ERD Diagram (Entity Relationship Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER SERVICE (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────┐  │
│  │        USER         │      │         OTP         │      │  REFRESH_TOKEN  │  │
│  ├─────────────────────┤      ├─────────────────────┤      ├─────────────────┤  │
│  │ id (PK)             │──┐   │ id (PK)             │      │ id (PK)         │  │
│  │ email (UNIQUE)      │  │   │ userId (FK)         │◄─────│ userId (FK)     │◄─┤
│  │ password            │  │   │ code                │      │ token (UNIQUE)  │  │
│  │ firstName           │  └──►│ type                │      │ expiresAt       │  │
│  │ lastName            │      │ expiresAt           │      │ createdAt       │  │
│  │ phone               │      │ verified            │      └─────────────────┘  │
│  │ role (ENUM)         │      │ createdAt           │                           │
│  │ isVerified          │      └─────────────────────┘                           │
│  │ createdAt           │                                                        │
│  │ updatedAt           │                                                        │
│  └─────────────────────┘                                                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                             EVENT SERVICE (PostgreSQL)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────┐          ┌─────────────────────────────┐       │
│  │           EVENT             │          │           VENUE             │       │
│  ├─────────────────────────────┤          ├─────────────────────────────┤       │
│  │ id (UUID)                   │          │ id (UUID)                   │       │
│  │ title                       │          │ name                        │       │
│  │ description                 │          │ address                     │       │
│  │ category (ENUM)             │          │ city                        │       │
│  │ organizerId                 │          │ capacity                    │       │
│  │ venueId (FK)                │─────────►│ sections (JSON)             │       │
│  │ startDate                   │          │   └─ sections[]             │       │
│  │ endDate                     │          │       ├─ name               │       │
│  │ ticketInfo (JSON)           │          │       ├─ rows               │       │
│  │ (pricing rules etc.)        │          │       ├─ seatsPerRow        │       │
│  │                             │          │       └─ (optional metadata)│       │
│  │ status (ENUM)               │          │ facilities[]                │       │
│  │ thumbnail/images            │          │ contactPhone                │       │
│  │ tags[]                      │          │ contactEmail                │       │
│  │ createdAt                   │          │ createdAt                   │       │
│  │ updatedAt                   │          │ updatedAt                   │       │
│  └─────────────────────────────┘          └─────────────────────────────┘       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            BOOKING SERVICE (PostgreSQL)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────┐          ┌─────────────────────────────┐       │
│  │          BOOKING            │          │        BOOKING_SEAT         │       │
│  ├─────────────────────────────┤          ├─────────────────────────────┤       │
│  │ id (PK)                     │──────┐   │ id (PK)                     │       │
│  │ userId                      │      │   │ bookingId (FK)              │◄──────┤
│  │ userEmail                   │      └──►│ sectionId                   │       │
│  │ userName                    │          │ sectionName                 │       │
│  │ eventId                     │          │ row                         │       │
│  │ eventTitle                  │          │ seatNumber                  │       │
│  │ eventDate                   │          │ price                       │       │
│  │ venueId                     │          └─────────────────────────────┘       │
│  │ venueName                   │                                                │
│  │ totalAmount                 │                                                │
│  │ status (ENUM)               │                                                │
│  │ qrCode                      │                                                │
│  │ paymentId                   │                                                │
│  │ paymentMethod               │                                                │
│  │ paidAt                      │                                                │
│  │ createdAt                   │                                                │
│  │ updatedAt                   │                                                │
│  └─────────────────────────────┘          │ amount                      │       │
│                                           │ method                      │       │
│                                           │ transactionId               │       │
│                                           │ status                      │       │
│                                           │ createdAt                   │       │
│                                           └─────────────────────────────┘       │
│                                                                                  │
│  ┌─────────────────────────────┐                                                │
│  │      REDIS (Seat Lock)      │                                                │
│  ├─────────────────────────────┤                                                │
│  │ Key: seat:{eventId}:{seat}  │                                                │
│  │ Value: userId               │                                                │
│  │ TTL: 600 seconds (10 min)   │                                                │
│  └─────────────────────────────┘                                                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         NOTIFICATION SERVICE (PostgreSQL)                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────┐          ┌─────────────────────────────┐       │
│  │        NOTIFICATION         │          │      EMAIL_TEMPLATE         │       │
│  ├─────────────────────────────┤          ├─────────────────────────────┤       │
│  │ id (UUID)                   │          │ id (UUID)                   │       │
│  │ userId                      │          │ name                        │       │
│  │ type (ENUM)                 │          │ subject                     │       │
│  │ title                       │          │ body                        │       │
│  │ message                     │          │ variables[]                 │       │
│  │ data (JSON)                 │          │ createdAt                   │       │
│  │ isRead (BOOLEAN)            │          │ updatedAt                   │       │
│  │ emailSent (BOOLEAN)         │          └─────────────────────────────┘       │
│  │ createdAt                   │                                                │
│  └─────────────────────────────┘                                                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Хүснэгтүүдийн тодорхойлолт

### 1. User Service (PostgreSQL)

#### Users Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Хэрэглэгчийн ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Имэйл хаяг |
| password | VARCHAR(255) | NOT NULL | Нууцлагдсан нууц үг (bcrypt) |
| firstName | VARCHAR(100) | NOT NULL | Нэр |
| lastName | VARCHAR(100) | NOT NULL | Овог |
| phone | VARCHAR(20) | NULLABLE | Утасны дугаар |
| role | ENUM | DEFAULT 'USER' | USER, ORGANIZER, ADMIN |
| isVerified | BOOLEAN | DEFAULT false | OTP баталгаажсан эсэх |
| createdAt | TIMESTAMP | DEFAULT NOW() | Үүсгэсэн огноо |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Шинэчилсэн огноо |

#### OTP Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | OTP ID |
| userId | UUID | FK -> Users(id) | Хэрэглэгчийн ID |
| code | VARCHAR(6) | NOT NULL | 6 оронтой код |
| type | ENUM | NOT NULL | EMAIL, SMS, PASSWORD_RESET |
| expiresAt | TIMESTAMP | NOT NULL | Дуусах хугацаа |
| verified | BOOLEAN | DEFAULT false | Баталгаажсан эсэх |
| createdAt | TIMESTAMP | DEFAULT NOW() | Үүсгэсэн огноо |

#### RefreshToken Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Token ID |
| userId | UUID | FK -> Users(id) | Хэрэглэгчийн ID |
| token | VARCHAR(500) | UNIQUE, NOT NULL | Refresh token |
| expiresAt | TIMESTAMP | NOT NULL | Дуусах хугацаа |
| createdAt | TIMESTAMP | DEFAULT NOW() | Үүсгэсэн огноо |

### 2. Event Service (PostgreSQL)

#### Events Table (concept)
Бодит хэрэгжилт нь Prisma schema дээр: `services/event-service/prisma/schema.prisma`

#### Venues Table (concept)
Venue суудлын бүтэц `sections` талбарт JSON хэлбэрээр хадгалагдана (`services/event-service/prisma/schema.prisma`).

### 3. Booking Service (PostgreSQL)

#### Bookings Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Захиалгын ID |
| userId | UUID | NOT NULL | Хэрэглэгчийн ID |
| userEmail | VARCHAR(255) | NOT NULL | Хэрэглэгчийн имэйл |
| userName | VARCHAR(255) | NOT NULL | Хэрэглэгчийн нэр |
| eventId | UUID | NOT NULL | Event ID |
| eventTitle | VARCHAR(255) | NOT NULL | Event нэр |
| eventDate | TIMESTAMP | NOT NULL | Event огноо |
| venueId | UUID | NOT NULL | Venue ID |
| venueName | VARCHAR(255) | NOT NULL | Venue нэр |
| totalAmount | FLOAT | NOT NULL | Нийт дүн |
| status | ENUM | DEFAULT 'PENDING' | PENDING, CONFIRMED, CANCELLED, EXPIRED |
| qrCode | TEXT | NULLABLE | QR код |
| paymentId | VARCHAR(255) | NULLABLE | Төлбөрийн лавлагаа |
| paymentMethod | VARCHAR(50) | NULLABLE | Төлбөрийн хэрэгсэл |
| paidAt | TIMESTAMP | NULLABLE | Төлбөр хийсэн огноо |
| createdAt | TIMESTAMP | DEFAULT NOW() | Үүсгэсэн огноо |
| updatedAt | TIMESTAMP | DEFAULT NOW() | Шинэчилсэн огноо |

#### BookingSeats Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | ID |
| bookingId | UUID | FK -> Bookings(id) | Захиалгын ID |
| sectionId | UUID | NOT NULL | Section ID |
| sectionName | VARCHAR(255) | NOT NULL | Section нэр |
| row | INT | NOT NULL | Row |
| seatNumber | INT | NOT NULL | Seat number |
| price | FLOAT | NOT NULL | Суудлын үнэ |
| createdAt | TIMESTAMP | DEFAULT NOW() | Үүсгэсэн огноо |

### 4. Notification Service (PostgreSQL)

#### Notifications Table (concept)
Бодит хэрэгжилт нь Prisma schema дээр: `services/notification-service/prisma/schema.prisma`

## ENUM Types

### User Roles
```
USER        - Энгийн хэрэглэгч
ORGANIZER   - Зохион байгуулагч
ADMIN       - Системийн админ
```

### Event Status
```
DRAFT       - Ноорог
PENDING     - Хүлээгдэж буй (Admin зөвшөөрөл)
PUBLISHED   - Нийтлэгдсэн (олон нийтэд харагдана)
CANCELLED   - Цуцлагдсан
COMPLETED   - Дууссан
```

### Event Category
```
CONCERT     - Концерт
CONFERENCE  - Хурал, семинар
SPORTS      - Спорт арга хэмжээ
WRESTLING   - Бөхийн барилдаан
EXHIBITION  - Үзэсгэлэн
OTHER       - Бусад
```

### Booking Status
```
PENDING     - Хүлээгдэж буй
CONFIRMED   - Баталгаажсан
CANCELLED   - Цуцлагдсан
EXPIRED     - Хугацаа дууссан
```

### Notification Type
```
BOOKING_CONFIRMED  - Захиалга баталгаажсан
BOOKING_CANCELLED  - Захиалга цуцлагдсан
EVENT_REMINDER     - Event сануулга
EVENT_UPDATED      - Event өөрчлөгдсөн
EVENT_CANCELLED    - Event цуцлагдсан
SYSTEM             - Системийн мэдэгдэл
```

## Indexes

### User Service
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_otp_user_type ON otp(userId, type);
CREATE INDEX idx_refresh_token ON refresh_tokens(token);
```

### Event Service
Prisma schema дээр тодорхойлсон index-үүд (`services/event-service/prisma/schema.prisma`):

```prisma
@@index([status, startDate])
@@index([category])
@@index([organizerId])
@@index([title])
@@index([isOnline])
```

### Booking Service
```sql
CREATE INDEX idx_bookings_user ON bookings(userId);
CREATE INDEX idx_bookings_event ON bookings(eventId);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_booking_seats_booking ON booking_seats(bookingId);
```

### Notification Service
Prisma schema дээр тодорхойлсон index-үүд (`services/notification-service/prisma/schema.prisma`):

```prisma
@@index([userId, createdAt])
@@index([userId, isRead])
```
