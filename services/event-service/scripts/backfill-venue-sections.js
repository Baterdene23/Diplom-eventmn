#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function buildSections(venue) {
  const vt = String(venue.venueType || 'OTHER');
  const cap = Number.isFinite(venue.capacity) && venue.capacity > 0 ? venue.capacity : 300;

  if (vt === 'WRESTLING_HALL') {
    return [
      { id: 'vip', name: 'VIP', rows: 4, seatsPerRow: 12, price: 120000, color: '#f59e0b' },
      { id: 'ring-a', name: 'Ring A', rows: 10, seatsPerRow: 20, price: 70000, color: '#ef4444' },
      { id: 'ring-b', name: 'Ring B', rows: 12, seatsPerRow: 24, price: 45000, color: '#3b82f6' },
    ];
  }

  if (vt === 'SPORTS_HALL' || vt === 'ARENA' || vt === 'STADIUM') {
    return [
      { id: 'premium', name: 'Premium', rows: 6, seatsPerRow: 18, price: 95000, color: '#f59e0b' },
      { id: 'standard-a', name: 'Standard A', rows: 14, seatsPerRow: 26, price: 55000, color: '#10b981' },
      { id: 'standard-b', name: 'Standard B', rows: 14, seatsPerRow: 26, price: 35000, color: '#3b82f6' },
    ];
  }

  if (vt === 'CONFERENCE_ROOM') {
    return [
      { id: 'front', name: 'Front', rows: 8, seatsPerRow: 14, price: 120000, color: '#8b5cf6' },
      { id: 'main', name: 'Main', rows: 10, seatsPerRow: 18, price: 80000, color: '#3b82f6' },
      { id: 'rear', name: 'Rear', rows: 8, seatsPerRow: 18, price: 50000, color: '#64748b' },
    ];
  }

  if (vt === 'EXHIBITION_HALL') {
    return [
      { id: 'hall-a', name: 'Hall A', rows: 10, seatsPerRow: 20, price: 40000, color: '#14b8a6' },
      { id: 'hall-b', name: 'Hall B', rows: 10, seatsPerRow: 20, price: 30000, color: '#0ea5e9' },
    ];
  }

  if (cap >= 1000) {
    return [
      { id: 'vip', name: 'VIP', rows: 6, seatsPerRow: 20, price: 150000, color: '#f59e0b' },
      { id: 'standard', name: 'Standard', rows: 18, seatsPerRow: 28, price: 85000, color: '#3b82f6' },
      { id: 'balcony', name: 'Balcony', rows: 12, seatsPerRow: 24, price: 60000, color: '#10b981' },
    ];
  }

  return [
    { id: 'main', name: 'Main', rows: 10, seatsPerRow: 18, price: 70000, color: '#3b82f6' },
    { id: 'side', name: 'Side', rows: 8, seatsPerRow: 14, price: 45000, color: '#10b981' },
  ];
}

async function run() {
  const venues = await prisma.venue.findMany({
    select: { id: true, name: true, venueType: true, capacity: true, sections: true, isActive: true },
  });

  let patched = 0;
  let skipped = 0;

  for (const venue of venues) {
    const sections = Array.isArray(venue.sections) ? venue.sections : [];
    if (sections.length > 0) {
      skipped++;
      continue;
    }

    const defaults = buildSections(venue);
    await prisma.venue.update({
      where: { id: venue.id },
      data: { sections: defaults },
    });

    patched++;
    console.log(`patched: ${venue.name}`);
  }

  console.log(`done. patched=${patched} skipped=${skipped} total=${venues.length}`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
