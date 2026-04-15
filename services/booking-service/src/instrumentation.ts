// Next.js instrumentation - Event reminder producer scheduler эхлүүлэх
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startEventReminderScheduler } = await import('./lib/reminder-scheduler');
    const { startConsumers } = await import('./lib/consumer');

    try {
      startEventReminderScheduler();
      console.log('Event reminder scheduler registered successfully');
    } catch (error) {
      console.error('Failed to start event reminder scheduler:', error);
    }

    try {
      await startConsumers();
    } catch (error) {
      console.error('Failed to start booking-service consumers:', error);
    }
  }
}
