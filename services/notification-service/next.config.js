/** @type {import('next').NextConfig} */
const nextConfig = { 
  reactStrictMode: true,
  // Instrumentation for RabbitMQ consumers
  experimental: {
    instrumentationHook: true,
  },
};
module.exports = nextConfig;
