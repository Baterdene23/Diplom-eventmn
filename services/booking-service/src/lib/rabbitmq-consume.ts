import amqp, { type Channel, type ConsumeMessage } from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE = 'eventmn';

let connection: any = null;
let channel: Channel | null = null;

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

async function getChannel(): Promise<Channel> {
  if (!channel) {
    const conn = await getConnection();
    channel = await conn.createChannel();
    await channel!.assertExchange(EXCHANGE, 'topic', { durable: true });
  }
  return channel!;
}

type MessageHandler = (message: Record<string, unknown>) => Promise<void>;

export async function consumeQueue(queue: string, handler: MessageHandler): Promise<void> {
  const ch = await getChannel();
  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, EXCHANGE, queue);
  await ch.prefetch(1);

  await ch.consume(queue, async (msg: ConsumeMessage | null) => {
    if (!msg) return;
    try {
      const content = JSON.parse(msg.content.toString());
      console.log(`[${queue}] Received message:`, content);
      await handler(content);
      ch.ack(msg);
    } catch (error) {
      console.error(`[${queue}] Handler error:`, error);
      ch.nack(msg, false, true);
    }
  });

  console.log(`[*] Booking-service consuming queue: ${queue}`);
}
