export default function BookingServiceHome() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Booking Service</h1>
      <p>EventMN Microservices - Booking & Seat Management</p>
      
      <h2>API Endpoints</h2>
      
      <h3>Seats (Redis)</h3>
      <ul>
        <li><code>POST /api/seats/lock</code> - Суудал түгжих (10 минут)</li>
        <li><code>POST /api/seats/unlock</code> - Түгжээ тайлах</li>
        <li><code>GET /api/seats/status?eventId=xxx</code> - Суудлын төлөв</li>
      </ul>

      <h3>Bookings</h3>
      <ul>
        <li><code>GET /api/bookings</code> - Захиалгын жагсаалт</li>
        <li><code>POST /api/bookings</code> - Захиалга үүсгэх</li>
        <li><code>GET /api/bookings/:id</code> - Захиалгын дэлгэрэнгүй</li>
        <li><code>PATCH /api/bookings/:id</code> - Төлбөр баталгаажуулах</li>
        <li><code>DELETE /api/bookings/:id</code> - Захиалга цуцлах</li>
      </ul>

      <h2>Health Check</h2>
      <p>Status: <span style={{ color: 'green' }}>Running</span></p>
    </main>
  );
}
