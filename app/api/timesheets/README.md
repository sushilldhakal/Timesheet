# Timesheet API Endpoints

This directory contains API endpoints for managing timesheets with roster shift linking capabilities.

## Endpoints

### GET /api/timesheets

Get aggregated timesheets with filters for dashboard display.

**Query Parameters:**
- `startDate` (optional): Start date in YYYY-MM-DD format (defaults to start of current week)
- `endDate` (optional): End date in YYYY-MM-DD format (defaults to end of current week)
- `employeeId` (optional, multiple): Filter by employee IDs
- `employer` (optional, multiple): Filter by employer
- `location` (optional, multiple): Filter by location
- `limit` (optional): Number of results per page (default: 50, max: 500)
- `offset` (optional): Pagination offset (default: 0)
- `sortBy` (optional): Sort column (date, name, comment, employer, role, location, clockIn, breakIn, breakOut, clockOut, breakHours, totalHours)
- `order` (optional): Sort order (asc, desc) - default: asc

**Response:**
```json
{
  "timesheets": [
    {
      "date": "23-02-2026",
      "employeeId": "...",
      "name": "John Doe",
      "pin": "1234",
      "comment": "",
      "employer": "Company A",
      "role": "Manager",
      "location": "Office",
      "clockIn": "09:00",
      "breakIn": "12:00",
      "breakOut": "13:00",
      "clockOut": "17:00",
      "breakMinutes": 60,
      "breakHours": "1h",
      "totalMinutes": 420,
      "totalHours": "7h",
      "clockInDeviceId": "device-001",
      "clockInDeviceLocation": "Main Office"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0,
  "totalWorkingMinutes": 42000,
  "totalBreakMinutes": 6000,
  "totalWorkingHours": "700h",
  "totalBreakHours": "100h"
}
```

---

### POST /api/timesheets

Create a new timesheet entry with automatic shift matching.

**Request Body:**
```json
{
  "pin": "1234",
  "type": "in",
  "date": "2026-02-23",
  "time": "09:00",
  "image": "https://...",
  "lat": "40.7128",
  "lng": "-74.0060",
  "where": "40.7128,-74.0060",
  "flag": false,
  "working": "",
  "source": "insert",
  "deviceId": "device-001",
  "deviceLocation": "Main Office",
  "breakSource": "punched",
  "breakRuleRef": "",
  "scheduleShiftId": "optional-manual-shift-id"
}
```

**Required Fields:**
- `pin`: Employee pin
- `type`: One of: in, out, break, endBreak
- `date`: Date in YYYY-MM-DD format

**Optional Fields:**
- `time`: Time in HH:mm format or ISO string
- `image`: Image URL
- `lat`, `lng`: GPS coordinates
- `where`: Location string
- `flag`: Flag for review
- `working`: Working status
- `source`: insert or update
- `deviceId`: Device identifier
- `deviceLocation`: Device location name
- `breakSource`: punched, auto_rule, or none
- `breakRuleRef`: Break rule reference
- `scheduleShiftId`: Manual shift ID override (if not provided, automatic matching is attempted)

**Response:**
```json
{
  "success": true,
  "timesheet": {
    "_id": "...",
    "pin": "1234",
    "type": "in",
    "date": "2026-02-23",
    "time": "09:00",
    "scheduleShiftId": "...",
    ...
  },
  "shiftMatched": true
}
```

**Automatic Shift Matching:**
When creating a timesheet with `type: "in"` and no explicit `scheduleShiftId`, the system automatically attempts to match the timesheet to a roster shift based on:
- Employee pin
- Date
- Time proximity to shift start time

---

### PUT /api/timesheets/:id/link-shift

Manually link a timesheet to a roster shift.

**URL Parameters:**
- `id`: Timesheet ID

**Request Body:**
```json
{
  "shiftId": "shift-object-id"
}
```

**Response:**
```json
{
  "success": true,
  "timesheet": {
    "_id": "...",
    "scheduleShiftId": "shift-object-id",
    ...
  }
}
```

**Error Responses:**
- `400`: Invalid timesheet ID or shift ID format
- `404`: Timesheet not found
- `400`: Invalid shift reference (shift doesn't exist)

---

### GET /api/timesheets/by-shift/:shiftId

Get all timesheets linked to a specific roster shift.

**URL Parameters:**
- `shiftId`: Roster shift ID

**Response:**
```json
{
  "success": true,
  "timesheets": [
    {
      "_id": "...",
      "pin": "1234",
      "type": "in",
      "date": "2026-02-23",
      "time": "09:00",
      "scheduleShiftId": "shift-id",
      ...
    },
    {
      "_id": "...",
      "pin": "1234",
      "type": "out",
      "date": "2026-02-23",
      "time": "17:00",
      "scheduleShiftId": "shift-id",
      ...
    }
  ],
  "count": 2
}
```

**Notes:**
- Multiple timesheets can link to the same shift (e.g., split shifts, breaks)
- Returns all timesheets sorted by date and time

**Error Responses:**
- `400`: Invalid shift ID format
- `404`: Shift not found

---

### GET /api/timesheets/payroll

Get timesheets for payroll processing within a date range.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `pin` (optional): Filter by employee pin
- `type` (optional): Filter by type (in, out, break, endBreak)
- `sortBy` (optional): Sort field (date, pin, time) - default: date
- `sortOrder` (optional): Sort order (asc, desc) - default: asc
- `format` (optional): Response format (list, pairs) - default: list

**Response Format: list**
```json
{
  "success": true,
  "format": "list",
  "startDate": "2026-02-17",
  "endDate": "2026-02-23",
  "filters": {
    "pin": null,
    "type": null
  },
  "sorting": {
    "sortBy": "date",
    "sortOrder": "asc"
  },
  "timesheets": [
    {
      "_id": "...",
      "pin": "1234",
      "type": "in",
      "date": "2026-02-23",
      "time": "09:00",
      "scheduleShiftId": "...",
      ...
    }
  ],
  "count": 100
}
```

**Response Format: pairs**
```json
{
  "success": true,
  "format": "pairs",
  "startDate": "2026-02-17",
  "endDate": "2026-02-23",
  "pairs": [
    {
      "pin": "1234",
      "date": "2026-02-23",
      "clockIn": {
        "_id": "...",
        "type": "in",
        "time": "09:00",
        ...
      },
      "clockOut": {
        "_id": "...",
        "type": "out",
        "time": "17:00",
        ...
      },
      "scheduleShiftId": "..."
    }
  ],
  "count": 50
}
```

**Error Responses:**
- `400`: Missing or invalid date parameters
- `400`: Invalid date format (must be YYYY-MM-DD)
- `400`: startDate must be before or equal to endDate
- `400`: Invalid sortBy or sortOrder values

---

## Authentication

All endpoints require authentication via the `getAuthWithUserLocations()` helper, which validates user session and returns location-based access control context.

## Data Models

### Timesheet Schema

```typescript
interface ITimesheet {
  pin: string
  type: string // in, out, break, endBreak
  date: string // YYYY-MM-DD format
  time?: string // HH:mm format or ISO string
  image?: string
  lat?: string
  lng?: string
  where?: string
  flag?: boolean
  working?: string
  source?: "insert" | "update"
  deviceId?: string
  deviceLocation?: string
  breakSource?: "punched" | "auto_rule" | "none"
  breakRuleRef?: string
  scheduleShiftId?: ObjectId // Reference to roster shift
}
```

## Related Components

- **TimesheetManager** (`lib/managers/timesheet-manager.ts`): Business logic for timesheet operations
- **Roster Schema** (`lib/db/schemas/roster.ts`): Roster and shift data models
- **Employee Schema** (`lib/db/schemas/employee.ts`): Employee data model

## Requirements Satisfied

This API implementation satisfies the following requirements from the Schedule and Roster Management specification:

- **Requirement 4.1-4.5**: Link timesheets to roster shifts
- **Requirement 8.1-8.4**: Support payroll processing with date range queries

## Testing

To test these endpoints, you can use tools like:
- Postman
- cURL
- Thunder Client (VS Code extension)

Example cURL commands:

```bash
# Create timesheet with automatic shift matching
curl -X POST http://localhost:3000/api/timesheets \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234",
    "type": "in",
    "date": "2026-02-23",
    "time": "09:00"
  }'

# Link timesheet to shift
curl -X PUT http://localhost:3000/api/timesheets/TIMESHEET_ID/link-shift \
  -H "Content-Type: application/json" \
  -d '{
    "shiftId": "SHIFT_ID"
  }'

# Get timesheets for shift
curl http://localhost:3000/api/timesheets/by-shift/SHIFT_ID

# Get timesheets for payroll (list format)
curl "http://localhost:3000/api/timesheets/payroll?startDate=2026-02-17&endDate=2026-02-23"

# Get timesheets for payroll (pairs format)
curl "http://localhost:3000/api/timesheets/payroll?startDate=2026-02-17&endDate=2026-02-23&format=pairs"
```
