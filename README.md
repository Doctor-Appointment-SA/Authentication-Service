🏥 Authentication Service

บริการนี้ทำหน้าที่จัดการ การยืนยันตัวตน (Authentication) สำหรับการใช้งานแอปพลิเคชัน
พัฒนาด้วย NestJS, Prisma, และ PostgreSQL
ใช้ระบบ JWT (Access Token + Refresh Token) สำหรับตรวจสอบสิทธิ์การเข้าใช้งาน

✨ Features

สมัครสมาชิก / ล็อกอิน

เก็บรหัสผ่านแบบเข้ารหัสด้วย bcrypt

ระบบยืนยันตัวตนด้วย JWT

Access Token: ใช้ยืนยันตัวตนขณะใช้งาน (อายุ 15 นาที)

Refresh Token: ใช้สร้าง Access Token ใหม่ (อายุ 1 วัน)

ใช้ Prisma ORM เชื่อมต่อฐานข้อมูล PostgreSQL

⚙️ การติดตั้ง
1️⃣ Clone โปรเจกต์
git clone https://github.com/Doctor-Appointment-SA/Authentication-Service.git
cd Authentication-Service

2️⃣ ติดตั้ง Dependencies
npm install

3️⃣ ตั้งค่าไฟล์ .env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME"

# JWT

JWT_ACCESS_SECRET=""
JWT_REFRESH_SECRET=""
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="1d"

4️⃣ สร้าง Prisma Client
npx prisma generate

5️⃣ รันเซิร์ฟเวอร์ Development
npm run build
npm run start:dev

🔑 ตัวอย่างการใช้งาน API
Auth APIs
1. ตรวจสอบว่าเป็นใคร (Who am I)

ใช้ยืนยันตัวตนขณะใช้งาน ทุกครั้งที่ยิง Request ต้องมีการยืนยันตัวตนก่อน

curl -X GET http://localhost:4001/api/auth/whoami \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

curl -X GET http://localhost:4001/api/auth/whoami \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDA4MTVkNS0wY2Y1LTQ2OTYtODEzNy0xYTMyODNkMWMwMDIiLCJyb2xlIjoicGF0aWVudCIsImlhdCI6MTc2MDcxMjY0MywiZXhwIjoxNzYwNzEzNTQzfQ.w0AZ6zc0kMX9sRKx0qi_R2smWyHlzkDzl5ixLfrBNHc"

2. สมัครสมาชิก (Register)
curl -X POST http://localhost:4001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "id_card": "1234567890121",
    "name": "John",
    "lastname": "Doe",
    "phone": "0890000000",
    "password": "mypassword",
    "confirmPassword": "mypassword"
  }'

3. ล็อกอิน (Login)
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "mypassword"
  }'

4. ขอ Access Token ใหม่ (Refresh)
curl -X POST http://localhost:4001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<REFRESH_TOKEN>"
  }'

5. ออกจากระบบ (Logout)
curl -X POST http://localhost:4001/api/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

User APIs
1. ดึงข้อมูลผู้ใช้ทั้งหมด
curl -X GET http://localhost:4001/api/user \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

2. ดึงข้อมูลผู้ใช้ตาม ID
curl -X GET http://localhost:4001/api/user/<USER_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

3. สร้างผู้ใช้ใหม่
curl -X POST http://localhost:4001/api/user \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane",
    "lastname": "Smith"
  }'

4. ลบผู้ใช้
curl -X DELETE http://localhost:4001/api/user/<USER_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

📝 หมายเหตุ

แทนค่า <ACCESS_TOKEN> ด้วย JWT ที่ถูกต้อง

แทนค่า <USER_ID> ด้วยรหัสผู้ใช้ที่มีอยู่จริงในฐานข้อมูล

Payload บางตัวอย่างอาจต้องปรับให้ตรงกับ DTO ของโปรเจกต์จริง