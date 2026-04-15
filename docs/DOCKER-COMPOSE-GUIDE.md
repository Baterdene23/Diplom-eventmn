# Docker Compose - Дэлгэрэнгүй Гарын Авлага

> **Зорилго**: Docker Compose-ийн үүрэг, бүрэлдэхүүн хэсэг бүрийн тайлбар, шалгах командууд, зөв зохион байгуулалт, deploy хийх заавар.

---

## Агуулга

1. [Docker Compose гэж юу вэ?](#1-docker-compose-гэж-юу-вэ)
2. [Файлын Бүтэц ба Синтакс](#2-файлын-бүтэц-ба-синтакс)
3. [Бүрэлдэхүүн Хэсгүүдийн Дэлгэрэнгүй Тайлбар](#3-бүрэлдэхүүн-хэсгүүдийн-дэлгэрэнгүй-тайлбар)
4. [Сервис Бүрийн Үүрэг](#4-сервис-бүрийн-үүрэг)
5. [Шалгах Командууд](#5-шалгах-командууд)
6. [Зөв Зохион Байгуулалт](#6-зөв-зохион-байгуулалт)
7. [Түгээмэл Асуудлууд ба Шийдэл](#7-түгээмэл-асуудлууд-ба-шийдэл)
8. [Production vs Development](#8-production-vs-development)

---

## 1. Docker Compose гэж юу вэ?

### 1.1 Тодорхойлолт

**Docker Compose** нь олон контейнерт аппликейшнийг **нэг YAML файлаар** тодорхойлж, удирдах хэрэгсэл юм.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE ҮҮРЭГ                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   docker-compose.yml  ──────►  docker-compose up                    │
│         │                              │                            │
│         │                              ▼                            │
│         │                    ┌──────────────────┐                   │
│         │                    │   Container 1    │                   │
│         │                    │   (user-service) │                   │
│         │                    └──────────────────┘                   │
│         │                    ┌──────────────────┐                   │
│         ├──────────────────► │   Container 2    │                   │
│         │                    │  (event-service) │                   │
│         │                    └──────────────────┘                   │
│         │                    ┌──────────────────┐                   │
│         │                    │   Container 3    │                   │
│         │                    │   (PostgreSQL)   │                   │
│         │                    └──────────────────┘                   │
│         │                    ┌──────────────────┐                   │
│         └──────────────────► │   Container N    │                   │
│                              │      (...)       │                   │
│                              └──────────────────┘                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Яагаад Docker Compose хэрэглэдэг вэ?

| Асуудал | Docker Compose-гүй | Docker Compose-тай |
|---------|-------------------|-------------------|
| **Олон контейнер эхлүүлэх** | 10+ `docker run` команд | `docker-compose up -d` |
| **Сүлжээ тохируулах** | `docker network create`, link | Автоматаар үүсдэг |
| **Environment variables** | Команд бүрт дамжуулах | `.env` файл, YAML |
| **Хамаарал (depends_on)** | Гараар дарааллаар эхлүүлэх | Автомат дараалал |
| **Дахин үүсгэх (rebuild)** | Олон алхам | `docker-compose up --build` |

### 1.3 Микросервис Архитектурт Docker Compose

Таны дипломын ажилд Docker Compose нь:
- **4 микросервис** (User, Event, Booking, Notification)
- **1 өгөгдлийн сан** (PostgreSQL - schema-per-service)
- **2 дэд бүтцийн сервис** (Redis, RabbitMQ)
- **API Gateway + Frontend**

Нийт **8 контейнер**-ийг нэг командаар удирдах боломж олгоно.

---

## 2. Файлын Бүтэц ба Синтакс

### 2.1 docker-compose.yml Үндсэн Бүтэц

```yaml
# Хувилбар (optional in Compose V2)
version: '3.8'

# СЕРВИСҮҮД - Гол хэсэг
services:
  service-name:
    image: image:tag           # Бэлэн image ашиглах
    build:                     # Эсвэл Dockerfile-аас build хийх
      context: ./path
      dockerfile: Dockerfile
    container_name: my-container
    ports:
      - "host:container"
    environment:
      - KEY=value
    volumes:
      - volume:/path
    depends_on:
      - other-service
    networks:
      - my-network
    restart: unless-stopped

# VOLUMES - Өгөгдөл хадгалах
volumes:
  volume-name:
    driver: local

# NETWORKS - Сүлжээ
networks:
  my-network:
    driver: bridge
```

### 2.2 Таны docker-compose.yml-ийн Бүтэц

```
docker-compose.yml
├── services:
│   ├── DATABASES (1)
│   │   └── postgres       (PostgreSQL - host port 5433)
│   │
│   ├── INFRASTRUCTURE (2)
│   │   ├── redis          (port 6379)
│   │   └── rabbitmq       (ports 5672, 15672)
│   │
│   ├── MICROSERVICES (4)
│   │   ├── user-service       (port 3001)
│   │   ├── event-service      (port 3002)
│   │   ├── booking-service    (port 3003)
│   │   └── notification-service (port 3004)
│   │
│   ├── API GATEWAY (1)
│   │   └── gateway        (port 3000)
│   │
│   └── FRONTEND (1)
│       └── frontend       (port 8080)
│
├── volumes: (3)
│   ├── postgres-data
│   ├── redis-data
│   └── rabbitmq-data
│
└── networks: (1)
    └── eventmn-network
```

---

## 3. Бүрэлдэхүүн Хэсгүүдийн Дэлгэрэнгүй Тайлбар

### 3.1 image vs build

```yaml
# OPTION 1: Бэлэн image ашиглах (postgres, redis, rabbitmq)
postgres:
  image: postgres:15-alpine    # Docker Hub-аас татна
  
# OPTION 2: Dockerfile-аас build хийх (microservices)
user-service:
  build:
    context: ./services/user-service  # Dockerfile байрлах хавтас
    dockerfile: Dockerfile            # Dockerfile нэр
```

**Хэзээ аль нь вэ?**
| Төрөл | image | build |
|-------|-------|-------|
| Databases | ✅ | ❌ |
| Redis, RabbitMQ | ✅ | ❌ |
| Өөрийн сервисүүд | ❌ | ✅ |

### 3.2 ports - Порт Mapping

```yaml
ports:
  - "5432:5432"    # host:container
  #    │     │
  #    │     └── Container дотор ажиллаж буй порт
  #    └──────── Host (таны компьютер) дээрх порт
```

**Жишээ:**
```yaml
postgres:
  ports:
    - "5432:5432"   # localhost:5432 -> container:5432
    
postgres:
  ports:
    - "5433:5432"   # localhost:5433 -> container:5432 (өөр host порт!)
```

```
┌─────────────────┐         ┌─────────────────┐
│   Your Machine  │         │   Container     │
│                 │         │                 │
│  localhost:5433 │ ──────► │  postgres:5432  │  postgres
│  localhost:6379 │ ──────► │  redis:6379     │  redis
└─────────────────┘         └─────────────────┘
```

### 3.3 environment - Орчны хувьсагчид

```yaml
user-service:
  environment:
    # Өгөгдлийн сангийн холболт
    DATABASE_URL: postgresql://postgres:123456@postgres:5432/eventmn?schema=user
    #             protocol://username:password@hostname:port/database
    #                                           │
    #                                           └── Container name (NOT localhost!)
    
    REDIS_URL: redis://redis:6379
    #                  │
    #                  └── Container name
    
    JWT_SECRET: your-super-secret-jwt-key
    RABBITMQ_URL: amqp://rabbitmq:rabbitmq123@rabbitmq:5672
```

**Чухал**: Container хооронд холбогдохдоо `localhost` биш, **service/container name** ашиглана!

### 3.4 volumes - Өгөгдөл хадгалах

```yaml
postgres:
  volumes:
    - postgres-data:/var/lib/postgresql/data
    #      │                    │
    #      │                    └── Container доторх path
    #      └──────────────────────── Volume нэр (доор тодорхойлогдсон)

volumes:
  postgres-data:    # Named volume - Docker удирддаг
```

**Яагаад volume хэрэгтэй вэ?**
```
Container устгахад          Volume-гүй          Volume-тай
─────────────────────────────────────────────────────────────
Өгөгдөл                     УСТНА! ❌           ХАДГАЛАГДНА ✅
```

### 3.5 depends_on - Хамаарал

```yaml
user-service:
  depends_on:
    - postgres      # postgres эхэлсний дараа эхэлнэ
    - redis
    - rabbitmq

gateway:
  depends_on:
    - user-service    # Бүх сервис эхэлсний дараа
    - event-service
    - booking-service
    - notification-service
```

```
Эхлэх дараалал:
═══════════════════════════════════════════════════════════

    1. Databases & Infra      2. Microservices      3. Gateway
    ─────────────────────     ────────────────      ──────────
    ┌─────────┐               ┌─────────────┐       ┌─────────┐
     │postgres │ ─────────────►│user-service │──────►│         │
    └─────────┘               └─────────────┘       │         │
    ┌─────────┐               ┌─────────────┐       │         │
     │postgres │ ─────────────►│event-service│──────►│ gateway │
    └─────────┘               └─────────────┘       │         │
    ┌─────────┐               ┌─────────────┐       │         │
    │  redis  │ ─────────────►│booking-svc  │──────►│         │
    └─────────┘               └─────────────┘       └─────────┘
    ┌─────────┐               ┌─────────────┐
    │rabbitmq │ ─────────────►│notif-service│
    └─────────┘               └─────────────┘
```

### 3.6 networks - Сүлжээ

```yaml
networks:
  eventmn-network:
    driver: bridge    # Default driver
```

**Bridge Network гэж юу вэ?**
- Бүх container-ууд нэг virtual network дотор
- Container name-аар бие биенээ олдог (DNS)
- Гадны сүлжээнээс тусгаарлагдсан

```
┌─────────────────────────────────────────────────────────────┐
│                    eventmn-network                          │
│                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │ postgres │                 │  redis   │                │
│   │ 5432     │                 │  6379    │                │
│   └──────────┘                 └──────────┘                │
│         │               │               │                   │
│         └───────────────┼───────────────┘                   │
│                         │                                   │
│   ┌─────────────────────┴─────────────────────┐             │
│   │                                           │             │
│   │  user-service ◄───► event-service         │             │
│   │       │                    │              │             │
│   │       └─────► gateway ◄────┘              │             │
│   │                  │                        │             │
│   └──────────────────┼────────────────────────┘             │
│                      │                                      │
└──────────────────────┼──────────────────────────────────────┘
                       │
                       ▼
                 Host Machine (localhost:3000)
```

---

## 4. Сервис Бүрийн Үүрэг

### 4.1 Өгөгдлийн Сан

#### postgres (PostgreSQL)

```yaml
postgres:
  image: postgres:15-alpine
  container_name: eventmn-postgres
  environment:
    POSTGRES_DB: eventmn
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: 123456
  ports:
    - "5433:5432"
  volumes:
    - postgres-data:/var/lib/postgresql/data
```

| Тохиргоо | Утга | Тайлбар |
|----------|------|---------|
| `image` | postgres:15-alpine | Хөнгөн Alpine Linux суурьтай PostgreSQL 15 |
| `POSTGRES_DB` | eventmn | Үүсгэх database нэр |
| `POSTGRES_USER` | postgres | Админ хэрэглэгч |
| `POSTGRES_PASSWORD` | 123456 | Админ нууц үг |
| `ports` | 5433:5432 | Host-оос хандах боломж |
| `volumes` | postgres-data | Өгөгдлийг хадгалах |

**Үүрэг**: Бүх сервисүүдийн өгөгдлийг schema-аар салгаж хадгалах.



### 4.2 Дэд Бүтцийн Сервисүүд

#### redis

```yaml
redis:
  image: redis:7-alpine
  container_name: redis
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
```

**Үүрэг**:
1. **Seat Locking** - Суудал түгжих (TTL 10 минут)
2. **Session Cache** - Хэрэглэгчийн session хадгалах
3. **Rate Limiting** - API хязгаарлалт (хэрэгжүүлэх боломжтой)

**Яагаад Redis?**
- In-memory = Маш хурдан (ms түвшинд)
- TTL (Time-To-Live) = Автомат устгал
- Atomic operations (SETNX) = Race condition-гүй

#### rabbitmq

```yaml
rabbitmq:
  image: rabbitmq:3-management-alpine
  container_name: rabbitmq
  environment:
    RABBITMQ_DEFAULT_USER: rabbitmq
    RABBITMQ_DEFAULT_PASS: rabbitmq123
  ports:
    - "5672:5672"     # AMQP protocol
    - "15672:15672"   # Management UI
```

**Үүрэг**:
1. **Асинхрон харилцаа** - Сервисүүд хооронд мессеж дамжуулах
2. **Decoupling** - Сервисүүдийн хамаарлыг багасгах
3. **Найдвартай хүргэлт** - Мессеж алдагдахгүй

**Портууд**:
- `5672` - AMQP (Application Message Queuing Protocol)
- `15672` - Web UI (http://localhost:15672)

### 4.3 Микросервисүүд

#### user-service

```yaml
user-service:
  build:
    context: ./services/user-service
    dockerfile: Dockerfile
  container_name: user-service
  ports:
    - "3001:3000"
  environment:
    DATABASE_URL: postgresql://postgres:123456@postgres:5432/eventmn?schema=user
    REDIS_URL: redis://redis:6379
    JWT_SECRET: your-super-secret-jwt-key-change-in-production
    RABBITMQ_URL: amqp://rabbitmq:rabbitmq123@rabbitmq:5672
    INTERNAL_API_SECRET: ${INTERNAL_API_SECRET}
  depends_on:
    - postgres
    - redis
    - rabbitmq
```

**Үүрэг**:
- Хэрэглэгч бүртгэл, нэвтрэлт
- JWT токен үүсгэх, шалгах
- OTP баталгаажуулалт
- Role удирдлага (USER, ORGANIZER, ADMIN)

#### event-service

```yaml
event-service:
  build:
    context: ./services/event-service
    dockerfile: Dockerfile
  container_name: event-service
  ports:
    - "3002:3000"
  environment:
    DATABASE_URL: postgresql://postgres:123456@postgres:5432/eventmn?schema=event
    REDIS_URL: redis://redis:6379
    RABBITMQ_URL: amqp://rabbitmq:rabbitmq123@rabbitmq:5672
    INTERNAL_API_SECRET: ${INTERNAL_API_SECRET}
  depends_on:
    - postgres
    - redis
    - rabbitmq
```

**Үүрэг**:
- Арга хэмжээ CRUD
- Байршил (Venue) удирдах
- Суудлын зураглал тохируулах
- Админ баталгаажуулалт (approve/reject)

#### booking-service

```yaml
booking-service:
  build:
    context: ./services/booking-service
    dockerfile: Dockerfile
  container_name: booking-service
  ports:
    - "3003:3000"
  environment:
    DATABASE_URL: postgresql://postgres:123456@postgres:5432/eventmn?schema=booking
    REDIS_URL: redis://redis:6379
    RABBITMQ_URL: amqp://rabbitmq:rabbitmq123@rabbitmq:5672
    INTERNAL_API_SECRET: ${INTERNAL_API_SECRET}
  depends_on:
    - postgres
    - redis
    - rabbitmq
```

**Үүрэг**:
- Суудал түгжих (Redis TTL)
- Захиалга үүсгэх, баталгаажуулах
- Захиалга цуцлах, буцаалт
- Concurrency удирдах

#### notification-service

```yaml
notification-service:
  build:
    context: ./services/notification-service
    dockerfile: Dockerfile
  container_name: notification-service
  ports:
    - "3004:3000"
  environment:
    DATABASE_URL: postgresql://postgres:123456@postgres:5432/eventmn?schema=notification
    RABBITMQ_URL: amqp://rabbitmq:rabbitmq123@rabbitmq:5672
    INTERNAL_API_SECRET: ${INTERNAL_API_SECRET}
  depends_on:
    - postgres
    - rabbitmq
```

**Үүрэг**:
- RabbitMQ-аас мессеж хүлээн авах
- Имэйл илгээх (захиалга баталгаажуулалт, цуцлалт)
- Мэдэгдэл хадгалах
- Event reminder (сануулга)

### 4.4 Gateway ба Frontend

#### gateway

```yaml
gateway:
  build:
    context: ./gateway
    dockerfile: Dockerfile
  container_name: gateway
  ports:
    - "3000:3000"
  environment:
    USER_SERVICE_URL: http://user-service:3000
    EVENT_SERVICE_URL: http://event-service:3000
    BOOKING_SERVICE_URL: http://booking-service:3000
    NOTIFICATION_SERVICE_URL: http://notification-service:3000
  depends_on:
    - user-service
    - event-service
    - booking-service
    - notification-service
```

**Үүрэг**:
- API маршрутлалт (routing)
- JWT баталгаажуулалт
- Request/Response transformation
- CORS удирдах

#### frontend

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  container_name: frontend
  ports:
    - "8080:3000"
  environment:
    NEXT_PUBLIC_API_URL: http://localhost:3000
  depends_on:
    - gateway
```

**Үүрэг**:
- Хэрэглэгчийн интерфейс
- State management (Zustand)
- API дуудлага (Gateway-р дамжуулан)

---

## 5. Шалгах Командууд

### 5.1 Үндсэн Командууд

```bash
# Бүх сервис эхлүүлэх (background)
docker-compose up -d

# Бүх сервис эхлүүлэх (logs харах)
docker-compose up

# Тодорхой сервис эхлүүлэх
docker-compose up -d postgres redis

# Бүх сервис зогсоох
docker-compose down

# Сервис + volumes устгах (АНХААРУУЛГА: Өгөгдөл устна!)
docker-compose down -v

# Дахин build хийх
docker-compose up -d --build

# Тодорхой сервис дахин build хийх
docker-compose up -d --build user-service
```

### 5.2 Статус Шалгах

```bash
# Бүх container-ийн статус
docker-compose ps

# Жишээ гаралт:
# NAME                  STATUS              PORTS
# postgres              running             0.0.0.0:5433->5432/tcp
# redis                 running             0.0.0.0:6379->6379/tcp
# rabbitmq              running             0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
# user-service          running             0.0.0.0:3001->3000/tcp
# ...

# Ажиллаж буй container-ууд (Docker level)
docker ps

# Бүх container (зогссон ч)
docker ps -a
```

### 5.3 Logs Харах

```bash
# Бүх сервисийн log
docker-compose logs

# Тодорхой сервисийн log
docker-compose logs user-service

# Real-time log (follow)
docker-compose logs -f user-service

# Сүүлийн 100 мөр
docker-compose logs --tail=100 user-service

# Олон сервисийн log
docker-compose logs -f user-service event-service gateway
```

### 5.4 Өгөгдлийн Сан Шалгах

#### PostgreSQL

```bash
# PostgreSQL руу холбогдох
docker-compose exec postgres psql -U postgres -d eventmn

# SQL командууд:
\dt                           # Бүх table жагсаах
\d users                      # Table бүтэц харах
SELECT * FROM users LIMIT 5;  # Өгөгдөл харах
\q                            # Гарах

```

#### Redis

```bash
# Redis руу холбогдох
docker-compose exec redis redis-cli

# Redis командууд:
KEYS *                        # Бүх key жагсаах
KEYS seat:*                   # Seat lock-ууд
GET seat:event1:vip:1:5       # Тодорхой key
TTL seat:event1:vip:1:5       # TTL шалгах
INFO                          # Redis мэдээлэл
exit                          # Гарах
```

#### RabbitMQ

```bash
# Queue жагсаах
docker-compose exec rabbitmq rabbitmqctl list_queues

# Exchange жагсаах
docker-compose exec rabbitmq rabbitmqctl list_exchanges

# Consumer холболт
docker-compose exec rabbitmq rabbitmqctl list_consumers

# Web UI: http://localhost:15672
# Username: rabbitmq
# Password: rabbitmq123
```

### 5.5 Сервис Холболт Шалгах

```bash
# Container дотроос бусад сервис рүү хандах
docker-compose exec user-service wget -qO- http://event-service:3000/api/health

# Gateway-р дамжуулан шалгах
curl http://localhost:3000/api/events

# Health check
curl http://localhost:3001/api/health   # User Service
curl http://localhost:3002/api/health   # Event Service
curl http://localhost:3003/api/health   # Booking Service
curl http://localhost:3004/api/health   # Notification Service
```

### 5.6 Resource Monitoring

```bash
# CPU, Memory хэрэглээ
docker stats

# Жишээ гаралт:
# CONTAINER ID   NAME              CPU %    MEM USAGE / LIMIT    MEM %
# a1b2c3d4e5f6   user-service      0.50%    150MiB / 512MiB      29.30%
# ...

# Тодорхой container
docker stats user-service booking-service

# Disk хэрэглээ (volumes)
docker system df
```

---

## 6. Зөв Зохион Байгуулалт

### 6.1 Файлын Бүтэц (Recommended)

```
eventmn-microservices/
├── docker-compose.yml              # Main compose file
├── docker-compose.override.yml     # Local development overrides
├── docker-compose.prod.yml         # Production overrides
├── .env                            # Environment variables
├── .env.example                    # Example env file
│
├── gateway/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│
├── services/
│   ├── user-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── prisma/
│   │   └── src/
│   │
│   ├── event-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │
│   ├── booking-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── prisma/
│   │   └── src/
│   │
│   └── notification-service/
│       ├── Dockerfile
│       ├── package.json
│       └── src/
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│
├── scripts/
│   ├── seed.js
│   └── generate-test-data.js
│
└── docs/
    ├── SYSTEM-ARCHITECTURE.md
    └── DOCKER-COMPOSE-GUIDE.md
```

### 6.2 Environment Variables Удирдах

**.env файл үүсгэх:**

```bash
# .env (root folder)

# Database Credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=123456

# Redis
REDIS_PASSWORD=

# RabbitMQ
RABBITMQ_USER=rabbitmq
RABBITMQ_PASS=rabbitmq123

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Gateway -> Service internal signature
INTERNAL_API_SECRET=change-me-in-production

# SMTP (Notification Service)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**docker-compose.yml-д ашиглах:**

```yaml
postgres:
  environment:
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

user-service:
  environment:
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/eventmn?schema=user
    JWT_SECRET: ${JWT_SECRET}
    INTERNAL_API_SECRET: ${INTERNAL_API_SECRET}
```

### 6.3 Health Checks Нэмэх

```yaml
postgres:
  image: postgres:15-alpine
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres -d eventmn"]
    interval: 10s
    timeout: 5s
    retries: 5

redis:
  image: redis:7-alpine
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5

rabbitmq:
  image: rabbitmq:3-management-alpine
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5

user-service:
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
```

### 6.4 Resource Limits Тохируулах

```yaml
user-service:
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 256M
```

---

## 7. Түгээмэл Асуудлууд ба Шийдэл

### 7.1 Port Already in Use

**Асуудал:**
```
Error: bind: address already in use
```

**Шийдэл:**
```bash
# Аль процесс порт ашиглаж байгааг олох
# Windows:
netstat -ano | findstr :5432

# Linux/Mac:
lsof -i :5432

# Процесс устгах (Windows)
taskkill /PID <PID> /F

# Эсвэл docker-compose.yml-д порт өөрчлөх
ports:
  - "5434:5432"   # 5432 биш 5434 ашиглах
```

### 7.2 Container Starts Before Database Ready

**Асуудал:**
```
Connection refused to postgres:5432
```

**Шийдэл 1: Health checks (дээр харуулсан)**

**Шийдэл 2: Wait script**
```dockerfile
# Dockerfile
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh
CMD ["/wait-for-it.sh", "postgres:5432", "--", "npm", "start"]
```

### 7.3 Volume Permission Issues

**Асуудал:**
```
Permission denied when writing to volume
```

**Шийдэл:**
```yaml
postgres:
  image: postgres:15-alpine
  user: "1000:1000"    # Match your user ID
  volumes:
    - postgres-data:/var/lib/postgresql/data
```

### 7.4 Out of Disk Space

**Асуудал:**
```
no space left on device
```

**Шийдэл:**
```bash
# Ашиглагдаагүй зүйлс устгах
docker system prune -a

# Зөвхөн volumes устгах
docker volume prune

# Хуучин images устгах
docker image prune -a
```

### 7.5 Container Can't Connect to Other Container

**Асуудал:**
```
getaddrinfo ENOTFOUND postgres
```

**Шийдэл:**
1. Ижил network-д байгаа эсэхийг шалгах
2. Container name зөв бичсэн эсэхийг шалгах
3. Target container ажиллаж байгаа эсэхийг шалгах

```bash
# Network шалгах
docker network inspect eventmn-network

# Container-ууд харагдах эсэх
docker-compose exec user-service ping postgres
```

---

## 8. Production vs Development

### 8.1 Development (docker-compose.yml)

```yaml
# Development-д:
services:
  user-service:
    build:
      context: ./services/user-service
    volumes:
      - ./services/user-service:/app          # Hot reload
      - /app/node_modules                     # Exclude node_modules
    environment:
      NODE_ENV: development
    command: npm run dev                       # Dev server
```

### 8.2 Production (docker-compose.prod.yml)

```yaml
# Production-д:
services:
  user-service:
    image: eventmn/user-service:latest        # Pre-built image
    # volumes: Байхгүй (hot reload хэрэггүй)
    environment:
      NODE_ENV: production
    deploy:
      replicas: 2                              # Scaling
      resources:
        limits:
          cpus: '1'
          memory: 1G
    restart: always                            # Auto restart
```

### 8.3 Production Ажиллуулах

```bash
# Production файлтай хамт ажиллуулах
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Эсвэл COMPOSE_FILE environment variable
export COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
docker-compose up -d
```

---

## Хураангуй

### Гол Командууд

| Команд | Тайлбар |
|--------|---------|
| `docker-compose up -d` | Бүгдийг эхлүүлэх |
| `docker-compose down` | Бүгдийг зогсоох |
| `docker-compose ps` | Статус харах |
| `docker-compose logs -f <service>` | Log харах |
| `docker-compose exec <service> <cmd>` | Команд ажиллуулах |
| `docker-compose up -d --build` | Дахин build хийх |

### Чухал Зүйлс

1. **Container хооронд** `localhost` биш **container_name** ашиглах
2. **Volumes** ашиглан өгөгдлийг хадгалах
3. **depends_on** ашиглан эхлэх дараалал тохируулах
4. **Health checks** нэмж найдвартай байдлыг хангах
5. **.env файл** ашиглан credentials удирдах

---

> **Баримт бичгийг шинэчилсэн**: 2024
> **Docker Compose хувилбар**: V2
