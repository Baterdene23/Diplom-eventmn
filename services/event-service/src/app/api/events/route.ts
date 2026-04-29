import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EventStatus, type Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireGatewaySignature } from '@/lib/internal-auth';
import { LayoutTypeEnum, validateEventCategoryLayoutType, validateSeatLayoutJson } from '@/lib/layout';

export const dynamic = 'force-dynamic';

type EventCategory = 'CONCERT' | 'CONFERENCE' | 'WORKSHOP' | 'MEETUP' | 'SPORTS' | 'WRESTLING' | 'EXHIBITION' | 'OTHER';

const INTEREST_TAG_TO_CATEGORY: Record<string, EventCategory> = {
  'Концерт': 'CONCERT',
  'Хурал & Семинар': 'CONFERENCE',
  'Сургалт': 'WORKSHOP',
  'Уулзалт': 'MEETUP',
  'Спорт': 'SPORTS',
  'Бөхийн барилдаан': 'WRESTLING',
  'Үзэсгэлэн': 'EXHIBITION',
};

const CATEGORY_TO_INTEREST_TAG: Record<EventCategory, string> = {
  CONCERT: 'Концерт',
  CONFERENCE: 'Хурал & Семинар',
  WORKSHOP: 'Сургалт',
  MEETUP: 'Уулзалт',
  SPORTS: 'Спорт',
  WRESTLING: 'Бөхийн барилдаан',
  EXHIBITION: 'Үзэсгэлэн',
  OTHER: 'Бусад',
};

function uniqStrings(input: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const v = String(raw || '').trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function mapTagToCategory(tag: string): EventCategory | null {
  const cleaned = String(tag || '').trim();
  if (!cleaned) return null;
  const upper = cleaned.toUpperCase();
  if (
    upper === 'CONCERT' ||
    upper === 'CONFERENCE' ||
    upper === 'WORKSHOP' ||
    upper === 'MEETUP' ||
    upper === 'SPORTS' ||
    upper === 'WRESTLING' ||
    upper === 'EXHIBITION' ||
    upper === 'OTHER'
  ) {
    return upper as EventCategory;
  }
  return INTEREST_TAG_TO_CATEGORY[cleaned] || null;
}

// Event үүсгэх validation
const createEventSchema = z.object({
  title: z.string().min(1, 'Гарчиг оруулна уу'),
  description: z.string().min(1, 'Тайлбар оруулна уу'),
  category: z.enum(['CONCERT', 'CONFERENCE', 'WORKSHOP', 'MEETUP', 'SPORTS', 'WRESTLING', 'EXHIBITION', 'OTHER']),
  venueId: z.string().min(1, 'Байршил сонгоно уу').optional(),
  venueName: z.string().min(1).optional(),
  layoutType: LayoutTypeEnum.optional(),
  layoutJson: z.custom<Prisma.InputJsonValue>().optional(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  images: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isOnline: z.boolean().optional(),
  meetingUrl: z.string().url().optional(),
  meetingPlatform: z.string().optional(),
  ticketInfo: z.array(z.object({
    sectionId: z.string(),
    sectionName: z.string(),
    rows: z.number().int().min(1).optional(),
    seatsPerRow: z.number().int().min(1).optional(),
    price: z.number().min(0, 'Үнэ 0-ээс бага байж болохгүй'),
    available: z.number().int().min(0, 'Available 0-ээс бага байж болохгүй'),
    total: z.number().int().min(0, 'Total 0-ээс бага байж болохгүй'),
    color: z.string().optional(),
  })).optional(),
}).superRefine((data, ctx) => {
  if (data.endDate.getTime() <= data.startDate.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Дуусах огноо эхлэх огнооноос хойш байх ёстой',
      path: ['endDate'],
    });
  }

  if (data.ticketInfo) {
    data.ticketInfo.forEach((t, idx) => {
      if (t.available > t.total) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Available нь total-оос их байж болохгүй',
          path: ['ticketInfo', idx, 'available'],
        });
      }
    });
  }

  if (data.layoutJson) {
    const res = validateSeatLayoutJson(data.layoutJson);
    if (!res.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'layoutJson буруу байна',
        path: ['layoutJson'],
      });
    }
  }

  const lt = data.layoutType;
  if (lt) {
    const ok = validateEventCategoryLayoutType(data.category, lt);
    if (!ok.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: ok.message,
        path: ['layoutType'],
      });
    }
  }
});

// GET /api/events - Бүх event жагсаалт
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get('mine') === 'true';
    if (mine) {
      requireGatewaySignature(request, '/api/events');
    }

    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'PUBLISHED';
    const search = searchParams.get('search');
    const organizerId = searchParams.get('organizerId');
    const city = searchParams.get('city');
    const upcoming = searchParams.get('upcoming') === 'true';
    const tagsParam = searchParams.get('tags');
    const recommend = searchParams.get('recommend') === 'true';
    const dateRange = searchParams.get('dateRange');
    const hasTickets = searchParams.get('hasTickets');

    const where: Record<string, any> = {};

    if (mine) {
      if (!userId) {
        return NextResponse.json(
          { error: 'Нэвтрэх шаардлагатай' },
          { status: 401 }
        );
      }

      if (userRole !== 'ORGANIZER' && userRole !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Эрх хүрэхгүй байна' },
          { status: 403 }
        );
      }

      where.organizerId = userId;
    }

    if (organizerId) {
      where.organizerId = organizerId;
    }

    if (status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { organizerName: { contains: search, mode: 'insensitive' } },
        { venueName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rawTags = tagsParam
      ? tagsParam
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const tags = rawTags.length > 0 ? uniqStrings(rawTags) : [];

    if (recommend && tags.length > 0 && !category) {
      const mapped = uniqStrings(
        tags
          .map(mapTagToCategory)
          .filter((c): c is EventCategory => Boolean(c))
      ) as EventCategory[];

      // If interest tags are sent, prefer category-based matching.
      // This allows using Mongolian UI tags while still matching events.
      if (mapped.length > 0) {
        where.category = { in: mapped };
      } else {
        where.tags = { hasSome: tags };
      }
    } else if (tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    if (dateRange) {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);

      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      if (dateRange === 'today') {
        where.startDate = { gte: start, lte: end };
      } else if (dateRange === 'week') {
        end.setDate(end.getDate() + 7);
        where.startDate = { gte: start, lte: end };
      } else if (dateRange === 'month') {
        end.setMonth(end.getMonth() + 1);
        where.startDate = { gte: start, lte: end };
      }
    }

    if (hasTickets === 'true') {
      where.ticketInfo = { not: { equals: [] } };
    }

    if (hasTickets === 'false') {
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { ticketInfo: { equals: [] } },
        { ticketInfo: { equals: null } },
      ];
    }

    if (upcoming && !where.startDate) {
      where.startDate = { gte: new Date() };
    }

    const skip = (page - 1) * limit;

    const cityFilter = city && city !== 'ALL' ? city.trim() : null;
    if (cityFilter) {
      const upper = cityFilter.toUpperCase();
      if (upper === 'ONLINE') {
        where.isOnline = true;
      } else {
        const venuesInCity = await prisma.venue.findMany({
          where: { city: { equals: cityFilter, mode: 'insensitive' } },
          select: { id: true },
        });

        const venueIds = venuesInCity.map((v) => v.id);
        if (venueIds.length === 0) {
          return NextResponse.json({
            events: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          });
        }

        where.venueId = { in: venueIds };
      }
    }

    const orderBy: Prisma.EventOrderByWithRelationInput | Prisma.EventOrderByWithRelationInput[] =
      recommend
        ? [
            { startDate: 'asc' },
            { createdAt: 'desc' },
          ]
        : { startDate: 'asc' };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    const venueIds = Array.from(
      new Set(events.map((e) => e.venueId).filter((id): id is string => Boolean(id)))
    );

    const venues = venueIds.length
      ? await prisma.venue.findMany({
          where: { id: { in: venueIds } },
          select: { id: true, city: true, address: true, name: true },
        })
      : [];

    const venueById = new Map(venues.map((v) => [v.id, v] as const));

    const eventsWithVenueFields = events.map((e) => {
      const venue = e.venueId ? venueById.get(e.venueId) : undefined;
      return {
        ...e,
        ...(venue?.city ? { city: venue.city } : null),
        ...(venue?.address ? { address: venue.address } : null),
        ...(!e.venueName && venue?.name ? { venueName: venue.name } : null),
        ...(recommend ? { matchedInterest: CATEGORY_TO_INTEREST_TAG[e.category as EventCategory] || null } : null),
      };
    });

    return NextResponse.json({
      events: eventsWithVenueFields,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get events error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Events авах амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}

// POST /api/events - Event үүсгэх
export async function POST(request: NextRequest) {
  try {
    requireGatewaySignature(request, '/api/events');
    // Auth шалгах (header-аас user info авах - Gateway-аас дамжуулна)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userName = request.headers.get('x-user-name');

    if (!userId) {
      return NextResponse.json(
        { error: 'Нэвтрэх шаардлагатай' },
        { status: 401 }
      );
    }

    if (userRole !== 'ORGANIZER' && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Зөвхөн зохион байгуулагч event үүсгэх боломжтой' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    const validationResult = createEventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const eventData: Prisma.EventCreateInput = {
      ...validationResult.data,
      images: validationResult.data.images ?? [],
      tags: validationResult.data.tags ?? [],
      ticketInfo: validationResult.data.ticketInfo ?? [],
      organizerId: userId,
      organizerName: userName || 'Unknown',
      status: userRole === 'ADMIN' ? EventStatus.PUBLISHED : EventStatus.PENDING,
    };

    // If venue is selected and layoutType/layoutJson not supplied, inherit from venue.
    if (eventData.venueId && (!eventData.layoutType || !eventData.layoutJson)) {
      const venue = await prisma.venue.findUnique({
        where: { id: eventData.venueId },
        select: { layoutType: true, layoutJson: true },
      });

      if (venue?.layoutType && !eventData.layoutType) {
        (eventData as any).layoutType = venue.layoutType;
      }
      if (venue?.layoutJson && !eventData.layoutJson) {
        (eventData as any).layoutJson = venue.layoutJson;
      }
    }

    // Enforce category-layout compatibility.
    const lt = (eventData as any).layoutType as any;
    if (lt) {
      const ok = validateEventCategoryLayoutType((eventData as any).category, lt);
      if (!ok.ok) {
        return NextResponse.json({ error: ok.message }, { status: 400 });
      }
    }

    const event = await prisma.event.create({ data: eventData });

    return NextResponse.json(
      { message: 'Event амжилттай үүсгэгдлээ', event },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create event error:', error);
    const status = (error as any)?.status;
    if (typeof status === 'number') {
      return NextResponse.json({ error: (error as any)?.message || 'Unauthorized' }, { status });
    }
    return NextResponse.json(
      { error: 'Event үүсгэх амжилтгүй боллоо' },
      { status: 500 }
    );
  }
}
