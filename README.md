# 🕐 Timesheet

A staff workforce management app inspired by [Tanda](https://my.tanda.co/api/v2/documentation) — built with **Next.js 14**, **TypeScript**, **MongoDB Atlas**, and **Cloudinary**. Deployed on Vercel.

**Live demo → [timesheet-five-beta.vercel.app](https://timesheet-five-beta.vercel.app)**

---

## ✨ Features (Planned — Tanda API v2 Compatible)

| Feature | Status |
|---|---|
| PIN-based time clock login | ✅ Live |
| Staff profiles & roles | 🔧 In Progress |
| Timesheets (pay periods) | 🔧 In Progress |
| Shift tracking & approval | 🔧 In Progress |
| Roster builder & publishing | 📋 Planned |
| Leave requests & balances | 📋 Planned |
| GPS geofencing clock-in | 📋 Planned |
| Clock-in selfie via Cloudinary | 📋 Planned |
| Department / team management | 📋 Planned |
| Staff unavailability | 📋 Planned |
| Qualifications & compliance | 📋 Planned |
| Payroll export (CSV) | 📋 Planned |
| Notifications | 📋 Planned |

---

## 🗂️ Project Structure

```
├── app/
│   ├── api/v2/          # REST API route handlers
│   │   ├── users/
│   │   ├── timesheets/
│   │   ├── shifts/
│   │   ├── rosters/
│   │   ├── schedules/
│   │   ├── leave/
│   │   ├── clock-ins/
│   │   └── departments/
│   ├── dashboard/       # Protected admin/manager views
│   └── (auth)/          # PIN login & auth flows
├── components/          # shadcn/ui + custom components
├── lib/
│   ├── mongodb.ts       # Mongoose connection with caching
│   ├── cloudinary.ts    # Cloudinary upload helpers
│   └── utils.ts
├── models/              # Mongoose schemas
│   ├── User.ts
│   ├── Timesheet.ts
│   ├── Shift.ts
│   ├── Roster.ts
│   ├── Schedule.ts
│   ├── Leave.ts
│   ├── ClockIn.ts
│   ├── Department.ts
│   └── Location.ts
├── provider/            # React context providers
├── types/               # TypeScript type definitions
└── middleware.ts        # Route protection & role guards
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Database | MongoDB Atlas (Mongoose) |
| Images | Cloudinary |
| Auth | NextAuth.js |
| Deployment | Vercel |

---

## 🗃️ Database Schema (MongoDB / Mongoose)

All collections are managed via Mongoose models in `/models/`. Key collections:

### `users`
```js
{
  name, email, phone,
  pin,              // hashed — for time clock login
  role,             // "employee" | "team_manager" | "roster_manager" | "admin"
  employmentType,   // "full_time" | "part_time" | "casual"
  payRate,          // hourly rate
  photo,            // Cloudinary URL
  locationId, defaultTeamId,
  isActive, canSeeOwnTs, canSeeCosts,
  startDate, endDate
}
```

### `timesheets`
```js
{
  userId,
  periodStart, periodEnd,   // pay period window
  status,                   // "pending" | "approved" | "exported"
  shifts: [ObjectId],
  isLocked, exportedAt,
  totalHours, totalCost     // cached computed values
}
```
> Timesheets are auto-created when the first shift is added for a pay period — never created directly.

### `shifts`
```js
{
  timesheetId, userId, departmentId,
  date, start, finish,
  breaks: [{ start, finish, duration }],  // embedded
  status,           // "pending" | "approved" | "rejected"
  leaveRequestId,
  approvedById, approvedAt,
  cost,             // calculated: hours × payRate
  notes: [{ userId, content, createdAt }], // embedded
  metadata          // free-text field (500 chars)
}
```

### `rosters`
```js
{
  locationId,
  weekStart,        // always Monday
  isPublished, publishedAt,
  budgetTarget,
  schedules: [ObjectId]
}
```
> Rosters are auto-created when the first schedule is added for a location/week.

### `schedules`
```js
{
  rosterId, userId,   // userId null = vacant shift
  departmentId,
  date, start, finish,
  breakDuration,
  isPublished, cost, metadata
}
```

### `leave_requests`
```js
{
  userId,
  leaveType,   // "annual" | "sick" | "personal" | "unpaid" | "public_holiday"
  startDate, endDate,
  status,      // "pending" | "approved" | "rejected" | "cancelled"
  reason, approverId, approvedAt
}
```

### `clock_ins`
```js
{
  userId, shiftId, locationId,
  clockInTime, clockOutTime,
  latitude, longitude,
  isWithinGeofence,
  photo,          // Cloudinary URL (clock-in selfie)
  deviceId
}
```

---

## 🔌 API Endpoints

All endpoints live under `/app/api/v2/` and require authentication via session token.

### Users
| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/v2/users` | List all staff | admin, manager |
| POST | `/api/v2/users` | Create employee | admin |
| GET | `/api/v2/users/:id` | Get employee | admin, manager, self |
| PUT | `/api/v2/users/:id` | Update employee | admin, manager |
| GET | `/api/v2/users/me` | Get current user | any |

### Timesheets
| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/v2/timesheets` | List timesheets | admin, manager |
| GET | `/api/v2/timesheets/:id` | Get timesheet | admin, manager, self |
| GET | `/api/v2/timesheets/on/:date` | Get timesheets for date | admin, manager |
| POST | `/api/v2/timesheets/:id/approve` | Approve timesheet | admin, manager |
| POST | `/api/v2/timesheets/:id/lock` | Lock timesheet | admin |

### Shifts
| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/v2/shifts` | List shifts | admin, manager, self |
| POST | `/api/v2/shifts` | Create shift | admin, manager |
| PUT | `/api/v2/shifts/:id` | Update shift | admin, manager |
| DELETE | `/api/v2/shifts/:id` | Delete shift | admin, manager |
| POST | `/api/v2/shifts/:id/approve` | Approve shift | admin, manager |

### Rosters & Schedules
| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/v2/rosters` | List rosters | any |
| GET | `/api/v2/rosters/current` | Current week roster | any |
| GET | `/api/v2/rosters/on/:date` | Roster containing date | any |
| POST | `/api/v2/rosters/:id/publish` | Publish roster | admin, manager |
| GET | `/api/v2/schedules` | List schedules | any |
| POST | `/api/v2/schedules` | Create schedule | admin, manager |
| PUT | `/api/v2/schedules/:id` | Update schedule | admin, manager |
| DELETE | `/api/v2/schedules/:id` | Delete schedule | admin, manager |

### Leave
| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/v2/leave` | List leave requests | admin, manager, self |
| POST | `/api/v2/leave` | Submit leave request | any |
| PUT | `/api/v2/leave/:id` | Update leave request | admin, manager, self |
| POST | `/api/v2/leave/:id/approve` | Approve leave | admin, manager |
| GET | `/api/v2/leave_balances` | Get leave balances | admin, manager, self |

### Clock Ins
| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/v2/clock_ins` | List clock-in records | admin, manager |
| POST | `/api/v2/clock_ins` | Clock in (GPS + photo) | any |
| PUT | `/api/v2/clock_ins/:id/clock_out` | Clock out | any |

### Departments & Locations
| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/v2/departments` | List departments | any |
| POST | `/api/v2/departments` | Create department | admin |
| GET | `/api/v2/locations` | List locations | any |
| POST | `/api/v2/locations` | Create location | admin |

---

## 🔐 Roles & Permissions

| Role | What they can see |
|---|---|
| `employee` | Own timesheets, shifts, and published rosters only |
| `team_manager` | All timesheets/shifts for their managed teams |
| `roster_manager` | All rosters, schedules across locations |
| `admin` | Everything — including costs, payroll export, user management |

---

## 📸 Cloudinary Integration

Images are uploaded directly from the client to Cloudinary using an **unsigned upload preset** — no files pass through Vercel. The returned URL is stored in MongoDB.

Used for:
- User profile photos (`users.photo`)
- Clock-in selfies (`clock_ins.photo`)

```ts
// lib/cloudinary.ts
const result = await cloudinary.uploader.upload(file, {
  folder: 'timesheet/avatars',   // or 'timesheet/clockins'
  upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
});
return result.secure_url;
```

---

## ⚡ Vercel Free Tier Considerations

| Constraint | How it's handled |
|---|---|
| 10s function timeout | All API routes are kept lightweight; no bulk processing in a single request |
| MongoDB connections | Connection caching in `lib/mongodb.ts` prevents pool exhaustion on serverless |
| No persistent file storage | All files go to Cloudinary directly — Vercel is stateless |
| 100GB bandwidth / month | Cloudinary serves all media; Next.js serves only JSON and HTML |

### MongoDB connection caching pattern
```ts
// lib/mongodb.ts
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

if (!cached.conn) {
  cached.promise = mongoose.connect(process.env.MONGODB_URI!, {
    bufferCommands: false,
  });
  cached.conn = await cached.promise;
}
return cached.conn;
```

---

## 🚀 Getting Started

### 1. Clone & install
```bash
git clone https://github.com/sushilldhakal/Timesheet.git
cd Timesheet
npm install
```

### 2. Set up environment variables
Copy `.env.example` to `.env.local` and fill in your values:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/timesheet

NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
```

### 3. Seed the database
```bash
npm run seed
```
This creates a default admin user, leave types, and a demo location.

### 4. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 📋 Roadmap

- [x] PIN time clock screen
- [ ] Mongoose models for all collections
- [ ] Auth with role-based sessions (NextAuth)
- [ ] Staff management (CRUD)
- [ ] Timesheet & shift management
- [ ] Shift approval workflow
- [ ] Roster builder (drag & drop)
- [ ] Roster publishing & staff notifications
- [ ] Leave request & approval flow
- [ ] GPS geofencing for clock-in
- [ ] Clock-in selfie (Cloudinary)
- [ ] Payroll export (CSV)
- [ ] Mobile-responsive time clock view

---

## 📄 License

MIT