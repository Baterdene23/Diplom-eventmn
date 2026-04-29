import { z } from 'zod';

export const LayoutTypeEnum = z.enum(['GRID', 'CIRCULAR', 'STADIUM', 'FREE_FORM', 'TABLE']);
export type LayoutType = z.infer<typeof LayoutTypeEnum>;

const SeatStatusEnum = z.enum(['available', 'locked', 'booked']);

const PointSchema = z.tuple([z.number(), z.number()]);

const ShapeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rect'), x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() }),
  z.object({ type: z.literal('circle'), cx: z.number(), cy: z.number(), r: z.number().positive() }),
  z.object({ type: z.literal('polygon'), points: z.array(PointSchema).min(3) }),
]);

const ZoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().min(0),
  color: z.string().optional(),
});

const SeatElementSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('seat'),
  seat: z.object({
    seatId: z.string().min(1),
    zoneId: z.string().min(1),
    sectionId: z.string().min(1),
    sectionName: z.string().min(1),
    row: z.number().int().min(1).optional(),
    seatNumber: z.number().int().min(1).optional(),
    baseStatus: SeatStatusEnum.optional(),
    priceOverride: z.number().min(0).optional(),
  }),
  geom: z.object({
    shape: z.enum(['circle', 'rect']),
    x: z.number().optional(),
    y: z.number().optional(),
    w: z.number().optional(),
    h: z.number().optional(),
    cx: z.number().optional(),
    cy: z.number().optional(),
    r: z.number().optional(),
    rotation: z.number().optional(),
  }),
  meta: z.record(z.any()).optional(),
});

const StandingAreaSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('standingArea'),
  area: z.object({
    areaId: z.string().min(1),
    zoneId: z.string().min(1),
    sectionId: z.string().min(1),
    sectionName: z.string().min(1),
    capacity: z.number().int().min(1),
  }),
  geom: ShapeSchema,
  meta: z.record(z.any()).optional(),
});

const TableSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('table'),
  table: z.object({
    tableId: z.string().min(1),
    zoneId: z.string().min(1),
    sectionId: z.string().min(1),
    sectionName: z.string().min(1),
    capacity: z.number().int().min(1),
  }),
  geom: ShapeSchema,
  meta: z.record(z.any()).optional(),
});

const ShapeElementSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('shape'),
  shape: ShapeSchema,
  label: z.object({ text: z.string() }).optional(),
  style: z.record(z.any()).optional(),
});

export const SeatLayoutSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  layoutType: LayoutTypeEnum,
  name: z.string().min(1).optional(),
  canvas: z.object({ width: z.number().positive(), height: z.number().positive(), unit: z.string().optional() }).optional(),
  zones: z.array(ZoneSchema).min(1),
  elements: z.array(z.union([SeatElementSchema, StandingAreaSchema, TableSchema, ShapeElementSchema])).min(1),
});

export type SeatLayoutV1 = z.infer<typeof SeatLayoutSchemaV1>;

export function validateSeatLayoutJson(input: unknown): { ok: true; layout: SeatLayoutV1 } | { ok: false; error: any } {
  const parsed = SeatLayoutSchemaV1.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error };

  const layout = parsed.data;

  const zoneIds = new Set(layout.zones.map((z) => z.id));
  const seatIds = new Set<string>();
  const elementIds = new Set<string>();

  for (const el of layout.elements) {
    if (elementIds.has(el.id)) {
      return { ok: false, error: { message: `Duplicate element id: ${el.id}` } };
    }
    elementIds.add(el.id);

    if (el.kind === 'seat') {
      if (!zoneIds.has(el.seat.zoneId)) {
        return { ok: false, error: { message: `Seat ${el.seat.seatId} references unknown zoneId=${el.seat.zoneId}` } };
      }
      if (seatIds.has(el.seat.seatId)) {
        return { ok: false, error: { message: `Duplicate seatId: ${el.seat.seatId}` } };
      }
      seatIds.add(el.seat.seatId);

      const g = el.geom;
      if (g.shape === 'circle') {
        if (typeof g.cx !== 'number' || typeof g.cy !== 'number' || typeof g.r !== 'number') {
          return { ok: false, error: { message: `Seat ${el.seat.seatId} missing circle geom (cx,cy,r)` } };
        }
      }
      if (g.shape === 'rect') {
        if (typeof g.x !== 'number' || typeof g.y !== 'number' || typeof g.w !== 'number' || typeof g.h !== 'number') {
          return { ok: false, error: { message: `Seat ${el.seat.seatId} missing rect geom (x,y,w,h)` } };
        }
      }
    }

    if (el.kind === 'standingArea') {
      if (!zoneIds.has(el.area.zoneId)) {
        return { ok: false, error: { message: `StandingArea ${el.area.areaId} references unknown zoneId=${el.area.zoneId}` } };
      }
    }

    if (el.kind === 'table') {
      if (!zoneIds.has(el.table.zoneId)) {
        return { ok: false, error: { message: `Table ${el.table.tableId} references unknown zoneId=${el.table.zoneId}` } };
      }
    }
  }

  return { ok: true, layout };
}

export function validateEventCategoryLayoutType(category: string, layoutType: LayoutType): { ok: true } | { ok: false; message: string } {
  const c = String(category || '').toUpperCase();
  switch (c) {
    case 'SPORTS':
      if (layoutType !== 'STADIUM') return { ok: false, message: 'SPORTS эвентэд STADIUM layout шаардлагатай' };
      return { ok: true };
    case 'WRESTLING':
      if (layoutType !== 'CIRCULAR') return { ok: false, message: 'WRESTLING эвентэд CIRCULAR layout шаардлагатай' };
      return { ok: true };
    case 'CONCERT':
      if (layoutType !== 'FREE_FORM') return { ok: false, message: 'CONCERT эвентэд FREE_FORM layout шаардлагатай' };
      return { ok: true };
    case 'CONFERENCE':
    case 'WORKSHOP':
    case 'MEETUP':
    case 'EXHIBITION':
      if (layoutType !== 'GRID') return { ok: false, message: `${c} эвентэд GRID layout шаардлагатай` };
      return { ok: true };
    default:
      return { ok: true };
  }
}
