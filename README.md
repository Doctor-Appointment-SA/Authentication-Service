  <h1>Authentication Service</h1>
  <p>
    บริการนี้ทำหน้าที่จัดการ <strong>การยืนยันตัวตน (Authentication)</strong> สำหรับการใช้งานแอปพลิเคชัน  
    พัฒนาด้วย <strong>NestJS</strong>, <strong>Prisma</strong>, และ <strong>PostgreSQL</strong>  
    ใช้ระบบ <strong>JWT (Access Token + Refresh Token)</strong> สำหรับตรวจสอบสิทธิ์การเข้าใช้งาน
  </p>

  <h2>Feature</h2>
  <ul>
    <li>สมัครสมาชิก / ล็อกอิน</li>
    <li>เก็บรหัสผ่านแบบเข้ารหัสด้วย <strong>bcrypt</strong></li>
    <li>
      ระบบยืนยันตัวตนด้วย <strong>JWT</strong>
      <ul>
        <li><strong>Access Token</strong>: ใช้ยืนยันตัวตนขณะใช้งาน มีอายุ <em>15 นาที</em></li>
        <li><strong>Refresh Token</strong>: ใช้สร้าง Access Token ใหม่ มีอายุ <em>1 วัน</em></li>
      </ul>
    </li>
    <li>ใช้ <strong>Prisma ORM</strong> เชื่อมต่อฐานข้อมูล <strong>PostgreSQL</strong></li>
  </ul>

  <br/>
  <h2>การติดตั้ง</h2>
  <h3>1. Clone โปรเจกต์</h3>
  <pre><code>git clone https://github.com/Doctor-Appointment-SA/Authentication-Service.git
cd Authentication-Service</code></pre>

  <h3>2. ติดตั้ง Dependencies</h3>
  <pre><code>npm install</code></pre>

  <h3>3. ตั้งค่าไฟล์ .env</h3>
  <pre><code>
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME"

# JWT

JWT_ACCESS_SECRET=""
JWT_REFRESH_SECRET=""
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="1d"</code></pre>

  <h3>4. สร้าง Prisma Client</h3>
  <pre><code>npx prisma generate</code></pre>

  <h3>5. รันเซิร์ฟเวอร์ Development</h3>
  <pre><code>npm run build
npm run start:dev</code></pre>

  <br/>
  <h2>ตัวอย่างการใช้งาน API</h2>

  <h3>🔑 Auth APIs</h3>

  <h4>1. ตรวจสอบว่าเป็นใคร (Who am I) </h4>
  <p>ใช้ยืนยันตัวตนตัวของเรา ขณะใช้งาน ทุกครั้งที่เราจะยิง Request อะไรบางอย่าง ต้องมีการยืนยันตัวตนก่อน</p>
  <pre><code>curl -X GET http://localhost:5001/api/auth/whoami \
  -H "Authorization: Bearer &lt;ACCESS_TOKEN&gt;"</code></pre>

  <h4>2. สมัครสมาชิก (Register)</h4>
  <pre><code>curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "id_card": "1234567890121",
    "name": "John",
    "lastname": "Doe",
    "phone": "0890000000",
    "password": "mypassword",
    "confirmPassword": "mypassword"
  }'</code></pre>

  <h4>3. ล็อกอิน (Login)</h4>
  <pre><code>curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "mypassword"
  }'</code></pre>

  <h4>4. ขอ Access Token ใหม่ (Refresh)</h4>
  <pre><code>curl -X POST http://localhost:5001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "&lt;REFRESH_TOKEN&gt;"
  }'</code></pre>

  <h4>5. ออกจากระบบ (Logout)</h4>
  <pre><code>curl -X POST http://localhost:5001/api/auth/logout \
  -H "Authorization: Bearer &lt;ACCESS_TOKEN&gt;"</code></pre>

  <h3>👤 User APIs</h3>

  <h4>1. ดึงข้อมูลผู้ใช้ทั้งหมด</h4>
  <pre><code>curl -X GET http://localhost:5001/api/user \
  -H "Authorization: Bearer &lt;ACCESS_TOKEN&gt;"</code></pre>

  <h4>2. ดึงข้อมูลผู้ใช้ตาม ID</h4>
  <pre><code>curl -X GET http://localhost:5001/api/user/&lt;USER_ID&gt; \
  -H "Authorization: Bearer &lt;ACCESS_TOKEN&gt;"</code></pre>

  <h4>3. สร้างผู้ใช้ใหม่</h4>
  <pre><code>curl -X POST http://localhost:5001/api/user \
  -H "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane",
    "lastname": "Smith"
  }'</code></pre>

  <h4>4. ลบผู้ใช้</h4>
  <pre><code>curl -X DELETE http://localhost:5001/api/user/&lt;USER_ID&gt; \
  -H "Authorization: Bearer &lt;ACCESS_TOKEN&gt;"</code></pre>

  <div class="note">
    <strong>หมายเหตุ:</strong>
    <ul>
      <li>แทนค่า <code>&lt;ACCESS_TOKEN&gt;</code> ด้วย JWT ที่ถูกต้อง</li>
      <li>แทนค่า <code>&lt;USER_ID&gt;</code> ด้วยรหัสผู้ใช้ที่มีอยู่จริงในฐานข้อมูล</li>
      <li>Payload บางตัวอย่างอาจต้องปรับให้ตรงกับ <em>DTO ของโปรเจกต์จริง</em></li>
    </ul>
  </div>
