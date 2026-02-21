# 🕐 Timesheet

A modern staff workforce management app with kiosk-style time clock — built with **Next.js 15**, **TypeScript**, **MongoDB Atlas**, and **Cloudinary**. Deployed on Vercel.

**Live demo → [timesheet-five-beta.vercel.app](https://timesheet-five-beta.vercel.app)**

---

## ✨ Features

| Feature | Status |
|---|---|
| **Authentication & Security** | |
| Two-layer device authentication (device + employee) | ✅ Live |
| Device registration & management | ✅ Live |
| Device revocation & status tracking | ✅ Live |
| PIN-based employee time clock login | ✅ Live |
| Admin/user role-based authentication | ✅ Live |
| JWT-based session management | ✅ Live |
| **Time Tracking** | |
| Clock in/out with timestamps | ✅ Live |
| Break tracking (start/end) | ✅ Live |
| Real-time face detection for clock-in | ✅ Live |
| Clock-in selfie capture via Cloudinary | ✅ Live |
| GPS location tracking | ✅ Live |
| Geofencing with hard/soft modes | ✅ Live |
| Location-based clock-in validation | ✅ Live |
| Automatic flagging for missing photo/location | ✅ Live |
| Device & location tracking per punch | ✅ Live |
| **Employee Management** | |
| Employee profiles (name, PIN, role, location) | ✅ Live |
| Employee CRUD operations | ✅ Live |
| Auto-generated secure PINs | ✅ Live |
| Profile photos via Cloudinary | ✅ Live |
| Birthday detection & celebration | ✅ Live |
| Employee timesheet viewing | ✅ Live |
| **Admin Dashboard** | |
| Dashboard with stats & analytics | ✅ Live |
| Hours summary & reporting | ✅ Live |
| Inactive employee tracking | ✅ Live |
| User management (admin/user roles) | ✅ Live |
| Category management (roles, locations, employers) | ✅ Live |
| Timesheet management & editing | ✅ Live |
| Flagged entries review | ✅ Live |
| Device management interface | ✅ Live |
| **Technical Features** | |
| PWA support (installable app) | ✅ Live |
| Responsive design (mobile/tablet/desktop) | ✅ Live |
| Dark mode support | ✅ Live |
| Real-time webcam integration | ✅ Live |
| Face detection with TensorFlow.js | ✅ Live |
| Cloudinary image optimization | ✅ Live |
| Automated Cloudinary cleanup cron | ✅ Live |
| Edge middleware for route protection | ✅ Live |
| **Planned Features** | |
| Shift approval workflow | 📋 Planned |
| Roster builder & publishing | 📋 Planned |
| Leave requests & balances | 📋 Planned |
| Payroll export (CSV) | 📋 Planned |
| Email/SMS notifications | 📋 Planned |
| Advanced reporting & analytics | 📋 Planned |

---

## 🗂️ Project Structure

```
├── app/
│   ├── api/                 # REST API route handlers
│   │   ├── auth/           # Admin authentication
│   │   ├── employee/       # Employee clock & auth
│   │   ├── employees/      # Employee CRUD
│   │   ├── users/          # User management
│   │   ├── timesheets/     # Timesheet operations
│   │   ├── categories/     # Category management
│   │   ├── device/         # Device registration & management
│   │   ├── dashboard/      # Dashboard stats & analytics
│   │   ├── upload/         # Cloudinary image uploads
│   │   ├── setup/          # Initial admin setup
│   │   └── cron/           # Scheduled cleanup jobs
│   ├── (dashboard)/        # Protected admin/manager views
│   │   └── dashboard/
│   │       ├── employees/  # Employee management
│   │       ├── users/      # User management
│   │       ├── timesheet/  # Timesheet viewing
│   │       ├── category/   # Category management
│   │       ├── devices/    # Device management
│   │       ├── flag/       # Flagged entries
│   │       └── profile/    # User profile
│   ├── clock/              # Employee clock-in interface
│   ├── login/              # Admin login
│   └── (Public)/           # Public PIN entry page
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── Home/              # PIN pad & login
│   ├── Setup/             # Initial setup dialog
│   └── DeviceRegistrationDialog.tsx
├── lib/
│   ├── db/                # Database connection & schemas
│   │   └── schemas/       # Mongoose models
│   │       ├── user.ts
│   │       ├── employee.ts
│   │       ├── timesheet.ts
│   │       ├── category.ts
│   │       └── device.ts
│   ├── auth.ts            # Admin JWT auth
│   ├── employee-auth.ts   # Employee JWT auth
│   ├── device-auth.ts     # Device JWT auth
│   ├── cloudinary/        # Cloudinary helpers
│   ├── hooks/             # React hooks
│   │   └── UserFaceDetection.ts
│   ├── utils/             # Utility functions
│   │   ├── geofence.ts
│   │   └── logger.ts
│   └── validation/        # Zod schemas
├── middleware.ts          # Two-layer auth middleware
└── public/
    └── models/            # Face detection models
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Database | MongoDB Atlas (Mongoose) |
| Images | Cloudinary |
| Auth | JWT (custom implementation) |
| Face Detection | TensorFlow.js (@vladmandic/face-api) |
| Webcam | react-webcam |
| Validation | Zod |
| Date Handling | date-fns |
| Deployment | Vercel |

---

## 🗃️ Database Schema (MongoDB / Mongoose)

All collections are managed via Mongoose models in `/lib/db/schemas/`. Key collections:

### `users`
Admin and manager accounts with role-based access control.
```js
{
  name,             // Display name
  username,         // Unique login username (lowercase)
  password,         // Bcrypt hashed
  role,             // "admin" | "user" | "super_admin"
  location,         // Array of assigned locations
  rights,           // Array of permission flags
  createdAt, updatedAt
}
```

### `employees`
Staff members who clock in/out via PIN.
```js
{
  name,             // Full name
  pin,              // 4-6 digit PIN (hashed in production)
  role,             // Array of role categories
  employer,         // Array of employer categories
  location,         // Array of location categories (for geofencing)
  hire,             // Hire date
  site,             // Primary site
  email, phone,     // Contact info
  dob,              // Date of birth (for birthday detection)
  comment,          // Notes
  img,              // Cloudinary profile photo URL
  createdAt, updatedAt
}
```

### `timesheets`
Individual clock-in/out/break records.
```js
{
  pin,              // Employee PIN reference
  type,             // "in" | "out" | "break" | "endBreak"
  date,             // Date string (dd-MM-yyyy)
  time,             // Timestamp string
  image,            // Cloudinary selfie URL
  lat, lng,         // GPS coordinates
  where,            // "lat,lng" combined
  flag,             // Auto-flagged if missing photo/location/geofence
  working,          // Detected location name (from geofence)
  source,           // "insert" | "update" (admin edits only)
  deviceId,         // Device UUID that recorded this entry
  deviceLocation    // Device location name at time of entry
}
```

### `categories`
Multi-purpose categories for roles, locations, employers, etc.
```js
{
  name,             // Category name
  type,             // "role" | "location" | "employer" | "site"
  // Location-specific fields:
  lat, lng,         // Geofence center coordinates
  radius,           // Geofence radius in meters (default 100)
  geofenceMode,     // "hard" (block) | "soft" (flag but allow)
  createdAt, updatedAt
}
```

### `devices`
Registered kiosk devices with two-layer authentication.
```js
{
  deviceId,         // Unique UUID
  locationName,     // Human-readable location
  locationAddress,  // Optional physical address
  status,           // "active" | "disabled" | "revoked"
  registeredBy,     // User ObjectId who registered device
  registeredAt,     // Registration timestamp
  lastActivity,     // Last seen timestamp
  revocationReason, // Optional reason for revocation
  revokedAt,        // Revocation timestamp
  revokedBy         // User ObjectId who revoked device
}
```

---

## 🔌 API Endpoints

All endpoints live under `/app/api/` and require authentication via JWT session tokens.

### Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Admin/user login | Public |
| POST | `/api/auth/logout` | Admin/user logout | Required |
| GET | `/api/auth/me` | Get current admin/user | Required |
| POST | `/api/employee/login` | Employee PIN login | Device token |
| POST | `/api/employee/logout` | Employee logout | Employee token |
| GET | `/api/employee/me` | Get current employee | Employee token |

### Device Management
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/device/register` | Register new device | Admin credentials |
| GET | `/api/device/manage` | List all devices | Admin |
| PUT | `/api/device/manage` | Update device status | Admin |
| DELETE | `/api/device/manage` | Revoke device | Admin |

### Employees
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/employees` | List all employees | Admin |
| POST | `/api/employees` | Create employee | Admin |
| GET | `/api/employees/:id` | Get employee details | Admin |
| PUT | `/api/employees/:id` | Update employee | Admin |
| DELETE | `/api/employees/:id` | Delete employee | Admin |
| POST | `/api/employees/generate-pin` | Generate unique PIN | Admin |
| GET | `/api/employees/:id/timesheet` | Get employee timesheets | Admin |

### Time Clock
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/employee/clock` | Clock in/out/break | Employee token |
| GET | `/api/employee/timesheet` | Get own timesheets | Employee token |
| POST | `/api/employee/upload/image` | Upload clock-in photo | Employee token |

### Timesheets
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/timesheets` | List timesheets (filtered) | Admin |
| PUT | `/api/timesheets` | Update timesheet entry | Admin |
| DELETE | `/api/timesheets` | Delete timesheet entry | Admin |

### Users
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/users` | List all users | Admin |
| POST | `/api/users` | Create user | Admin |
| GET | `/api/users/:id` | Get user details | Admin |
| PUT | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |

### Categories
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/categories` | List categories | Admin |
| POST | `/api/categories` | Create category | Admin |
| GET | `/api/categories/:id` | Get category | Admin |
| PUT | `/api/categories/:id` | Update category | Admin |
| DELETE | `/api/categories/:id` | Delete category | Admin |

### Dashboard
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/dashboard/stats` | Get dashboard statistics | Admin |
| GET | `/api/dashboard/hours-summary` | Get hours summary | Admin |
| GET | `/api/dashboard/inactive-employees` | Get inactive employees | Admin |

### Flags
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/flags` | List flagged entries | Admin |
| PUT | `/api/flags` | Update flag status | Admin |

### Setup
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/setup/status` | Check if admin exists | Public |
| POST | `/api/setup/create-admin` | Create initial admin | Public (one-time) |

### Utilities
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/upload/image` | Upload image to Cloudinary | Admin |
| POST | `/api/admin/cleanup/cloudinary` | Cleanup unused images | Admin |
| POST | `/api/admin/cleanup/timesheets` | Cleanup old timesheets | Admin |

---

## 🔐 Authentication & Security

### Two-Layer Authentication System

The app implements a sophisticated two-layer authentication system:

**Layer 1: Device Authentication**
- Each kiosk device must be registered by an admin
- Device receives a JWT token stored in httpOnly cookie
- Middleware validates device token on every request
- Devices can be disabled or revoked remotely
- Device activity is tracked for security auditing

**Layer 2: Employee/User Authentication**
- Employees authenticate via 4-6 digit PIN
- Admins/users authenticate via username + password
- Separate JWT tokens for employee and admin sessions
- Automatic session expiration and logout
- Idle timeout protection (30s for employees)

### Roles & Permissions

| Role | Access Level |
|---|---|
| `super_admin` | Full system access, user management, all locations |
| `admin` | Dashboard access, employee management, timesheet editing |
| `user` | Limited dashboard access, view-only permissions |
| `employee` | Clock in/out only, view own timesheets |

### Security Features

- All passwords hashed with bcrypt
- JWT tokens with expiration
- httpOnly cookies prevent XSS attacks
- CSRF protection via SameSite cookies
- Device fingerprinting and tracking
- Geofence validation for location-based access
- Automatic flagging of suspicious entries

---

## 📸 Cloudinary Integration

Images are uploaded directly from the client to Cloudinary using secure upload endpoints — no files pass through Vercel. The returned URL is stored in MongoDB.

### Used for:
- Employee profile photos (`employees.img`)
- Clock-in selfies (`timesheets.image`)

### Features:
- Automatic image optimization and compression
- Responsive image delivery
- Secure upload with validation
- Automated cleanup of unused images via cron job
- Folder organization (`timesheet/avatars`, `timesheet/clockins`)

```ts
// Upload flow
const formData = new FormData()
formData.append("file", blob, "clock.jpg")
const res = await fetch("/api/employee/upload/image", {
  method: "POST",
  body: formData,
})
const { url } = await res.json()
// url is stored in MongoDB
```

### Cleanup Strategy
- Cron job runs periodically to identify orphaned images
- Compares Cloudinary assets with database references
- Safely deletes unused images to save storage
- Configurable via `/api/cron/cleanup-cloudinary`

---

## 🎯 Face Detection & Geofencing

### Real-time Face Detection
- Uses TensorFlow.js (@vladmandic/face-api) for client-side face detection
- Detects face presence and size before capturing photo
- Provides visual feedback (corner brackets, status indicators)
- Captures photo only when face is stable and properly sized
- Falls back gracefully if face not detected (flags entry)
- No blocking — employees can always clock in

### Geofencing
- GPS-based location validation for clock-ins
- Configurable radius per location (default 100m)
- Two modes:
  - **Hard mode**: Blocks clock-in if outside geofence
  - **Soft mode**: Allows clock-in but flags for review
- Automatic location detection and assignment
- Distance calculation to nearest approved location
- Geofence violations tracked in timesheet flags

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
# MongoDB Atlas connection URI
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/timesheet?retryWrites=true&w=majority

# JWT secret for authentication (min 32 chars)
# Generate: openssl rand -hex 32
JWT_SECRET=your-secret-here

# Cloudinary credentials (from Dashboard → API Keys)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_FOLDER=timesheet

# Optional: Cron job secret for cleanup endpoints
CRON_SECRET=your-random-secret
```

### 3. Download face detection models
```bash
# Create public/models directory
mkdir -p public/models

# Download TensorFlow.js face detection models
# Visit: https://github.com/vladmandic/face-api/tree/master/model
# Download these files to public/models/:
# - tiny_face_detector_model-weights_manifest.json
# - tiny_face_detector_model-shard1
```

### 4. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 5. Initial setup
1. Visit the app — you'll see a setup dialog
2. Create your admin account (username + password)
3. Register your first device (kiosk)
4. Add employees via the dashboard
5. Employees can now clock in using their PIN

---

## 📋 Usage

### For Admins
1. Login at `/login` with your username and password
2. Access the dashboard to:
   - Manage employees (add, edit, delete)
   - View and edit timesheets
   - Review flagged entries
   - Manage devices
   - Configure categories (roles, locations, employers)
   - View analytics and reports

### For Employees
1. Visit the kiosk device (registered device)
2. Enter your 4-6 digit PIN
3. Allow camera and location permissions
4. Clock in/out or take breaks
5. Photo and location are captured automatically

---

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production
- Set all variables from `.env.example`
- Use strong JWT_SECRET (32+ characters)
- Configure MongoDB Atlas IP whitelist
- Set up Cloudinary production credentials
- Optional: Configure CRON_SECRET for cleanup jobs

---

## 📋 Roadmap & Future Features

### Completed ✅
- [x] Two-layer device authentication system
- [x] PIN-based employee time clock
- [x] Real-time face detection with TensorFlow.js
- [x] GPS geofencing with hard/soft modes
- [x] Cloudinary image management
- [x] Admin dashboard with analytics
- [x] Employee management (CRUD)
- [x] Timesheet viewing and editing
- [x] Category management system
- [x] Device management interface
- [x] Automated image cleanup
- [x] Birthday detection and celebration
- [x] Flagged entries review
- [x] PWA support
- [x] Dark mode

### In Progress 🔧
- [ ] Advanced reporting and analytics
- [ ] Bulk timesheet operations
- [ ] Export to CSV/Excel

### Planned 📋
- [ ] Shift approval workflow
- [ ] Roster builder with drag & drop
- [ ] Roster publishing and notifications
- [ ] Leave request system
- [ ] Leave balance tracking
- [ ] Email/SMS notifications
- [ ] Mobile app (React Native)
- [ ] Payroll integration
- [ ] Advanced permissions system
- [ ] Audit log and activity tracking
- [ ] Multi-language support
- [ ] Custom branding options

---

## 📄 License

MIT