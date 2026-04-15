# Sequence Diagrams

## 1. Бүртгүүлэх (User Registration)

```plantuml
@startuml User Registration Sequence
actor User
participant Frontend
participant Gateway
participant UserService
database PostgreSQL
participant EmailService

User -> Frontend: Бүртгүүлэх хүсэлт\n(email, password, name)
Frontend -> Gateway: POST /api/auth/register
Gateway -> UserService: Forward request

UserService -> PostgreSQL: Check email exists
PostgreSQL --> UserService: Not found

UserService -> UserService: Hash password (bcrypt)
UserService -> PostgreSQL: Create user (isVerified=false)
PostgreSQL --> UserService: User created

UserService -> UserService: Generate 6-digit OTP
UserService -> PostgreSQL: Save OTP (5 min TTL)
PostgreSQL --> UserService: OTP saved

UserService -> EmailService: Send OTP email
EmailService --> UserService: Email sent

UserService --> Gateway: { user, message: "OTP sent" }
Gateway --> Frontend: 201 Created
Frontend --> User: Харуулах: OTP оруулах хуудас
@enduml
```

### ASCII Diagram
```
┌──────┐          ┌──────────┐          ┌─────────┐          ┌────────────┐          ┌────────────┐          ┌────────────┐
│ User │          │ Frontend │          │ Gateway │          │UserService │          │ PostgreSQL │          │EmailService│
└──┬───┘          └────┬─────┘          └────┬────┘          └─────┬──────┘          └─────┬──────┘          └─────┬──────┘
   │                   │                     │                     │                       │                       │
   │ Бүртгүүлэх хүсэлт │                     │                     │                       │                       │
   │──────────────────>│                     │                     │                       │                       │
   │                   │                     │                     │                       │                       │
   │                   │ POST /api/auth/register                   │                       │                       │
   │                   │────────────────────>│                     │                       │                       │
   │                   │                     │                     │                       │                       │
   │                   │                     │ Forward request     │                       │                       │
   │                   │                     │────────────────────>│                       │                       │
   │                   │                     │                     │                       │                       │
   │                   │                     │                     │ Check email exists    │                       │
   │                   │                     │                     │──────────────────────>│                       │
   │                   │                     │                     │                       │                       │
   │                   │                     │                     │      Not found        │                       │
   │                   │                     │                     │<──────────────────────│                       │
   │                   │                     │                     │                       │                       │
   │                   │                     │                     │ Hash password         │                       │
   │                   │                     │                     │───────┐               │                       │
   │                   │                     │                     │       │               │                       │
   │                   │                     │                     │<──────┘               │                       │
   │                   │                     │                     │                       │                       │
   │                   │                     │                     │ Create user           │                       │
   │                   │                     │                     │──────────────────────>│                       │
   │                   │                     │                     │                       │                       │
   │                   │                     │                     │    User created       │                       │
   │                   │                     │                     │<──────────────────────│                       │
   │                   │                     │                     │                       │                       │
   │                   │                     │                     │ Generate OTP          │                       │
   │                   │                     │                     │───────┐               │                       │
   │                   │                     │                     │       │               │                       │
   │                   │                     │                     │<──────┘               │                       │
   │                   │                     │                     │                       │                       │
   │                   │                     │                     │ Save OTP              │                       │
   │                   │                     │                     │──────────────────────>│                       │
   │                   │                     │                     │                       │                       │
   │                   │                     │                     │ Send OTP email        │                       │
   │                   │                     │                     │──────────────────────────────────────────────>│
   │                   │                     │                     │                       │                       │
   │                   │                     │                     │      Email sent       │                       │
   │                   │                     │                     │<──────────────────────────────────────────────│
   │                   │                     │                     │                       │                       │
   │                   │                     │   201 Created       │                       │                       │
   │                   │                     │<────────────────────│                       │                       │
   │                   │                     │                       │                       │                       │
   │                   │ 201 + OTP хуудас    │                     │                       │                       │
   │                   │<────────────────────│                     │                       │                       │
   │                   │                     │                     │                       │                       │
   │ OTP оруулах хуудас│                     │                     │                       │                       │
   │<──────────────────│                     │                     │                       │                       │
   │                   │                     │                     │                       │                       │
```

---

## 2. Нэвтрэх (User Login)

```plantuml
@startuml User Login Sequence
actor User
participant Frontend
participant Gateway
participant UserService
database PostgreSQL
database Redis

User -> Frontend: Нэвтрэх хүсэлт\n(email, password)
Frontend -> Gateway: POST /api/auth/login
Gateway -> UserService: Forward request

UserService -> PostgreSQL: Find user by email
PostgreSQL --> UserService: User found

UserService -> UserService: Verify password (bcrypt)
alt Password invalid
    UserService --> Gateway: 401 Unauthorized
    Gateway --> Frontend: Invalid credentials
    Frontend --> User: Алдааны мэдэгдэл
else Password valid
    alt User not verified
        UserService --> Gateway: 403 Forbidden
        Gateway --> Frontend: Please verify OTP
        Frontend --> User: OTP хуудас руу
    else User verified
        UserService -> UserService: Generate Access Token (15 min)
        UserService -> UserService: Generate Refresh Token (7 days)
        UserService -> PostgreSQL: Save Refresh Token
        PostgreSQL --> UserService: Token saved
        
        UserService --> Gateway: { accessToken, refreshToken, user }
        Gateway --> Frontend: 200 OK
        Frontend -> Frontend: Store tokens
        Frontend --> User: Нүүр хуудас руу
    end
end
@enduml
```

### ASCII Diagram
```
┌──────┐          ┌──────────┐          ┌─────────┐          ┌────────────┐          ┌────────────┐
│ User │          │ Frontend │          │ Gateway │          │UserService │          │ PostgreSQL │
└──┬───┘          └────┬─────┘          └────┬────┘          └─────┬──────┘          └─────┬──────┘
   │                   │                     │                     │                       │
   │ email, password   │                     │                     │                       │
   │──────────────────>│                     │                     │                       │
   │                   │                     │                     │                       │
   │                   │ POST /api/auth/login│                     │                       │
   │                   │────────────────────>│                     │                       │
   │                   │                     │                     │                       │
   │                   │                     │ Forward request     │                       │
   │                   │                     │────────────────────>│                       │
   │                   │                     │                     │                       │
   │                   │                     │                     │ Find user by email    │
   │                   │                     │                     │──────────────────────>│
   │                   │                     │                     │                       │
   │                   │                     │                     │     User found        │
   │                   │                     │                     │<──────────────────────│
   │                   │                     │                     │                       │
   │                   │                     │                     │ Verify bcrypt         │
   │                   │                     │                     │───────┐               │
   │                   │                     │                     │       │ Valid         │
   │                   │                     │                     │<──────┘               │
   │                   │                     │                     │                       │
   │                   │                     │                     │ Generate tokens       │
   │                   │                     │                     │───────┐               │
   │                   │                     │                     │       │               │
   │                   │                     │                     │<──────┘               │
   │                   │                     │                     │                       │
   │                   │                     │                     │ Save refresh token    │
   │                   │                     │                     │──────────────────────>│
   │                   │                     │                     │                       │
   │                   │                     │  { tokens, user }   │                       │
   │                   │                     │<────────────────────│                       │
   │                   │                     │                     │                       │
   │                   │ 200 OK + tokens     │                     │                       │
   │                   │<────────────────────│                     │                       │
   │                   │                     │                     │                       │
   │  Нүүр хуудас      │                     │                     │                       │
   │<──────────────────│                     │                     │                       │
```

---

## 3. Захиалга хийх (Booking Flow)

```plantuml
@startuml Booking Flow Sequence
actor User
participant Frontend
participant Gateway
participant BookingService
participant EventService
database Redis
database PostgreSQL
participant RabbitMQ
participant NotificationService

== Суудал түгжих ==
User -> Frontend: Суудал сонгох
Frontend -> Gateway: POST /api/seats/lock\n{eventId, seats}
Gateway -> BookingService: Forward request

BookingService -> Redis: Check seats availability
Redis --> BookingService: All seats available

BookingService -> Redis: SETEX seats (TTL: 600s)
Redis --> BookingService: Locked

BookingService --> Gateway: { success, expiresAt }
Gateway --> Frontend: 200 OK
Frontend --> User: Countdown timer эхлэх (10 min)

== Захиалга үүсгэх ==
User -> Frontend: Захиалга баталгаажуулах
Frontend -> Gateway: POST /api/bookings\n{eventId, seats}
Gateway -> BookingService: Forward request

BookingService -> Redis: Verify locks still valid
Redis --> BookingService: Locks valid

BookingService -> EventService: GET /api/events/{id}
EventService --> BookingService: Event details (price)

BookingService -> PostgreSQL: Create booking (PENDING)
PostgreSQL --> BookingService: Booking created

BookingService --> Gateway: { booking }
Gateway --> Frontend: 201 Created
Frontend --> User: Төлбөр хийх хуудас

== Захиалга баталгаажуулах ==
User -> Frontend: Төлбөр хийх
Frontend -> Gateway: POST /api/bookings/{id}/confirm
Gateway -> BookingService: Forward request

BookingService -> PostgreSQL: Update booking (CONFIRMED)
PostgreSQL --> BookingService: Updated

BookingService -> Redis: Delete seat locks
Redis --> BookingService: Deleted

BookingService -> RabbitMQ: Publish booking.confirmed
RabbitMQ --> NotificationService: Consume message

NotificationService -> NotificationService: Send email

BookingService --> Gateway: { booking }
Gateway --> Frontend: 200 OK
Frontend --> User: Захиалга амжилттай!
@enduml
```

### ASCII Diagram (Simplified)
```
┌──────┐       ┌──────────┐       ┌─────────┐       ┌──────────────┐       ┌───────┐       ┌────────────┐       ┌──────────┐
│ User │       │ Frontend │       │ Gateway │       │BookingService│       │ Redis │       │ PostgreSQL │       │ RabbitMQ │
└──┬───┘       └────┬─────┘       └────┬────┘       └──────┬───────┘       └───┬───┘       └─────┬──────┘       └────┬─────┘
   │                │                  │                   │                   │                 │                   │
   │ ═══════════════════════════════ СУУДАЛ ТҮГЖИХ ═══════════════════════════════════════════════════════════════ │
   │                │                  │                   │                   │                 │                   │
   │ Суудал сонгох  │                  │                   │                   │                 │                   │
   │───────────────>│                  │                   │                   │                 │                   │
   │                │ POST /seats/lock │                   │                   │                 │                   │
   │                │─────────────────>│                   │                   │                 │                   │
   │                │                  │ Forward           │                   │                 │                   │
   │                │                  │──────────────────>│                   │                 │                   │
   │                │                  │                   │ Check availability│                 │                   │
   │                │                  │                   │──────────────────>│                 │                   │
   │                │                  │                   │ Available         │                 │                   │
   │                │                  │                   │<──────────────────│                 │                   │
   │                │                  │                   │ SETEX (10 min TTL)│                 │                   │
   │                │                  │                   │──────────────────>│                 │                   │
   │                │                  │                   │ Locked            │                 │                   │
   │                │                  │                   │<──────────────────│                 │                   │
   │                │                  │ { expiresAt }     │                   │                 │                   │
   │                │                  │<──────────────────│                   │                 │                   │
   │                │ 200 OK           │                   │                   │                 │                   │
   │                │<─────────────────│                   │                   │                 │                   │
   │ Timer: 10:00   │                  │                   │                   │                 │                   │
   │<───────────────│                  │                   │                   │                 │                   │
   │                │                  │                   │                   │                 │                   │
   │ ═══════════════════════════════ ЗАХИАЛГА БАТАЛГААЖУУЛАХ ═════════════════════════════════════════════════════ │
   │                │                  │                   │                   │                 │                   │
   │ Баталгаажуулах │                  │                   │                   │                 │                   │
   │───────────────>│                  │                   │                   │                 │                   │
   │                │POST /bookings/confirm                │                   │                 │                   │
   │                │─────────────────>│                   │                   │                 │                   │
   │                │                  │──────────────────>│                   │                 │                   │
   │                │                  │                   │ Verify locks      │                 │                   │
   │                │                  │                   │──────────────────>│                 │                   │
   │                │                  │                   │ Valid             │                 │                   │
   │                │                  │                   │<──────────────────│                 │                   │
   │                │                  │                   │ Create booking    │                 │                   │
   │                │                  │                   │────────────────────────────────────>│                   │
   │                │                  │                   │ Created           │                 │                   │
   │                │                  │                   │<────────────────────────────────────│                   │
   │                │                  │                   │ Publish event     │                 │                   │
   │                │                  │                   │─────────────────────────────────────────────────────────>
   │                │                  │ { booking }       │                   │                 │                   │
   │                │                  │<──────────────────│                   │                 │                   │
   │                │ 200 OK           │                   │                   │                 │                   │
   │                │<─────────────────│                   │                   │                 │                   │
   │ Амжилттай!     │                  │                   │                   │                 │                   │
   │<───────────────│                  │                   │                   │                 │                   │
```

---

## 4. Эвент зөвшөөрөх (Admin Approve Event)

```plantuml
@startuml Admin Approve Event Sequence
actor Admin
participant Frontend
participant Gateway
participant EventService
database PostgreSQL
participant RabbitMQ
participant NotificationService

Admin -> Frontend: Эвент зөвшөөрөх товч дарах
Frontend -> Gateway: POST /api/admin/events/{id}/approve\nAuthorization: Bearer token
Gateway -> Gateway: Verify JWT token
Gateway -> Gateway: Check role == ADMIN

alt Not Admin
    Gateway --> Frontend: 403 Forbidden
    Frontend --> Admin: Эрхгүй
else Is Admin
    Gateway -> EventService: Forward request
    
    EventService -> PostgreSQL: Find event by ID
    PostgreSQL --> EventService: Event found
    
    alt Event not PENDING
        EventService --> Gateway: 400 Bad Request
        Gateway --> Frontend: Cannot approve
        Frontend --> Admin: Алдаа: Төлөв буруу
    else Event is PENDING
        EventService -> PostgreSQL: Update status = PUBLISHED
        PostgreSQL --> EventService: Updated
        
        EventService -> RabbitMQ: Publish event.approved\n{eventId, organizerId, eventTitle}
        RabbitMQ --> NotificationService: Consume message
        
        NotificationService -> NotificationService: Create notification
        NotificationService -> NotificationService: Send email to organizer
        
        EventService --> Gateway: { event }
        Gateway --> Frontend: 200 OK
        Frontend --> Admin: Эвент зөвшөөрөгдлөө!
    end
end
@enduml
```

---

## 5. Захиалга цуцлах (Cancel Booking)

```plantuml
@startuml Cancel Booking Sequence
actor User
participant Frontend
participant Gateway
participant BookingService
participant EventService
database PostgreSQL
participant RabbitMQ
participant NotificationService

User -> Frontend: Захиалга цуцлах
Frontend -> Gateway: POST /api/bookings/{id}/cancel
Gateway -> BookingService: Forward request

BookingService -> PostgreSQL: Find booking by ID
PostgreSQL --> BookingService: Booking found

BookingService -> BookingService: Verify ownership (userId)

BookingService -> EventService: GET /api/events/{eventId}
EventService --> BookingService: Event details

BookingService -> BookingService: Calculate refund\n(based on event startDate)

note right of BookingService
  48+ цаг өмнө: 100%
  24-48 цаг: 50%
  <24 цаг: 0%
end note

BookingService -> PostgreSQL: Update booking\n(status=CANCELLED)
PostgreSQL --> BookingService: Updated

BookingService -> RabbitMQ: Publish booking.cancelled\n{bookingId, userId, userEmail, userName, eventTitle, refundInfo, reason}
RabbitMQ --> NotificationService: Consume message

NotificationService -> NotificationService: Create notification
NotificationService -> NotificationService: Send cancellation email

BookingService --> Gateway: { booking, refund }
Gateway --> Frontend: 200 OK
Frontend --> User: Цуцлагдлаа!\nБуцаалт: {refundInfo}
@enduml
```

---

## 6. Microservices хоорондын харилцаа (Inter-service Communication)

```plantuml
@startuml Microservices Communication
participant "API Gateway\n:3000" as Gateway
participant "User Service\n:3001" as User
participant "Event Service\n:3002" as Event
participant "Booking Service\n:3003" as Booking
participant "Notification Service\n:3004" as Notification
queue "RabbitMQ\n:5672" as MQ
database "Redis\n:6379" as Redis

== Synchronous (REST API) ==
Gateway -> User: POST /api/auth/login
User --> Gateway: { tokens }

Gateway -> Event: GET /api/events
Event --> Gateway: { events[] }

Booking -> Event: GET /api/events/{id}\n(internal call)
Event --> Booking: { event }

== Asynchronous (RabbitMQ) ==
Booking -> MQ: publish("booking.confirmed", data)
MQ -> Notification: consume("booking.confirmed")

Event -> MQ: publish("event.approved", data)
MQ -> Notification: consume("event.approved")

Booking -> MQ: publish("event.reminder", data)
MQ -> Notification: consume("event.reminder")

== Shared State (Redis) ==
Booking -> Redis: SETEX seat:event123:A1 userId 600
Booking -> Redis: GET seat:event123:A1
Redis --> Booking: userId or null

note over MQ
  Queues:
  - booking.confirmed
  - booking.cancelled
  - event.approved
  - event.rejected
  - event.reminder
end note
@enduml
```

### ASCII Diagram
```
                              ┌─────────────────────────────────────────────────────────────────┐
                              │                    SYNCHRONOUS (REST API)                       │
                              └─────────────────────────────────────────────────────────────────┘
                                                          │
        ┌──────────────┐                                  │                                  
        │              │                                  ▼                                  
        │    Client    │──────────────────────────> ┌──────────┐                            
        │   (Browser)  │                            │ Gateway  │                            
        │              │<────────────────────────── │  :3000   │                            
        └──────────────┘                            └────┬─────┘                            
                                                         │                                  
                                 ┌───────────────────────┼───────────────────────┐          
                                 │                       │                       │          
                                 ▼                       ▼                       ▼          
                          ┌──────────┐            ┌──────────┐            ┌──────────┐     
                          │   User   │            │  Event   │            │ Booking  │     
                          │ Service  │            │ Service  │<───────────│ Service  │     
                          │  :3001   │            │  :3002   │  internal  │  :3003   │     
                          └──────────┘            └──────────┘    API     └────┬─────┘     
                                                                               │           
                                                                               │           
                              ┌─────────────────────────────────────────────────────────────────┐
                              │                   ASYNCHRONOUS (RabbitMQ)                       │
                              └─────────────────────────────────────────────────────────────────┘
                                                          │
                                                          ▼
        ┌──────────┐         ┌──────────┐         ┌──────────────┐         ┌──────────────┐
        │  Event   │ publish │          │ consume │ Notification │  email  │    User      │
        │ Service  │────────>│ RabbitMQ │────────>│   Service    │────────>│   (Email)    │
        │          │         │  :5672   │         │    :3004     │         │              │
        └──────────┘         │          │         └──────────────┘         └──────────────┘
        ┌──────────┐ publish │          │                                                  
        │ Booking  │────────>│          │                                                  
        │ Service  │         └──────────┘                                                  
        └────┬─────┘                                                                       
             │                                                                              
             │               ┌─────────────────────────────────────────────────────────────────┐
             │               │                    SHARED STATE (Redis)                         │
             │               └─────────────────────────────────────────────────────────────────┘
             │                                         │
             │                                         ▼
             │                                  ┌──────────────┐
             └─────────────────────────────────>│    Redis     │
                         seat locking           │    :6379     │
                                                │              │
                                                │ seat:e1:A1   │
                                                │ seat:e1:A2   │
                                                │ seat:e1:B1   │
                                                └──────────────┘
```

---

## Message Queue Flows

| Queue Name | Publisher | Consumer | Payload |
|------------|-----------|----------|---------|
| booking.confirmed | Booking Service | Notification Service | { bookingId, userId, eventId, seats, totalAmount } |
| booking.cancelled | Booking Service | Notification Service | { bookingId, userId, refundInfo, reason } |
| event.approved | Event Service | Notification Service | { eventId, organizerId, eventTitle } |
| event.rejected | Event Service | Notification Service | { eventId, organizerId, eventTitle, reason } |
| event.reminder | Booking Service (reminder scheduler) | Notification Service | { bookingId, eventId, userId, userEmail, userName, eventTitle, eventDate, venueName, sentAt } |
