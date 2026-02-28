# Analytics API Endpoints

This directory contains API endpoints for variance analytics, no-show detection, punctuality tracking, and reporting.

## Endpoints

### GET /api/analytics/variance/:shiftId

Calculate variance between scheduled and actual worked hours for a specific shift.

**Parameters:**
- `shiftId` (path parameter): MongoDB ObjectId of the shift

**Response:**
```json
{
  "scheduledHours": 8.0,
  "actualHours": 8.5,
  "variance": 0.5,
  "timesheetCount": 1
}
```

**Error Responses:**
- `400`: Invalid shift ID format
- `404`: Shift not found
- `500`: Calculation failed

---

### GET /api/analytics/no-shows/:weekId

Detect no-show shifts for a specific week (published rosters only).

**Parameters:**
- `weekId` (path parameter): ISO week identifier (YYYY-Www format, e.g., "2024-W15")

**Response:**
```json
{
  "noShows": [
    {
      "_id": "...",
      "employeeId": "...",
      "date": "2024-04-15T00:00:00.000Z",
      "startTime": "2024-04-15T09:00:00.000Z",
      "endTime": "2024-04-15T17:00:00.000Z",
      "locationId": "...",
      "roleId": "...",
      "sourceScheduleId": "...",
      "estimatedCost": 240.0,
      "notes": ""
    }
  ],
  "count": 1
}
```

**Error Responses:**
- `400`: Invalid week ID format
- `404`: Roster not found
- `500`: Detection failed

---

### GET /api/analytics/punctuality/:shiftId

Calculate punctuality for a specific shift (early/late/on-time).

**Parameters:**
- `shiftId` (path parameter): MongoDB ObjectId of the shift

**Response:**
```json
{
  "status": "late",
  "minutes": 15
}
```

**Status Values:**
- `"early"`: Clocked in before scheduled start time
- `"late"`: Clocked in after scheduled start time
- `"on-time"`: Clocked in exactly at scheduled start time

**Error Responses:**
- `400`: Invalid shift ID format
- `404`: Shift not found or no timesheet found
- `500`: Calculation failed

---

### GET /api/analytics/weekly-report/:weekId

Generate comprehensive weekly report for a specific week.

**Parameters:**
- `weekId` (path parameter): ISO week identifier (YYYY-Www format, e.g., "2024-W15")

**Response:**
```json
{
  "report": {
    "weekId": "2024-W15",
    "status": "published",
    "totalShifts": 25,
    "totalScheduledHours": 200.0,
    "totalActualHours": 198.5,
    "totalVariance": -1.5,
    "totalEstimatedCost": 6000.0,
    "totalActualCost": 5955.0,
    "costVariance": -45.0,
    "noShowCount": 2,
    "shifts": [
      {
        "shiftId": "...",
        "employeeId": "...",
        "date": "2024-04-15T00:00:00.000Z",
        "scheduledHours": 8.0,
        "actualHours": 8.5,
        "variance": 0.5,
        "estimatedCost": 240.0,
        "actualCost": 255.0,
        "punctuality": {
          "status": "late",
          "minutes": 10
        }
      }
    ]
  }
}
```

**Error Responses:**
- `400`: Invalid week ID format
- `404`: Roster not found
- `500`: Report generation failed

---

### GET /api/analytics/employee-report/:employeeId

Generate employee-specific report for a date range.

**Parameters:**
- `employeeId` (path parameter): MongoDB ObjectId of the employee
- `startDate` (query parameter): Start date in YYYY-MM-DD format
- `endDate` (query parameter): End date in YYYY-MM-DD format

**Example:**
```
GET /api/analytics/employee-report/507f1f77bcf86cd799439011?startDate=2024-04-01&endDate=2024-04-30
```

**Response:**
```json
{
  "report": {
    "employeeId": "507f1f77bcf86cd799439011",
    "startDate": "2024-04-01",
    "endDate": "2024-04-30",
    "totalShifts": 20,
    "totalScheduledHours": 160.0,
    "totalActualHours": 162.5,
    "totalVariance": 2.5,
    "totalEstimatedCost": 4800.0,
    "totalActualCost": 4875.0,
    "costVariance": 75.0,
    "noShowCount": 1,
    "earlyCount": 5,
    "lateCount": 3,
    "onTimeCount": 11,
    "shifts": [
      {
        "shiftId": "...",
        "weekId": "2024-W14",
        "date": "2024-04-01T00:00:00.000Z",
        "scheduledHours": 8.0,
        "actualHours": 8.25,
        "variance": 0.25,
        "estimatedCost": 240.0,
        "actualCost": 247.5,
        "punctuality": {
          "status": "on-time",
          "minutes": 0
        }
      }
    ]
  }
}
```

**Error Responses:**
- `400`: Invalid employee ID format, missing query parameters, or invalid date format/range
- `500`: Report generation failed

---

## Authentication

All endpoints require authentication. Requests must include valid authentication credentials.

## Validation

- **Week ID Format**: Must match `YYYY-Www` pattern (e.g., "2024-W15")
- **ObjectId Format**: Must be valid MongoDB ObjectId (24 hex characters)
- **Date Format**: Must be `YYYY-MM-DD` format
- **Date Range**: startDate must be before or equal to endDate

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": "Additional details (development mode only)"
}
```

## Requirements Satisfied

These endpoints satisfy the following requirements from the specification:

- **Requirements 5.1-5.6**: Variance calculation
- **Requirements 6.1-6.4**: No-show detection
- **Requirements 7.1-7.5**: Punctuality tracking
- **Requirements 8.1-8.4**: Payroll processing support (via variance and reports)

## Related Components

- **VarianceAnalyticsService** (`lib/managers/variance-analytics-service.ts`): Business logic for all analytics operations
- **Roster Schema** (`lib/db/schemas/roster.ts`): Roster and shift data models
- **Timesheet Schema** (`lib/db/schemas/timesheet.ts`): Timesheet data model with shift references
