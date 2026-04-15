export default function EventServiceHome() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Event Service</h1>
      <p>EventMN Microservices - Event & Venue Management</p>
      
      <h2>API Endpoints</h2>
      
      <h3>Events</h3>
      <ul>
        <li><code>GET /api/events</code> - Event жагсаалт</li>
        <li><code>POST /api/events</code> - Event үүсгэх</li>
        <li><code>GET /api/events/:id</code> - Event дэлгэрэнгүй</li>
        <li><code>PATCH /api/events/:id</code> - Event шинэчлэх</li>
        <li><code>DELETE /api/events/:id</code> - Event устгах</li>
      </ul>

      <h3>Venues</h3>
      <ul>
        <li><code>GET /api/venues</code> - Venue жагсаалт</li>
        <li><code>POST /api/venues</code> - Venue үүсгэх</li>
        <li><code>GET /api/venues/:id</code> - Venue дэлгэрэнгүй</li>
        <li><code>PATCH /api/venues/:id</code> - Venue шинэчлэх</li>
      </ul>

      <h2>Health Check</h2>
      <p>Status: <span style={{ color: 'green' }}>Running</span></p>
    </main>
  );
}
