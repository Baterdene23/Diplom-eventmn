export default function NotificationServiceHome() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Notification Service</h1>
      <p>EventMN Microservices - Email & Push Notifications</p>
      
      <h2>API Endpoints</h2>
      <ul>
        <li><code>GET /api/notifications</code> - Мэдэгдлүүд авах</li>
        <li><code>PATCH /api/notifications</code> - Уншсан болгох</li>
        <li><code>POST /api/send</code> - Мэдэгдэл илгээх (Internal)</li>
      </ul>

      <h2>Notification Types</h2>
      <ul>
        <li>BOOKING_CONFIRMED - Захиалга баталгаажсан</li>
        <li>BOOKING_CANCELLED - Захиалга цуцлагдсан</li>
        <li>EVENT_REMINDER - Арга хэмжээний сануулга</li>
        <li>EVENT_UPDATED - Арга хэмжээ шинэчлэгдсэн</li>
        <li>EVENT_CANCELLED - Арга хэмжээ цуцлагдсан</li>
      </ul>

      <h2>Health Check</h2>
      <p>Status: <span style={{ color: 'green' }}>Running</span></p>
    </main>
  );
}
