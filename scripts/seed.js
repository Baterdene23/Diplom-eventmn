#!/usr/bin/env node
/**
 * Database Seed Script for EventMN Microservices
 * 
 * Usage:
 *   node scripts/seed.js [--drop]
 * 
 * Options:
 *   --drop    Drop existing data before seeding
 * 
 * Requirements:
 *   - All database services must be running
 *   - npm install bcryptjs pg mongodb
 */

const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const { MongoClient, ObjectId } = require('mongodb');
const { users, venues, events, bookings, notifications } = require('./mock-data');

// Configuration
const config = {
  userDb: {
    host: process.env.USER_DB_HOST || 'localhost',
    port: process.env.USER_DB_PORT || 5432,
    database: 'userdb',
    user: 'postgres',
    password: 'postgres123456'
  },
  bookingDb: {
    host: process.env.BOOKING_DB_HOST || 'localhost',
    port: process.env.BOOKING_DB_PORT || (process.env.BOOKING_DB_HOST ? 5432 : 5433),
    database: 'bookingdb',
    user: 'postgres',
    password: 'postgres123456'
  },
  eventDb: {
    uri: process.env.EVENT_MONGODB_URI || 'mongodb://mongo:mongo123@localhost:27017/eventdb?authSource=admin'
  },
  notificationDb: {
    uri: process.env.NOTIFICATION_MONGODB_URI || 'mongodb://mongo:mongo123@localhost:27018/notificationdb?authSource=admin'
  }
};

const shouldDrop = process.argv.includes('--drop');

// =====================================================
// SEED USER DATABASE (PostgreSQL)
// =====================================================
async function seedUserDatabase() {
  console.log('\n📦 Seeding User Database (PostgreSQL)...');
  
  const client = new Client(config.userDb);
  
  try {
    await client.connect();
    console.log('  ✓ Connected to User Database');
    
    if (shouldDrop) {
      console.log('  ⚠ Dropping existing data...');
      await client.query('TRUNCATE TABLE refresh_tokens CASCADE');
      await client.query('TRUNCATE TABLE user_otps CASCADE');
      await client.query('TRUNCATE TABLE users CASCADE');
    }
    
    // Insert users
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await client.query(`
        INSERT INTO users (id, email, password, first_name, last_name, phone, role, is_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = EXCLUDED.phone,
          role = EXCLUDED.role,
          is_verified = EXCLUDED.is_verified,
          updated_at = NOW()
      `, [
        user.id,
        user.email,
        hashedPassword,
        user.firstName,
        user.lastName,
        user.phone,
        user.role,
        user.isVerified
      ]);
    }
    
    console.log(`  ✓ Inserted ${users.length} users`);
    
  } catch (error) {
    console.error('  ✗ Error seeding User Database:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// =====================================================
// SEED EVENT DATABASE (MongoDB)
// =====================================================
async function seedEventDatabase() {
  console.log('\n📦 Seeding Event Database (MongoDB)...');
  
  const client = new MongoClient(config.eventDb.uri);
  
  try {
    await client.connect();
    console.log('  ✓ Connected to Event Database');
    
    const db = client.db('eventdb');
    
    if (shouldDrop) {
      console.log('  ⚠ Dropping existing data...');
      await db.collection('events').deleteMany({});
      await db.collection('venues').deleteMany({});
    }
    
    // Insert venues
    const venuesDocs = venues.map(v => ({
      ...v,
      _id: new ObjectId(v._id),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    await db.collection('venues').insertMany(venuesDocs, { ordered: false }).catch(() => {});
    console.log(`  ✓ Inserted ${venues.length} venues`);
    
    // Insert events
    const eventsDocs = events.map(e => ({
      ...e,
      _id: new ObjectId(e._id),
      venueId: new ObjectId(e.venueId),
      startDate: new Date(e.startDate),
      endDate: new Date(e.endDate),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    await db.collection('events').insertMany(eventsDocs, { ordered: false }).catch(() => {});
    console.log(`  ✓ Inserted ${events.length} events`);
    
    // Create indexes (matching Event.ts schema)
    await db.collection('events').createIndex({ 'organizer.id': 1 });
    await db.collection('events').createIndex({ status: 1, startDate: 1 });
    await db.collection('events').createIndex({ category: 1 });
    await db.collection('events').createIndex({ title: 'text', description: 'text' });
    console.log('  ✓ Created indexes');
    
  } catch (error) {
    console.error('  ✗ Error seeding Event Database:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

// =====================================================
// SEED BOOKING DATABASE (PostgreSQL)
// =====================================================
async function seedBookingDatabase() {
  console.log('\n📦 Seeding Booking Database (PostgreSQL)...');
  
  const client = new Client(config.bookingDb);
  
  try {
    await client.connect();
    console.log('  ✓ Connected to Booking Database');
    
    if (shouldDrop) {
      console.log('  ⚠ Dropping existing data...');
      await client.query('TRUNCATE TABLE booking_seats CASCADE');
      await client.query('TRUNCATE TABLE bookings CASCADE');
    }
    
    // Get user info from user database for bookings
    const userClient = new Client(config.userDb);
    await userClient.connect();
    
    // Insert bookings
    for (const booking of bookings) {
      // Get user info
      const userResult = await userClient.query(
        'SELECT email, first_name, last_name FROM users WHERE id = $1',
        [booking.userId]
      );
      
      const user = userResult.rows[0];
      if (!user) {
        console.log(`  ⚠ User not found for booking: ${booking.id}`);
        continue;
      }
      
      await client.query(`
        INSERT INTO bookings (
          id, user_id, user_email, user_name, event_id, event_title, event_date,
          venue_id, venue_name, total_amount, status, payment_id, payment_method,
          paid_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          total_amount = EXCLUDED.total_amount,
          updated_at = NOW()
      `, [
        booking.id,
        booking.userId,
        user.email,
        `${user.first_name} ${user.last_name}`,
        booking.eventId,
        booking.eventTitle,
        new Date(booking.eventDate),
        booking.venueId,
        booking.venueName,
        booking.totalAmount,
        booking.status,
        booking.status === 'CONFIRMED' ? `PAY-${booking.id.substring(0, 8)}` : null,
        booking.paymentMethod || null,
        booking.status === 'CONFIRMED' ? new Date() : null
      ]);
      
      // Insert booking seats
      for (const seat of booking.seats) {
        await client.query(`
          INSERT INTO booking_seats (id, booking_id, section_id, section_name, row, seat_number, price)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [
          booking.id,
          seat.sectionId,
          seat.sectionName,
          seat.row,
          seat.seatNumber,
          seat.price
        ]);
      }
    }
    
    await userClient.end();
    console.log(`  ✓ Inserted ${bookings.length} bookings with seats`);
    
  } catch (error) {
    console.error('  ✗ Error seeding Booking Database:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// =====================================================
// SEED NOTIFICATION DATABASE (MongoDB)
// =====================================================
async function seedNotificationDatabase() {
  console.log('\n📦 Seeding Notification Database (MongoDB)...');
  
  const client = new MongoClient(config.notificationDb.uri);
  
  try {
    await client.connect();
    console.log('  ✓ Connected to Notification Database');
    
    const db = client.db('notificationdb');
    
    if (shouldDrop) {
      console.log('  ⚠ Dropping existing data...');
      await db.collection('notifications').deleteMany({});
    }
    
    // Insert notifications
    const notificationsDocs = notifications.map(n => ({
      ...n,
      _id: new ObjectId(n._id),
      createdAt: new Date(),
      sentAt: n.status === 'SENT' ? new Date() : null,
      readAt: n.status === 'READ' ? new Date() : null
    }));
    
    await db.collection('notifications').insertMany(notificationsDocs, { ordered: false }).catch(() => {});
    console.log(`  ✓ Inserted ${notifications.length} notifications`);
    
    // Create indexes
    await db.collection('notifications').createIndex({ userId: 1 });
    await db.collection('notifications').createIndex({ status: 1 });
    await db.collection('notifications').createIndex({ createdAt: -1 });
    console.log('  ✓ Created indexes');
    
  } catch (error) {
    console.error('  ✗ Error seeding Notification Database:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

// =====================================================
// MAIN
// =====================================================
async function main() {
  console.log('═'.repeat(60));
  console.log('🌱 EventMN Database Seeding Script');
  console.log('═'.repeat(60));
  
  if (shouldDrop) {
    console.log('⚠️  WARNING: --drop flag detected. Existing data will be removed.');
  }
  
  const startTime = Date.now();
  
  try {
    await seedUserDatabase();
    await seedEventDatabase();
    await seedBookingDatabase();
    await seedNotificationDatabase();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ All databases seeded successfully!');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═'.repeat(60));
    
    // Print login credentials
    console.log('\n📋 Test Login Credentials:');
    console.log('─'.repeat(40));
    console.log('Admin:');
    console.log('  Email: admin@eventmn.mn');
    console.log('  Password: Admin@123');
    console.log('\nOrganizer:');
    console.log('  Email: organizer1@eventmn.mn');
    console.log('  Password: Org@1234');
    console.log('\nUser:');
    console.log('  Email: user1@gmail.com');
    console.log('  Password: User@123');
    console.log('─'.repeat(40));
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

main();
