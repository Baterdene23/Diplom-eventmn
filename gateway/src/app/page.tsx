export default function GatewayHome() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>EventMN API Gateway</h1>
      <p>Microservices API Gateway - Routing & Authentication</p>
      
      <h2>Services</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '8px', textAlign: 'left' }}>Service</th>
            <th style={{ padding: '8px', textAlign: 'left' }}>Endpoints</th>
            <th style={{ padding: '8px', textAlign: 'left' }}>Port</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={{ padding: '8px' }}>User Service</td>
            <td style={{ padding: '8px' }}>/api/auth/*, /api/users/*</td>
            <td style={{ padding: '8px' }}>3001</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={{ padding: '8px' }}>Event Service</td>
            <td style={{ padding: '8px' }}>/api/events/*, /api/venues/*</td>
            <td style={{ padding: '8px' }}>3002</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={{ padding: '8px' }}>Booking Service</td>
            <td style={{ padding: '8px' }}>/api/bookings/*, /api/seats/*</td>
            <td style={{ padding: '8px' }}>3003</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={{ padding: '8px' }}>Notification Service</td>
            <td style={{ padding: '8px' }}>/api/notifications/*</td>
            <td style={{ padding: '8px' }}>3004</td>
          </tr>
        </tbody>
      </table>

      <h2>Authentication</h2>
      <p>JWT Bearer token required for protected endpoints.</p>
      <code>Authorization: Bearer {'<token>'}</code>

      <h2>Public Endpoints</h2>
      <ul>
        <li>POST /api/auth/register</li>
        <li>POST /api/auth/login</li>
        <li>POST /api/auth/refresh</li>
        <li>GET /api/events</li>
        <li>GET /api/events/:id</li>
        <li>GET /api/venues</li>
      </ul>
    </main>
  );
}
