# 06. Integrated Report (Implementation-Aligned)

Энэхүү тайлан нь EventMN системийн архитектур, өгөгдлийн загвар, API урсгал, асинхрон интеграци (RabbitMQ), seat-lock (Redis), Gateway security (JWT + internal HMAC) болон хэрэгжилтийн бодит кодтой нийцсэн байдлыг нэгтгэн тайлбарлана.

## 1) Architecture Overview

- **API Gateway**: Нэг entrypoint. JWT баталгаажуулж, downstream service-үүд рүү internal HMAC signature (timestamp + signature) хавсарган forward хийнэ.
- **User Service**: Auth, OTP, хэрэглэгчийн профайл/role.
- **Event Service**: Эвент CRUD, admin approval/reject, publish lifecycle.
- **Booking Service**: Booking lifecycle, суудал түгжих (Redis), refund calculation, reminder scheduler.
- **Notification Service**: RabbitMQ consumer-ууд, notification persistence, email илгээх.

## 1.1 Source Of Truth (Code References)

- Gateway routing + JWT verify + internal HMAC signing: `gateway/src/app/api/[...path]/route.ts`
- Internal HMAC verification (services): `services/*/src/lib/internal-auth.ts`
- Prisma schemas (schema-per-service): `services/*/prisma/schema.prisma`
- RabbitMQ consumers: `services/notification-service/src/lib/consumer.ts`
- RabbitMQ publishers (booking/event): `services/booking-service/src/lib/rabbitmq.ts`, `services/event-service/src/lib/rabbitmq.ts`
- Seat lock (Redis + Lua + TTL): `services/booking-service/src/lib/redis.ts`
- Reminder scheduler: `services/booking-service/src/lib/reminder-scheduler.ts`, `services/booking-service/src/instrumentation.ts`

## 2) Data Layer Strategy (PostgreSQL + Prisma)

- Сервис бүр нэг PostgreSQL database (`eventmn`) дээр **өөр schema** ашиглана: `schema=user|event|booking|notification`.
- ORM нь **Prisma**.
- Уян хатан бүтэцтэй талбарууд (жишээ: ticket/section мэдээлэл) нь PostgreSQL дээр Prisma-ийн `Json` төрөл ашиглана.

## 2.1 Database Connection Convention

- Docker dev дээр PostgreSQL host port: `5433` (container `5432`).
- Service бүр `DATABASE_URL` дээр `?schema=...` ашиглана (жишээ: `.../eventmn?schema=booking`).

## 3) Security Model

### 3.1 JWT (Client -> Gateway)

- Client нь `Authorization: Bearer <accessToken>` ашиглана.
- Gateway нь JWT verify хийж, role-based access control (admin endpoints гэх мэт) хэрэгжүүлнэ.

Implementation proof:
- JWT verify + role forwarding headers: `gateway/src/app/api/[...path]/route.ts`
- JWT issue/verify: `services/user-service/src/lib/auth.ts`

### 3.2 Internal HMAC (Gateway -> Services)

- Gateway нь internal request бүр дээр timestamp болон HMAC signature үүсгэнэ.
- Service бүр internal signature-ийг баталгаажуулж, gateway-аас ирээгүй шууд дуудлагыг хаана.

## 4) Core Functional Flows

### 4.1 Registration + OTP Verify

- Register үед OTP үүсэж хадгалагдана.
- `verify-otp` endpoint нь OTP type-аар (жишээ: `EMAIL_VERIFY`, `BECOME_ORGANIZER`) ялган баталгаажуулна.

Endpoints:
- `POST /api/auth/register`: `services/user-service/src/app/api/auth/register/route.ts`
- `POST /api/auth/verify-otp`: `services/user-service/src/app/api/auth/verify-otp/route.ts`
- `POST /api/auth/resend-otp`: `services/user-service/src/app/api/auth/resend-otp/route.ts`

### 4.2 Become Organizer (OTP-based)

- `POST /api/auth/become-organizer` -> OTP илгээнэ.
- `POST /api/auth/verify-otp` (type=`BECOME_ORGANIZER`) -> user role `ORGANIZER` болж, organizer profile verified болно.

Implementation proof:
- `services/user-service/src/app/api/auth/become-organizer/route.ts`
- `services/user-service/src/app/api/auth/verify-otp/route.ts`

### 4.3 Event Approval / Rejection (Admin)

- Approve: `PENDING -> PUBLISHED`.
- Reject: `PENDING -> DRAFT` ба `rejectionReason/rejectedAt/rejectedBy` хадгална (status `REJECTED` байхгүй).
- EventService нь RabbitMQ-д `event.approved` / `event.rejected` publish хийнэ.

Implementation proof:
- `services/event-service/src/app/api/admin/events/[id]/approve/route.ts`
- `services/event-service/src/app/api/admin/events/[id]/reject/route.ts`

### 4.4 Booking + Seat Lock (Redis)

- Seat lock нь Redis дээр `seat:{eventId}:{sectionId}:{row}:{seatNumber}` key-ээр, TTL нь default `600` секунд.
- Multi-seat lock нь Lua script ашиглан atomic байдлаар хийгдэнэ.

Implementation proof:
- Lock: `services/booking-service/src/app/api/seats/lock/route.ts`
- Extend: `services/booking-service/src/app/api/seats/extend/route.ts`
- Status: `services/booking-service/src/app/api/seats/status/route.ts`
- Redis + Lua: `services/booking-service/src/lib/redis.ts`

### 4.5 Event Reminder

- Reminder producer нь тусдаа cron service биш.
- Booking Service дотор reminder scheduler ажиллаж RabbitMQ-д `event.reminder` publish хийнэ.
- Notification Service нь consume хийгээд `EVENT_REMINDER` notification үүсгэж, email илгээнэ.

Implementation proof:
- Producer: `services/booking-service/src/lib/reminder-scheduler.ts`
- Consumer: `services/notification-service/src/lib/consumer.ts`

## 5) Asynchronous Integration (RabbitMQ)

- Booking lifecycle: `booking.created`, `booking.confirmed`, `booking.cancelled`.
- Event moderation: `event.approved`, `event.rejected`.
- Reminder: `event.reminder`.
- Event lifecycle: `event.updated`, `event.cancelled`.

Notification persistence дээр:

- `event.approved` / `event.rejected` message дээр `SYSTEM` төрлийн notification үүсгэнэ.
- `event.reminder` message дээр `EVENT_REMINDER` төрлийн notification үүсгэнэ.

Implementation proof:
- Consumers: `services/notification-service/src/lib/consumer.ts`

## 6) Frontend Integration (No Mock)

- Admin pages (events/users/venues/bookings/notifications/logs) нь Gateway API-гаар бодит өгөгдөл татаж ажиллана.
- "Organizer хүсэлт" гэсэн mock admin page байхгүй (OTP-based upgrade flow ашиглана).

Known dev-only behavior:
- Seeded/demo image paths `/images/*`-ийг stable болгож redirect хийдэг: `frontend/src/app/images/[...path]/route.ts`

## 7) How To Run (Dev)

- `docker-compose.yml` дээр PostgreSQL/Redis/RabbitMQ сервисүүдийг асаана.
- Сервис бүрийн `DATABASE_URL` нь нэг DB дээр schema тусгаарлалттай байна.

## 8) Notes / Limitations

- Payment gateway integration нь энэ release-ийн scope-д ороогүй (booking cancel үед payment refund хийх хэсэг тусад нь интеграц шаардана).

## 9) Requirements Traceability (Diploma Scope)

This section maps the requirements in `docs/02-SYSTEM-REQUIREMENTS.md` to implemented endpoints/components.

User management

- FR-U01 Register: `services/user-service/src/app/api/auth/register/route.ts`
- FR-U02 OTP send: `services/user-service/src/app/api/auth/resend-otp/route.ts`, `services/user-service/src/lib/otp.ts`
- FR-U03 OTP verify: `services/user-service/src/app/api/auth/verify-otp/route.ts`
- FR-U04 Resend cooldown 60s: `services/user-service/src/app/api/auth/resend-otp/route.ts`
- FR-U05 Login: `services/user-service/src/app/api/auth/login/route.ts`
- FR-U06 JWT/refresh: `services/user-service/src/lib/auth.ts`
- FR-U07 Refresh: `services/user-service/src/app/api/auth/refresh/route.ts`
- FR-U08 Forgot/reset: `services/user-service/src/app/api/auth/forgot-password/route.ts`, `services/user-service/src/app/api/auth/reset-password/route.ts`
- FR-U09 Profile view/update: `services/user-service/src/app/api/users/me/route.ts`, `frontend/src/app/dashboard/profile/page.tsx`
- FR-U10 Admin role change: `services/user-service/src/app/api/users/[id]/route.ts`, `frontend/src/app/admin/users/page.tsx`

Event management

- FR-E01/E02/E03 List/detail/search/filter: `services/event-service/src/app/api/events/route.ts`, `services/event-service/src/app/api/events/[id]/route.ts`, `frontend/src/app/events/page.tsx`
- FR-E04 Create: `services/event-service/src/app/api/events/route.ts`, `frontend/src/app/events/create/page.tsx`
- FR-E05 Update: `services/event-service/src/app/api/events/[id]/route.ts`
- FR-E06 Delete (DRAFT only): `services/event-service/src/app/api/events/[id]/route.ts` (DELETE hard-deletes only when `status=DRAFT`)
- FR-E07 Cancel: `services/event-service/src/app/api/events/[id]/cancel/route.ts` (POST sets `status=CANCELLED`, enforces BR-E04, publishes `event.cancelled`)
- FR-E08 Upload images: `services/event-service/src/app/api/upload/route.ts`
- FR-E09 My events: `services/event-service/src/app/api/events/route.ts` (query `mine=true`)
- FR-E10 Approve: `services/event-service/src/app/api/admin/events/[id]/approve/route.ts`
- FR-E11 Reject: `services/event-service/src/app/api/admin/events/[id]/reject/route.ts`
- FR-E12 Admin list: `services/event-service/src/app/api/admin/events/route.ts`, `frontend/src/app/admin/events/page.tsx`

Venue management

- FR-V01/02 Create/update: `services/event-service/src/app/api/venues/route.ts`, `services/event-service/src/app/api/venues/[id]/route.ts`
- FR-V03 List: `services/event-service/src/app/api/venues/route.ts`
- FR-V04 Seat schema config (sections JSON): `services/event-service/src/app/api/venues/route.ts`

Booking management

- FR-B01 Seat lock (10 min): `services/booking-service/src/app/api/seats/lock/route.ts`, `services/booking-service/src/lib/redis.ts`
- FR-B02 Extend lock: `services/booking-service/src/app/api/seats/extend/route.ts`
- FR-B03 Unlock: `services/booking-service/src/app/api/seats/unlock/route.ts`
- FR-B04 Create booking: `services/booking-service/src/app/api/bookings/route.ts`
- FR-B05 Confirm booking: `services/booking-service/src/app/api/bookings/[id]/confirm/route.ts`
- FR-B06 Cancel booking: `services/booking-service/src/app/api/bookings/[id]/cancel/route.ts`
- FR-B07 My bookings: `services/booking-service/src/app/api/bookings/route.ts`
- FR-B08 Booking detail: `services/booking-service/src/app/api/bookings/[id]/route.ts`
- FR-B09 Refund policy calc: `services/booking-service/src/lib/refund.ts`
- FR-B10 Event participants: `services/booking-service/src/app/api/bookings/event/[eventId]/route.ts`
- FR-B11 Admin bookings list: `services/booking-service/src/app/api/bookings/route.ts` (admin sees all)

Notification management

- FR-N01/N02 Booking confirmed/cancelled notifications: `services/notification-service/src/lib/consumer.ts`
- FR-N03/N04 Event approved/rejected notifications: `services/notification-service/src/lib/consumer.ts`
- FR-N05 Reminder: `services/booking-service/src/lib/reminder-scheduler.ts`, `services/notification-service/src/lib/consumer.ts`
- Event cancelled/updated messages: `services/notification-service/src/lib/consumer.ts`
- FR-N06 List my notifications: `services/notification-service/src/app/api/notifications/route.ts`, `frontend/src/app/notifications/page.tsx`
- FR-N07 Mark read: `services/notification-service/src/app/api/notifications/route.ts`

Non-functional requirements (what is implemented vs. what is policy)

- NFR-S02 JWT is implemented as HS256 (jsonwebtoken secret): `services/user-service/src/lib/auth.ts`
- NFR-S07 CORS handling exists at Gateway: `gateway/src/app/api/[...path]/route.ts`
- NFR-S06 Rate limiting (100 req/min) is implemented at gateway level (in-memory fallback): `gateway/src/app/api/[...path]/route.ts`, `gateway/src/lib/rate-limit.ts`

Business rules alignment (high-signal checks)

- BR-U03 OTP resend cooldown 60s: `services/user-service/src/app/api/auth/resend-otp/route.ts`
- BR-U04 Password min length 8: `services/user-service/src/app/api/auth/reset-password/route.ts`, `services/user-service/src/app/api/users/me/password/route.ts`, `frontend/src/app/dashboard/profile/page.tsx`
- BR-U05 Login lockout after 5 failed attempts (15 minutes): implemented via Redis-based lockout keys in `services/user-service/src/app/api/auth/login/route.ts` (uses `services/user-service/src/lib/redis.ts`)
- BR-B02 Max 10 seats per event: enforced at lock time via `services/booking-service/src/app/api/seats/lock/route.ts` (`.max(10)`)
- BR-R01/02/03 Refund policy 48h/24-48h/<24h: `services/booking-service/src/lib/refund.ts` (used by `services/booking-service/src/app/api/bookings/[id]/cancel/route.ts`)
- BR-E01 End date after start date: enforced on event create via `services/event-service/src/app/api/events/route.ts`
- BR-E02 Price >= 0: enforced on event create ticketInfo via `services/event-service/src/app/api/events/route.ts`
- BR-E03 No edits after approval: organizer edits blocked for published events via `services/event-service/src/app/api/events/[id]/route.ts`
- BR-E04 Only cancel >= 24h before start: enforced on event DELETE via `services/event-service/src/app/api/events/[id]/route.ts`
- BR-R04 Event cancelled -> 100% refund: booking-service consumes `event.cancelled` and cancels bookings + emits `booking.cancelled` with 100% refundInfo via `services/booking-service/src/lib/consumer.ts`

## 10) BPMN Diagrams

- BPMN-style (PlantUML activity) diagrams: `docs/07-BPMN-DIAGRAMS.md`
