# Authentication Service

บริการนี้ทำหน้าที่จัดการ **การยืนยันตัวตน (Authentication)** สำหรับการใช้งานแอปพลิเคชัน
เป็นหนึ่งใน service ของ [ระบบนัดหมายแพทย์](https://github.com/Doctor-Appointment-SA)

**Tech stack:** NestJS · Prisma ORM · PostgreSQL · JWT

---

## Features

- สมัครสมาชิก / ล็อกอิน
- เก็บรหัสผ่านแบบเข้ารหัสด้วย **bcrypt**
- ระบบยืนยันตัวตนด้วย **JWT**
  - **Access Token** — ใช้ยืนยันตัวตนขณะใช้งาน (อายุ 15 นาที)
  - **Refresh Token** — ใช้สร้าง Access Token ใหม่ (อายุ 1 วัน)
- ใช้ **Prisma ORM** เชื่อมต่อฐานข้อมูล PostgreSQL

---

## การติดตั้ง

### Clone โปรเจกต์

```bash
git clone https://github.com/Doctor-Appointment-SA/Authentication-Service.git
cd Authentication-Service
```

### ติดตั้ง Dependencies

```bash
npm install
```

### ตั้งค่าไฟล์ `.env`

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME"

# JWT
JWT_ACCESS_SECRET=""
JWT_REFRESH_SECRET=""
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="1d"
```

### สร้าง Prisma Client

```bash
npx prisma generate
```

### รันเซิร์ฟเวอร์ Development

```bash
npm run build
npm run start:dev
```

เซิร์ฟเวอร์จะรันที่ `http://localhost:4001`

---

## API Reference

| Method | Endpoint | คำอธิบาย | ต้องมี Token |
|---|---|---|:---:|
| `GET` | `/api/auth/whoami` | ตรวจสอบว่าเป็นใคร | ✅ |
| `POST` | `/api/auth/register` | สมัครสมาชิก | — |
| `POST` | `/api/auth/login` | ล็อกอิน | — |
| `POST` | `/api/auth/refresh` | ขอ Access Token ใหม่ | — |
| `POST` | `/api/auth/logout` | ออกจากระบบ | ✅ |
| `GET` | `/api/user` | ดึงข้อมูลผู้ใช้ทั้งหมด | ✅ |
| `GET` | `/api/user/<USER_ID>` | ดึงข้อมูลผู้ใช้ตาม ID | ✅ |
| `POST` | `/api/user` | สร้างผู้ใช้ใหม่ | ✅ |
| `DELETE` | `/api/user/<USER_ID>` | ลบผู้ใช้ | ✅ |

---

### Auth APIs

#### 1. ตรวจสอบว่าเป็นใคร (Who am I)

ใช้ยืนยันตัวตนขณะใช้งาน — ทุกครั้งที่ยิง Request ต้องมีการยืนยันตัวตนก่อน

```bash
curl -X GET http://localhost:4001/api/auth/whoami \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

<details>
<summary>ตัวอย่าง response</summary>

```json
{
  "sub": "600815d5-0cf5-4696-8137-1a3283d1c002",
  "role": "patient",
  "iat": 1760712643,
  "exp": 1760713543
}
```

</details>

#### 2. สมัครสมาชิก (Register)

```bash
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
```

#### 3. ล็อกอิน (Login)

```bash
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "mypassword"
  }'
```

#### 4. ขอ Access Token ใหม่ (Refresh)

```bash
curl -X POST http://localhost:4001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<REFRESH_TOKEN>"
  }'
```

#### 5. ออกจากระบบ (Logout)

```bash
curl -X POST http://localhost:4001/api/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

### User APIs

#### 1. ดึงข้อมูลผู้ใช้ทั้งหมด

```bash
curl -X GET http://localhost:4001/api/user \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### 2. ดึงข้อมูลผู้ใช้ตาม ID

```bash
curl -X GET http://localhost:4001/api/user/<USER_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### 3. สร้างผู้ใช้ใหม่

```bash
curl -X POST http://localhost:4001/api/user \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane",
    "lastname": "Smith"
  }'
```

#### 4. ลบผู้ใช้

```bash
curl -X DELETE http://localhost:4001/api/user/<USER_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## หมายเหตุ

- แทนค่า `<ACCESS_TOKEN>` ด้วย JWT ที่ถูกต้อง
- แทนค่า `<USER_ID>` ด้วยรหัสผู้ใช้ที่มีอยู่จริงในฐานข้อมูล
- Payload บางตัวอย่างอาจต้องปรับให้ตรงกับ DTO ของโปรเจกต์จริง
