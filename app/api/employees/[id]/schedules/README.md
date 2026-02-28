# Schedule API Endpoints

This directory contains API endpoints for managing employee schedules.

## Endpoints

### GET /api/employees/:id/schedules
Get all schedules for an employee, or filter by date.

**Query Parameters:**
- `date` (optional): ISO 8601 date string to filter active schedules for a specific date

**Response:**
```json
{
  "schedules": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "dayOfWeek": [1, 2, 3, 4, 5],
      "startTime": "2024-01-01T09:00:00.000Z",
      "endTime": "2024-01-01T17:00:00.000Z",
      "locationId": "507f1f77bcf86cd799439012",
      "roleId": "507f1f77bcf86cd799439013",
      "effectiveFrom": "2024-01-01T00:00:00.000Z",
      "effectiveTo": null
    }
  ]
}
```

### POST /api/employees/:id/schedules
Create a new schedule for an employee.

**Request Body:**
```json
{
  "dayOfWeek": [1, 2, 3, 4, 5],
  "startTime": "2024-01-01T09:00:00.000Z",
  "endTime": "2024-01-01T17:00:00.000Z",
  "locationId": "507f1f77bcf86cd799439012",
  "roleId": "507f1f77bcf86cd799439013",
  "effectiveFrom": "2024-01-01T00:00:00.000Z",
  "effectiveTo": null
}
```

**Response:**
```json
{
  "schedule": {
    "_id": "507f1f77bcf86cd799439011",
    "dayOfWeek": [1, 2, 3, 4, 5],
    "startTime": "2024-01-01T09:00:00.000Z",
    "endTime": "2024-01-01T17:00:00.000Z",
    "locationId": "507f1f77bcf86cd799439012",
    "roleId": "507f1f77bcf86cd799439013",
    "effectiveFrom": "2024-01-01T00:00:00.000Z",
    "effectiveTo": null
  }
}
```

### PUT /api/employees/:id/schedules/:scheduleId
Update an existing schedule.

**Request Body:** (all fields optional)
```json
{
  "dayOfWeek": [1, 2, 3],
  "startTime": "2024-01-01T10:00:00.000Z",
  "endTime": "2024-01-01T18:00:00.000Z"
}
```

**Response:**
```json
{
  "schedule": {
    "_id": "507f1f77bcf86cd799439011",
    "dayOfWeek": [1, 2, 3],
    "startTime": "2024-01-01T10:00:00.000Z",
    "endTime": "2024-01-01T18:00:00.000Z",
    "locationId": "507f1f77bcf86cd799439012",
    "roleId": "507f1f77bcf86cd799439013",
    "effectiveFrom": "2024-01-01T00:00:00.000Z",
    "effectiveTo": null
  }
}
```

### DELETE /api/employees/:id/schedules/:scheduleId
Delete a schedule.

**Response:**
```json
{
  "success": true
}
```

## Error Responses

All endpoints return appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid input data or validation errors
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Employee or schedule not found
- `500 Internal Server Error`: Server-side errors

**Error Response Format:**
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "issues": {
    "fieldName": ["validation error messages"]
  }
}
```

## Validation Rules

### Schedule Data
- `dayOfWeek`: Array of integers 0-6 (0=Sunday, 6=Saturday), at least one day required
- `startTime`: ISO 8601 datetime string, must be before endTime
- `endTime`: ISO 8601 datetime string, must be after startTime
- `locationId`: Valid MongoDB ObjectId referencing a location category
- `roleId`: Valid MongoDB ObjectId referencing a role category
- `effectiveFrom`: ISO 8601 datetime string, required
- `effectiveTo`: ISO 8601 datetime string or null, must be after effectiveFrom if provided

## Authentication

All endpoints require authentication via the `getAuthWithUserLocations()` middleware. Users can only access schedules for employees within their authorized locations.
