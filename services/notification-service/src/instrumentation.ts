// Next.js instrumentation - RabbitMQ consumers эхлүүлэх
export async function register() {
  // Зөвхөн server-side дээр ажиллана
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import хийх (ESM compatibility)
    const { startConsumers } = await import('./lib/consumer');
    
    // Consumer-уудыг эхлүүлэх
    try {
      await startConsumers();
      console.log('RabbitMQ consumers registered successfully');
    } catch (error) {
      console.error('Failed to start RabbitMQ consumers:', error);
      // Retry after delay
      setTimeout(async () => {
        try {
          await startConsumers();
          console.log('RabbitMQ consumers registered on retry');
        } catch (retryError) {
          console.error('RabbitMQ consumer retry failed:', retryError);
        }
      }, 5000);
    }
  }
}
