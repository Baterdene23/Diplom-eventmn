#!/usr/bin/env node
/*
 * Ticket.mn import helper (JSON -> Event Service Postgres)
 *
 * Input file: services/event-service/scripts/ticketmn-events.json
 * Schema: an array of events or an object { events: [...] }
 * Each event may include:
 *   - title (string)
 *   - description (string)
 *   - category (CONCERT|CONFERENCE|WORKSHOP|MEETUP|SPORTS|EXHIBITION|OTHER)
 *   - startDate, endDate (ISO string)
 *   - images (string[]), thumbnail (string)
 *   - tags (string[])
 *   - venueName (string), address (string), city (string)
 *   - capacity (number)
 *   - sections or ticketInfo (optional)
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const INPUT = path.join(__dirname, 'ticketmn-events.json');
const DEFAULT_ORGANIZER_ID = process.env.IMPORT_ORGANIZER_ID || '550e8400-e29b-41d4-a716-446655440003';
const DEFAULT_ORGANIZER_NAME = process.env.IMPORT_ORGANIZER_NAME || 'Imported Organizer';
const DEFAULT_CREATED_BY = process.env.IMPORT_CREATED_BY || '550e8400-e29b-41d4-a716-446655440001';

const CATEGORY_MAP = {
  concert: 'CONCERT',
  conference: 'CONFERENCE',
  workshop: 'WORKSHOP',
  meetup: 'MEETUP',
  sports: 'SPORTS',
  exhibition: 'EXHIBITION',
  other: 'OTHER',
  theatre: 'OTHER',
  theater: 'OTHER'
};

function toCategory(input) {
  if (!input) return 'OTHER';
  const raw = String(input).trim();
  const upper = raw.toUpperCase();
  const allowed = ['CONCERT', 'CONFERENCE', 'WORKSHOP', 'MEETUP', 'SPORTS', 'EXHIBITION', 'OTHER'];
  if (allowed.includes(upper)) return upper;
  const mapped = CATEGORY_MAP[String(raw).toLowerCase()];
  return mapped || 'OTHER';
}

function safeArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean).map(String) : [String(v)];
}

function pickDate(v, fallbackMs) {
  const d = v ? new Date(v) : new Date(Date.now() + fallbackMs);
  if (Number.isNaN(d.getTime())) return new Date(Date.now() + fallbackMs);
  return d;
}

async function upsertVenue({ venueName, address, city, capacity, description, images, sections }) {
  const name = (venueName || 'Unknown Venue').trim();
  const where = { name_city: { name, city: (city || 'Улаанбаатар').trim() } };

  // Ensure unique by (name, city) via a separate query since schema has no composite unique.
  const existing = await prisma.venue.findFirst({
    where: { name: where.name_city.name, city: where.name_city.city }
  });

  if (existing) {
    return existing;
  }

  return prisma.venue.create({
    data: {
      name,
      address: (address || 'N/A').trim(),
      city: where.name_city.city,
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 0,
      description: description ? String(description) : null,
      images: safeArray(images),
      sections: sections || [],
      createdBy: DEFAULT_CREATED_BY,
      isActive: true
    }
  });
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`Input file not found: ${INPUT}`);
    console.error('Create it, then rerun: npm run db:import:ticketmn');
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT, 'utf8');
  const json = JSON.parse(raw);
  const list = Array.isArray(json) ? json : Array.isArray(json.events) ? json.events : [];

  if (!list.length) {
    console.error('No events found in input JSON');
    process.exit(1);
  }

  let imported = 0;
  let skipped = 0;

  for (const item of list) {
    const title = String(item.title || '').trim();
    if (!title) {
      skipped++;
      continue;
    }

    const startDate = pickDate(item.startDate, 7 * 24 * 60 * 60 * 1000);
    const endDate = pickDate(item.endDate, 8 * 24 * 60 * 60 * 1000);
    const venueName = (item.venueName || item.venue || item.location || 'Unknown Venue').toString();
    const city = (item.city || 'Улаанбаатар').toString();
    const address = (item.address || item.venueAddress || 'N/A').toString();

    const venue = await upsertVenue({
      venueName,
      city,
      address,
      capacity: typeof item.capacity === 'number' ? item.capacity : 0,
      description: item.venueDescription,
      images: item.venueImages,
      sections: item.sections
    });

    // Basic dedupe: title + startDate + venueId
    const exists = await prisma.event.findFirst({
      where: {
        title,
        startDate,
        venueId: venue.id
      }
    });

    if (exists) {
      skipped++;
      continue;
    }

    await prisma.event.create({
      data: {
        title,
        description: String(item.description || ''),
        category: toCategory(item.category),
        venueId: venue.id,
        venueName: venue.name,
        startDate,
        endDate,
        images: safeArray(item.images),
        thumbnail: item.thumbnail ? String(item.thumbnail) : null,
        organizerId: item.organizerId ? String(item.organizerId) : DEFAULT_ORGANIZER_ID,
        organizerName: item.organizerName ? String(item.organizerName) : DEFAULT_ORGANIZER_NAME,
        status: 'PUBLISHED',
        isFeatured: Boolean(item.isFeatured),
        tags: safeArray(item.tags),
        ticketInfo: Array.isArray(item.ticketInfo) ? item.ticketInfo : []
      }
    });

    imported++;
  }

  console.log(`Imported events: ${imported}`);
  console.log(`Skipped events: ${skipped}`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
