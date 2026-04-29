'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { SeatElement } from '@/lib/seat-layout';

type SeatPick = {
  seatId: string;
  sectionId: string;
  sectionName: string;
  row?: number;
  seatNumber?: number;
  price: number;
};

type Props = {
  layoutType: 'GRID' | 'CIRCULAR' | 'STADIUM' | 'FREE_FORM' | 'TABLE';
  layoutJson: any;
  lockedBySeatId: Record<string, string>;
  bookedSeatIds: string[];
  selected: SeatPick[];
  onToggleSeat: (seat: SeatPick) => void;
};

function seatIsSelected(selected: SeatPick[], seatId: string): boolean {
  return selected.some((s) => s.seatId === seatId);
}

function seatStatus(args: {
  seatId: string;
  selected: SeatPick[];
  lockedBySeatId: Record<string, string>;
  booked: Set<string>;
}): 'available' | 'selected' | 'locked' | 'booked' {
  if (args.booked.has(args.seatId)) return 'booked';
  if (args.lockedBySeatId[args.seatId]) return 'locked';
  if (seatIsSelected(args.selected, args.seatId)) return 'selected';
  return 'available';
}

export function DynamicSeatMap({
  layoutType,
  layoutJson,
  lockedBySeatId,
  bookedSeatIds,
  selected,
  onToggleSeat,
}: Props) {
  const [zoom, setZoom] = useState(1);

  const seats: SeatElement[] = useMemo(() => {
    const els = Array.isArray(layoutJson?.elements) ? layoutJson.elements : [];
    return els.filter((e: any) => e?.kind === 'seat');
  }, [layoutJson]);

  const zones = useMemo(() => {
    const map = new Map<string, any>();
    const zs = Array.isArray(layoutJson?.zones) ? layoutJson.zones : [];
    for (const z of zs) {
      if (z?.id) map.set(z.id, z);
    }
    return map;
  }, [layoutJson]);

  const booked = useMemo(() => new Set(bookedSeatIds), [bookedSeatIds]);

  const canvasW = typeof layoutJson?.canvas?.width === 'number' ? layoutJson.canvas.width : 1200;
  const canvasH = typeof layoutJson?.canvas?.height === 'number' ? layoutJson.canvas.height : 800;

  // Minimal renderer: use SVG for all layout types (real geometry comes from layoutJson)
  // This keeps the system extensible without breaking the existing grid implementation.
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Layout: <span className="font-semibold text-gray-900">{layoutType}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
            onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
          >
            -
          </button>
          <div className="text-sm tabular-nums w-12 text-center">{Math.round(zoom * 100)}%</div>
          <button
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
            onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.1) * 10) / 10))}
          >
            +
          </button>
        </div>
      </div>

      <div className="w-full overflow-auto bg-gray-50 rounded-2xl border border-gray-200">
        <div
          className="p-4"
          style={{
            minWidth: Math.round(canvasW * zoom),
            minHeight: Math.round(canvasH * zoom),
          }}
        >
          <svg
            width={Math.round(canvasW * zoom)}
            height={Math.round(canvasH * zoom)}
            viewBox={`0 0 ${canvasW} ${canvasH}`}
          >
            {/* background shapes */}
            {Array.isArray(layoutJson?.elements)
              ? layoutJson.elements
                  .filter((e: any) => e?.kind === 'shape')
                  .map((e: any) => {
                    const s = e.shape;
                    if (!s || !s.type) return null;
                    if (s.type === 'rect') {
                      return <rect key={e.id} x={s.x} y={s.y} width={s.w} height={s.h} fill={e?.style?.fill || '#e5e7eb'} />;
                    }
                    if (s.type === 'circle') {
                      return <circle key={e.id} cx={s.cx} cy={s.cy} r={s.r} fill={e?.style?.fill || '#e5e7eb'} />;
                    }
                    if (s.type === 'polygon') {
                      const points = Array.isArray(s.points) ? s.points.map((p: any) => `${p[0]},${p[1]}`).join(' ') : '';
                      return <polygon key={e.id} points={points} fill={e?.style?.fill || '#e5e7eb'} />;
                    }
                    return null;
                  })
              : null}

            {/* seats */}
            {seats.map((el) => {
              const seatId = el.seat.seatId;
              const zone = zones.get(el.seat.zoneId);
              const price = typeof el.seat.priceOverride === 'number' ? el.seat.priceOverride : typeof zone?.price === 'number' ? zone.price : 0;

              const status = seatStatus({
                seatId,
                selected,
                lockedBySeatId,
                booked,
              });

              const fill =
                status === 'booked'
                  ? '#9ca3af'
                  : status === 'locked'
                    ? '#fbbf24'
                    : status === 'selected'
                      ? '#22c55e'
                      : (zone?.color || '#60a5fa');

              const stroke = status === 'selected' ? '#14532d' : '#111827';
              const opacity = status === 'booked' ? 0.7 : 1;
              const disabled = status === 'booked' || status === 'locked';

              const pick: SeatPick = {
                seatId,
                sectionId: el.seat.sectionId,
                sectionName: el.seat.sectionName,
                row: el.seat.row,
                seatNumber: el.seat.seatNumber,
                price,
              };

              const g = el.geom;
              const title = `${el.seat.sectionName} ${seatId}${typeof el.seat.row === 'number' ? ` • Row ${el.seat.row}` : ''}${typeof el.seat.seatNumber === 'number' ? ` • #${el.seat.seatNumber}` : ''} • ${price.toLocaleString()}₮`;

              if (g.shape === 'rect') {
                const x = g.x || 0;
                const y = g.y || 0;
                const w = g.w || 12;
                const h = g.h || 12;
                return (
                  <rect
                    key={el.id}
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={3}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1}
                    opacity={opacity}
                    style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                    onClick={() => (!disabled ? onToggleSeat(pick) : null)}
                  >
                    <title>{title}</title>
                  </rect>
                );
              }

              const cx = g.cx || 0;
              const cy = g.cy || 0;
              const r = g.r || 6;
              return (
                <circle
                  key={el.id}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1}
                  opacity={opacity}
                  style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                  onClick={() => (!disabled ? onToggleSeat(pick) : null)}
                >
                  <title>{title}</title>
                </circle>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-2">
          <div className={cn('w-5 h-5 rounded', 'bg-blue-400')} />
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('w-5 h-5 rounded', 'bg-green-500')} />
          <span className="text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('w-5 h-5 rounded', 'bg-amber-400')} />
          <span className="text-gray-600">Locked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('w-5 h-5 rounded', 'bg-gray-400')} />
          <span className="text-gray-600">Booked</span>
        </div>
      </div>
    </div>
  );
}
