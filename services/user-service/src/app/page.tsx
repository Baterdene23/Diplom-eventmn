export default function UserServiceHome() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>User Service</h1>
      <p>EventMN Microservices - User Authentication Service</p>
      
      <h2>API Endpoints</h2>
      <ul>
        <li><code>POST /api/auth/register</code> - Бүртгүүлэх</li>
        <li><code>POST /api/auth/login</code> - Нэвтрэх</li>
        <li><code>POST /api/auth/refresh</code> - Token сэргээх</li>
        <li><code>GET /api/users/me</code> - Өөрийн мэдээлэл</li>
        <li><code>PATCH /api/users/me</code> - Мэдээлэл шинэчлэх</li>
        <li><code>GET /api/users/:id</code> - Хэрэглэгчийн мэдээлэл (Admin)</li>
      </ul>

      <h2>Health Check</h2>
      <p>Status: <span style={{ color: 'green' }}>Running</span></p>
    </main>
  );
}
