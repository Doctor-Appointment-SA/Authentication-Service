# Authentication Service

บริการนี้ทำหน้าที่จัดการ **การยืนยันตัวตน (Authentication)** สำหรับการใช้งานแอปพลิเคชัน
เป็นหนึ่งใน service ของ [ระบบนัดหมายแพทย์](https://github.com/Doctor-Appointment-SA)

**Tech stack:** NestJS · Prisma ORM · PostgreSQL · JWT · Passport

---

## Features

- สมัครสมาชิก / ล็อกอิน
- เก็บรหัสผ่านแบบเข้ารหัสด้วย **bcrypt**
- ระบบยืนยันตัวตนด้วย **JWT 2 ชั้น**
  - **Access Token** — ส่งกลับใน response body ให้ frontend เก็บไว้ใช้ยิง request
  - **Refresh Token** — ส่งกลับเป็น **httpOnly cookie** ที่ JavaScript อ่านไม่ได้
    เพื่อลดความเสี่ยงจากการถูกขโมย token ผ่าน XSS
- **หมุน refresh token ทุกครั้งที่ใช้** — เรียก `/refresh` หนึ่งครั้งจะได้ทั้ง access token
  และ refresh token ชุดใหม่ ส่วนของเดิมถูก `revoked` **ทันทีที่ใช้** ไม่ใช่รอให้หมดอายุ
- เก็บ refresh token ในฐานข้อมูลแบบ hash พร้อมสถานะ `revoked` เพื่อให้ logout ได้จริง
- ใช้ **Prisma ORM** เชื่อมต่อฐานข้อมูล PostgreSQL

---

## การติดตั้ง

### 1. Clone โปรเจกต์

```bash
git clone https://github.com/Doctor-Appointment-SA/Authentication-Service.git
cd Authentication-Service
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่าไฟล์ `.env`

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME"

# JWT
JWT_ACCESS_SECRET=""
JWT_REFRESH_SECRET=""
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="1d"

# ไม่บังคับ
PORT=5001
NODE_ENV=development
```

> `JWT_ACCESS_SECRET` ต้องใช้ค่าเดียวกันกับ service อื่นที่ต้องตรวจ token ใบเดียวกัน
> เช่น [Payment Service](https://github.com/Doctor-Appointment-SA/Payment-Service)

### 4. สร้าง Prisma Client

```bash
npx prisma generate
```

### 5. รันเซิร์ฟเวอร์ Development

```bash
npm run start:dev
```

ทุก endpoint จะขึ้นต้นด้วย `/api`

| วิธีรัน | Port ที่เรียกใช้ |
|---|---|
| `npm run start:dev` โดยตรง | `http://localhost:5001` (ค่า default ของ `PORT`) |
| ผ่าน `docker compose` ([Infra](https://github.com/Doctor-Appointment-SA/Infra)) | `http://localhost:5001` (map ไปที่ port 4001 ใน container) |

---

## API Reference

| Method | Endpoint | คำอธิบาย | ต้องมี Token |
|---|---|---|:---:|
| `POST` | `/api/auth/register` | สมัครสมาชิก | — |
| `POST` | `/api/auth/login` | ล็อกอิน | — |
| `GET` | `/api/auth/whoami` | ดึงข้อมูลผู้ใช้ที่ล็อกอินอยู่ | ✅ |
| `POST` | `/api/auth/refresh` | ขอ Access Token ใหม่ | cookie |
| `POST` | `/api/auth/logout` | ออกจากระบบ (revoke refresh token) | ✅ |
| `POST` | `/api/users` | สร้างผู้ใช้ใหม่ | ✅ |
| `GET` | `/api/users/:user_id` | ดึงข้อมูลผู้ใช้ตาม ID | ✅ |

---

## ลำดับการทำงานของ Token

1. **register / login** — server ตอบ `access_token` มาใน response body
2. **ระหว่างใช้งาน** — client แนบ access token เป็น `Authorization: Bearer <token>`
   ไปกับทุก endpoint ที่ต้องล็อกอิน (`/api/auth/whoami`, `/api/users` รวมถึง service อื่น)
3. **access token หมดอายุ (15 นาที)** — client ยิง `POST /api/auth/refresh`
   โดยเบราว์เซอร์แนบ cookie ไปให้เอง จะได้ access token ใบใหม่
   **พร้อม refresh token ใบใหม่** ส่วนใบเดิมถูก revoke ทันที
4. **refresh token ใช้ไม่ได้แล้ว (revoke)** — หมดอายุตาม `JWT_REFRESH_EXPIRES` (ตัวอย่างตั้งไว้ 1 วัน) server จะไม่คืน access token ใหม่ และ frontend ต้องพาผู้ใช้กลับไปหน้า login

---

## ตัวอย่างการใช้งาน API

### 1. สมัครสมาชิก (Register)

`id_card`, `password`, `confirmPassword` เป็น field ที่บังคับ
ส่วน `name`, `lastname`, `phone` ใส่หรือไม่ใส่ก็ได้ รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร

> **สำคัญ:** `username` (เลข HN) **ระบบเป็นคนสร้างให้เอง** ส่งมาเองไม่มีผล และ `role` เป็น `patient` เสมอ
> ส่วน `health_benefits` ที่ส่งมาทาง endpoint นี้ **จะถูกละทิ้ง** ระบบจะสุ่มให้ 3 รายการแทน
> (ถ้าต้องการกำหนดเอง ต้องใช้ `POST /api/users`)
> ถ้า `id_card` ซ้ำกับที่มีอยู่แล้วจะได้ `409 Conflict`

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -c cookie.txt \
  -d '{
    "id_card": "1234567890121",
    "name": "John",
    "lastname": "Doe",
    "phone": "0890000000",
    "password": "mypassword",
    "confirmPassword": "mypassword"
  }'
```

<details>
<summary>ตัวอย่าง response</summary>

```json
{
  "user": {
    "id": "de3ad64e-e416-4f96-ba71-7f5f1278ebc8",
    "id_card": "1234567890121",
    "name": "John",
    "role": "patient",
    "createdAt": null
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

</details>

> response **ไม่ได้คืน `username` (เลข HN) กลับมา** แต่การล็อกอินต้องใช้ค่านี้
> ให้เรียก `GET /api/auth/whoami` ด้วย `access_token` ที่เพิ่งได้ เพื่อดูเลข HN ของตัวเองก่อน

### 2. ล็อกอิน (Login)

ใช้ `username` คือ **เลข HN ที่ระบบสร้างให้** (ดูได้จาก `whoami`) ไม่ใช่ค่าที่ตั้งเอง

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookie.txt \
  -d '{
    "username": "HN26000001",
    "password": "mypassword"
  }'
```

response จะได้ `{ user, access_token }` ส่วน refresh token จะถูกเซ็ตเป็น cookie
(`-c cookie.txt` คือให้ curl เก็บ cookie ไว้ใช้ต่อ)

### 3. ตรวจสอบว่าเป็นใคร (Who am I)

```bash
curl -X GET http://localhost:5001/api/auth/whoami \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

<details>
<summary>ตัวอย่าง response</summary>

```json
{
  "id": "600815d5-0cf5-4696-8137-1a3283d1c002",
  "username": "HN25000002",
  "id_card": "1234567890121",
  "name": "John",
  "lastname": "Doe",
  "phone": "0890000000",
  "role": "patient",
  "health_benefits": ["Universal Coverage Scheme (UCS - Gold Card)"],
  "createdAt": "2025-10-17T14:50:43.000Z"
}
```

</details>

### 4. ขอ Access Token ใหม่ (Refresh)

refresh token อ่านจาก **cookie** ไม่ใช่ request body
และ endpoint นี้ต้องให้ client เป็นคนเรียกเอง service ไม่ได้เรียกให้อัตโนมัติ

```bash
curl -X POST http://localhost:5001/api/auth/refresh \
  -b cookie.txt -c cookie.txt
```

### 5. ออกจากระบบ (Logout)

```bash
curl -X POST http://localhost:5001/api/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 6. สร้างผู้ใช้ใหม่

ต่างจาก `/auth/register` ตรงที่ endpoint นี้ **รับค่า `health_benefits` ที่ส่งมาจริง**
(ถ้าไม่ส่งมา ระบบจะสุ่มให้ 3 รายการ ถ้าส่งเกิน 3 จะตัดเหลือแค่ 3 รายการแรก)
ค่าที่ส่งต้องตรงกับรายการใน
[`src/constants/health-benefits.ts`](./src/constants/health-benefits.ts) ไม่งั้นจะได้ `400`

```bash
curl -X POST http://localhost:5001/api/users   -H "Authorization: Bearer <ACCESS_TOKEN>"   -H "Content-Type: application/json" -d '{
    "id_card": "7770000000001",
    "name": "Direct",
    "lastname": "User",
    "password": "mypassword",
    "health_benefits": ["Dental Add-on"]
  }'
```

### 7. ดึงข้อมูลผู้ใช้ตาม ID

```bash
curl -X GET http://localhost:5001/api/users/<USER_ID>   -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## โครงสร้างโปรเจกต์

```
src/
├── auth/
│   ├── auth.controller.ts       # register / login / whoami / refresh / logout
│   ├── auth.service.ts          # bcrypt, ออก token, หมุน refresh token
│   ├── guards/jwt-auth.guard.ts # Guard ตรวจ access token
│   ├── strategies/
│   │   ├── jwt.strategy.ts      # ถอด access token แล้ว attach payload เข้า request
│   │   └── local.strategy.ts    # ตรวจ username/password
│   ├── dto/                     # validation schema ของ register และ login
│   └── utils/token.helper.ts    # เซ็ต refresh token เป็น httpOnly cookie
├── users/                       # สร้างและค้นหาผู้ใช้
├── constants/
│   └── health-benefits.ts       # รายการสิทธิ์การรักษาที่อนุญาต
└── prisma/                      # Prisma service + connection
```

---

## หมายเหตุ

- แทนค่า `<ACCESS_TOKEN>` ด้วย access token ที่ได้จาก register หรือ login
- ทุก endpoint ผ่าน `ValidationPipe` แบบ `whitelist` — field ที่ไม่ได้ประกาศไว้ใน DTO
  จะถูกตัดทิ้งอัตโนมัติ
- cookie ของ refresh token ตั้ง `secure: true` เฉพาะตอน `NODE_ENV=production`
  ตอน develop บน http จึงยังใช้งานได้ปกติ
- `username` (เลข HN) ระบบสร้างให้อัตโนมัติเสมอ และ **ไม่ได้คืนมาใน response ของ register**
  ต้องเรียก `whoami` เพื่อดูก่อน ถึงจะล็อกอินด้วยรหัสผ่านได้
- endpoint ใต้ `/api/users` ต้องมี access token ทั้งคู่ และ `GET /api/users/:user_id`
  จะไม่คืนค่า `password` กลับมา
- `logout` เพิกถอน refresh token จริง — เรียก `/refresh` ด้วย cookie เดิมหลัง logout จะได้ `401`
- `GET /api/users/:user_id` ที่หา id ไม่เจอจะได้ `200` พร้อม body ว่าง (`null`) ไม่ใช่ `404`
- `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` รองรับเฉพาะรูปแบบ `<ตัวเลข><s|m|h|d>`
  เช่น `15m`, `1d` — ค่าอย่าง `1w` หรือ `7 days` จะทำให้ `expiresAt` ที่บันทึกลง DB เพี้ยน
- อายุ cookie ของ refresh token ตั้งไว้ 7 วัน แต่ตัว JWT ข้างในหมดอายุตาม
  `JWT_REFRESH_EXPIRES` (1 วัน) — cookie จึงยังค้างอยู่แม้ token ข้างในหมดอายุแล้ว
