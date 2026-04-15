import amqp, { Channel, ConsumeMessage } from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

// Singleton connection & channel
let connection: any = null;
let channel: Channel | null = null;

// Queue нэрүүд
export const QUEUES = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  EVENT_APPROVED: 'event.approved',
  EVENT_REJECTED: 'event.rejected',
  EVENT_REMINDER: 'event.reminder',
  EVENT_CANCELLED: 'event.cancelled',
  EVENT_UPDATED: 'event.updated',
} as const;

// Exchange нэр
const EXCHANGE = 'eventmn';

/**
 * RabbitMQ холболт авах
 */
export async function getConnection(): Promise<any> {
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
export async function getChannel(): Promise<Channel> {
  if (!channel) {
    const conn = await getConnection();
    channel = await conn.createChannel();
    
    // Exchange үүсгэх (topic type)
    await channel!.assertExchange(EXCHANGE, 'topic', { durable: true });
    
    // Queue-үүд үүсгэх
    for (const queue of Object.values(QUEUES)) {
      await channel!.assertQueue(queue, { durable: true });
      // Exchange-тай холбох
      await channel!.bindQueue(queue, EXCHANGE, queue);
    }
  }
  return channel!;
}

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
    
    return ch.publish(EXCHANGE, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
    });
  } catch (error) {
    console.error('Publish message error:', error);
    return false;
  }
}

/**
 * Consumer callback type
 */
type MessageHandler = (message: Record<string, unknown>) => Promise<void>;

/**
 * Queue-аас мессеж хүлээн авах
 */
export async function consumeQueue(
  queue: string,
  handler: MessageHandler
): Promise<void> {
  const ch = await getChannel();
  
  // Prefetch тохируулах (1 мессеж)
  await ch.prefetch(1);
  
  await ch.consume(queue, async (msg: ConsumeMessage | null) => {
    if (!msg) return;
    
    try {
      const content = JSON.parse(msg.content.toString());
      console.log(`[${queue}] Received message:`, content);
      
      await handler(content);
      
      // Амжилттай бол acknowledge
      ch.ack(msg);
    } catch (error) {
      console.error(`[${queue}] Handler error:`, error);
      // Алдаа гарвал reject хийж дараа дахин оролдох
      ch.nack(msg, false, true);
    }
  });
  
  console.log(`[*] Consuming queue: ${queue}`);
}

/**
 * Холболт хаах
 */
export async function closeConnection(): Promise<void> {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
}
