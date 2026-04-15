import amqp, { Channel } from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE = 'eventmn';

// Singleton connection & channel
let connection: any = null;
let channel: Channel | null = null;

/**
 * RabbitMQ холболт авах
 */
async function getConnection(): Promise<any> {
  if (!connection) {
    connection = await amqp.connect(RABBITMQ_URL);
    
    connection.on('close', () => {
      console.log('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });
    
    connection.on('error', (err: Error) => {
      console.error('RabbitMQ connection error:', err);
      connection = null;
      channel = null;
    });
  }
  return connection;
}

/**
 * Channel авах
 */
async function getChannel(): Promise<Channel> {
  if (!channel) {
    const conn = await getConnection();
    channel = await conn.createChannel();
    
    // Exchange үүсгэх (topic type)
    await channel!.assertExchange(EXCHANGE, 'topic', { durable: true });
  }
  return channel!;
}

/**
 * Queue нэрүүд / Routing keys
 */
export const ROUTING_KEYS = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  EVENT_REMINDER: 'event.reminder',
  EVENT_CANCELLED: 'event.cancelled',
  EVENT_UPDATED: 'event.updated',
} as const;

/**
 * Мессеж илгээх
 */
export async function publishMessage(
  routingKey: string,
  message: Record<string, unknown>
): Promise<boolean> {
  try {
    const ch = await getChannel();
    const content = Buffer.from(JSON.stringify(message));
    
    const result = ch.publish(EXCHANGE, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
    });

    console.log(`[RabbitMQ] Published to ${routingKey}:`, message);
    return result;
  } catch (error) {
    console.error('[RabbitMQ] Publish error:', error);
    return false;
  }
}
