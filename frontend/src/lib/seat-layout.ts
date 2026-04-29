export type LayoutType = 'GRID' | 'CIRCULAR' | 'STADIUM' | 'FREE_FORM' | 'TABLE';

export type SeatLayoutV1 = {
  schemaVersion: 1;
  layoutType: LayoutType;
  name?: string;
  canvas?: { width: number; height: number; unit?: string };
  zones: Array<{ id: string; name: string; price: number; color?: string }>;
  elements: Array<any>;
};

export type SeatElement = {
  id: string;
  kind: 'seat';
  seat: {
    seatId: string;
    zoneId: string;
    sectionId: string;
    sectionName: string;
    row?: number;
    seatNumber?: number;
    baseStatus?: 'available' | 'locked' | 'booked';
    priceOverride?: number;
  };
  geom: {
    shape: 'circle' | 'rect';
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    cx?: number;
    cy?: number;
    r?: number;
    rotation?: number;
  };
  meta?: Record<string, any>;
};

export type StandingAreaElement = {
  id: string;
  kind: 'standingArea';
  area: { areaId: string; zoneId: string; sectionId: string; sectionName: string; capacity: number };
  geom:
    | { type: 'rect'; x: number; y: number; w: number; h: number }
    | { type: 'circle'; cx: number; cy: number; r: number }
    | { type: 'polygon'; points: Array<[number, number]> };
  meta?: Record<string, any>;
};

export type TableElement = {
  id: string;
  kind: 'table';
  table: { tableId: string; zoneId: string; sectionId: string; sectionName: string; capacity: number };
  geom:
    | { type: 'rect'; x: number; y: number; w: number; h: number }
    | { type: 'circle'; cx: number; cy: number; r: number }
    | { type: 'polygon'; points: Array<[number, number]> };
  meta?: Record<string, any>;
};

export function extractSeats(layoutJson: any): SeatElement[] {
  if (!layoutJson || !Array.isArray(layoutJson.elements)) return [];
  return layoutJson.elements.filter((e: any) => e?.kind === 'seat');
}

export function zoneById(layoutJson: any): Map<string, { id: string; name: string; price: number; color?: string }> {
  const map = new Map<string, any>();
  const zones = Array.isArray(layoutJson?.zones) ? layoutJson.zones : [];
  for (const z of zones) {
    if (z?.id) map.set(z.id, z);
  }
  return map;
}
