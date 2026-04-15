# 07. BPMN Diagrams

This document adds BPMN-style diagrams for core EventMN flows.

Note: These diagrams are written as PlantUML activity diagrams (BPMN-like), because the rest of the docs already use PlantUML.

## 1) Booking + Seat Lock + Confirmation

```plantuml
@startuml BPMN - Booking Seat Lock
title BPMN - Booking + Seat Lock + Confirmation

start

partition "User" {
  :Browse event;
  :Select seats;
}

partition "Frontend" {
  :POST /api/seats/lock;
}

partition "Gateway" {
  if (Public endpoint?) then (No)
    :Verify JWT;
    :Add x-user-* headers;
  endif
  :Add internal HMAC headers;
  :Proxy to Booking Service;
}

partition "Booking Service" {
  :Verify internal HMAC;
  :Lock seats in Redis (TTL 600s);
  if (Lock success?) then (Yes)
    :Return lockedSeats;
  else (No)
    :Return 409 conflict;
    stop
  endif
}

partition "User" {
  :Proceed to payment;
}

partition "Frontend" {
  :POST /api/bookings/{id}/confirm;
}

partition "Gateway" {
  :Verify JWT;
  :Add x-user-* headers;
  :Add internal HMAC headers;
  :Proxy to Booking Service;
}

partition "Booking Service" {
  :Verify internal HMAC;
  :Confirm booking in PostgreSQL;
  :Publish booking.confirmed (RabbitMQ);
  :Return success;
}

partition "Notification Service" {
  :Consume booking.confirmed;
  :Persist notification;
  :Send email;
}

stop
@enduml
```

## 2) Event Moderation (Admin Approve / Reject)

```plantuml
@startuml BPMN - Event Moderation
title BPMN - Event Moderation (Approve/Reject)

start

partition "Organizer" {
  :Create/Update event;
  :Submit for review (status=PENDING);
}

partition "Admin" {
  :Open admin event queue;
  if (Decision) then (Approve)
    :POST /api/admin/events/{id}/approve;
  else (Reject)
    :POST /api/admin/events/{id}/reject;
  endif
}

partition "Gateway" {
  :Verify JWT;
  if (role == ADMIN?) then (Yes)
    :Add x-user-* headers;
    :Add internal HMAC headers;
    :Proxy to Event Service;
  else (No)
    :Return 403;
    stop
  endif
}

partition "Event Service" {
  :Verify internal HMAC;
  if (Approve) then (Yes)
    :Update status PENDING -> PUBLISHED;
    :Publish event.approved;
  else (No)
    :Update status PENDING -> DRAFT;
    :Save rejectionReason;
    :Publish event.rejected;
  endif
}

partition "Notification Service" {
  :Consume event.approved/event.rejected;
  :Persist notification;
  :Send email;
}

stop
@enduml
```
