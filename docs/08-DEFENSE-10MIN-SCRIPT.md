# 08. Defense Script (10 minutes)

This doc is a speaking guide for a ~10 minute diploma defense. It is aligned with the current repository structure and implemented endpoints.

## 0) One-liner (10 sec)

EventMN is an event + seat-based ticket booking platform built with a microservices architecture: Gateway + 4 services, Redis for seat locking, RabbitMQ for async notifications, and PostgreSQL (Prisma) for persistence.

## 1) Problem & Goal (45-60 sec)

What we built:
- Users can register/login with OTP verification.
- Organizers/admins can create events and attach them to venues.
- Users can select seats on an event detail page and create/confirm a booking.
- The system prevents seat double-booking during concurrent selection.

Key engineering challenge:
- Concurrency: many users may click the same seat at the same time.
- We need a temporary lock with expiration, and the final booking must be persisted reliably.

## 2) Technology Stack (45-60 sec)

- Frontend: Next.js (App Router), React, Tailwind, Zustand.
- Gateway: Next.js route handler that proxies all `/api/*` calls.
- Services: Next.js route handlers (per service) implementing business logic.
- DB: PostgreSQL, Prisma ORM (migrations + type safety).
- Redis: seat lock with TTL.
- RabbitMQ: message broker for async workflows (notifications).
- Docker Compose: local orchestration.

## 3) Architecture Overview (1.5-2 min)

### 3.1 Diagram to draw on PPT

Draw 4 layers:
1) Client (Browser)
2) Frontend (`frontend/`)
3) API Gateway (`gateway/`)
4) Services (`services/*`) + Data stores (PostgreSQL, Redis, RabbitMQ)

Minimal diagram:

```
Browser
  |
Frontend (Next.js)
  |
Gateway (JWT verify + routing + internal signature)
  |----> user-service (Auth/OTP) ----> PostgreSQL (schema=user)
  |----> event-service (Events/Venues/Upload) ----> PostgreSQL (schema=event)
  |----> booking-service (Bookings/Seats) ----> PostgreSQL (schema=booking)
  |                                    |
  |                                    +--> Redis (seat locks, TTL)
  |                                    +--> RabbitMQ publish
  |----> notification-service (consume + persist + send) ----> PostgreSQL (schema=notification)
                                       |
                                       +--> RabbitMQ consume
```

### 3.2 “Microservice” proof points

- Separate deployable units: `gateway/`, `services/user-service/`, `services/event-service/`, `services/booking-service/`, `services/notification-service/`.
- Clear API boundaries: each service owns its endpoints under `services/*/src/app/api/**/route.ts`.
- Data ownership: schema-per-service in PostgreSQL, each service has its own Prisma schema.
- Async integration via RabbitMQ (decoupled notifications).

## 4) Gateway: Entry Point + Security Model (1 min)

What Gateway does:
- All client requests go to the Gateway at `/api/*`.
- JWT verification for protected routes.
- Adds user context headers downstream (`x-user-id`, `x-user-role`, etc.).
- Adds internal HMAC signature headers (`x-internal-ts`, `x-internal-signature`) so services can reject direct calls.

Code reference:
- Routing + JWT verify + internal signing: `gateway/src/app/api/[...path]/route.ts`

## 5) Endpoint Map (1-1.5 min)

Explain that the Gateway forwards these to services:

### User Service (Auth + OTP)
- `POST /api/auth/register` -> `services/user-service/src/app/api/auth/register/route.ts`
- `POST /api/auth/login` -> `services/user-service/src/app/api/auth/login/route.ts`
- `POST /api/auth/refresh` -> `services/user-service/src/app/api/auth/refresh/route.ts`
- `POST /api/auth/resend-otp` -> `services/user-service/src/app/api/auth/resend-otp/route.ts`
- `POST /api/auth/verify-otp` -> `services/user-service/src/app/api/auth/verify-otp/route.ts`
- `GET/PATCH /api/users/me` -> `services/user-service/src/app/api/users/me/route.ts`

### Event Service (Events + Venues + Upload)
- `GET/POST /api/events` -> `services/event-service/src/app/api/events/route.ts`
- `GET/PATCH/DELETE /api/events/:id` -> `services/event-service/src/app/api/events/[id]/route.ts`
- `POST /api/events/:id/cancel` -> `services/event-service/src/app/api/events/[id]/cancel/route.ts`
- `GET/POST /api/venues` -> `services/event-service/src/app/api/venues/route.ts`
- `GET/PATCH/DELETE /api/venues/:id` -> `services/event-service/src/app/api/venues/[id]/route.ts`
- `GET/POST /api/upload` -> `services/event-service/src/app/api/upload/route.ts`

### Booking Service (Seats + Bookings)
- `GET /api/seats/status?eventId=...` -> `services/booking-service/src/app/api/seats/status/route.ts`
- `POST /api/seats/lock` -> `services/booking-service/src/app/api/seats/lock/route.ts`
- `POST /api/seats/unlock` -> `services/booking-service/src/app/api/seats/unlock/route.ts`
- `POST /api/bookings` -> `services/booking-service/src/app/api/bookings/route.ts`
- `POST /api/bookings/:id/confirm` -> `services/booking-service/src/app/api/bookings/[id]/confirm/route.ts`

### Notification Service
- `GET/PATCH /api/notifications` -> `services/notification-service/src/app/api/notifications/route.ts`
- RabbitMQ consumer entry: `services/notification-service/src/lib/consumer.ts`

## 6) Core Implementation: Seat Lock + Booking Flow (2 min)

### 6.1 Why Redis

- Seat selection creates a temporary state.
- Redis supports atomic "set if not exists" and TTL, ideal for short-lived locks.

### 6.2 Locking algorithm (talk track)

- When user selects seats, frontend calls `POST /api/seats/lock`.
- Booking service writes keys to Redis:
  - `seat:{eventId}:{sectionId}:{row}:{seatNumber}` => `userId` with TTL 600s.
- If any seat cannot be locked, the request fails (prevents partial locks).

Code reference:
- Redis lock/unlock/extend helpers: `services/booking-service/src/lib/redis.ts`

### 6.3 Confirmation + notifications

- Booking is persisted in PostgreSQL (booking-service DB).
- On success, booking-service publishes an event to RabbitMQ.
- Notification service consumes it and persists notifications + sends email.

Code references:
- Booking create: `services/booking-service/src/app/api/bookings/route.ts`
- Publish message: `services/booking-service/src/lib/rabbitmq.ts`
- Consume message: `services/notification-service/src/lib/consumer.ts`

## 7) Data Layer (Prisma + PostgreSQL) (1 min)

- Prisma gives type-safe DB access and repeatable migrations.
- We use a schema-per-service approach (`?schema=user|event|booking|notification`).

Code references:
- Example schema: `services/event-service/prisma/schema.prisma`
- Others: `services/*/prisma/schema.prisma`

## 8) UI Integration Points (45-60 sec)

Key pages to mention:
- Event list: `frontend/src/app/events/page.tsx`
- Event detail + seat map: `frontend/src/app/events/[id]/page.tsx`
- Booking confirmation: `frontend/src/app/booking/confirm/page.tsx`
- Admin venue management (sections config): `frontend/src/app/admin/venues/page.tsx`

Important note (seat map data):
- SeatMap uses venue sections when available; it can fallback to event ticketInfo to still render booking UI.

## 9) Demo Plan (60-90 sec)

Suggested 4-step demo:
1) Admin creates venue with sections.
2) Create an event linked to that venue.
3) Open event detail and show seat map (status + lock behavior).
4) Confirm booking and show it in bookings/notifications.

## 10) Wrap-up (20-30 sec)

- Microservices provide separation of concerns and independent scaling.
- Redis solves concurrent seat selection with expiring locks.
- RabbitMQ decouples notifications and improves resilience.
- Prisma + PostgreSQL provides reliable persistence and easy schema evolution.
