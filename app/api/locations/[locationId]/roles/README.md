# Location Role Enablement APIs

These APIs manage which roles are enabled at specific locations.

## Endpoints

### GET /api/locations/[locationId]/roles

Get all roles enabled at a location.

**Query Parameters:**
- `date` (optional): ISO date string to check enablement on a specific date (default: today)
- `includeInactive` (optional): Include expired enablements (default: false)

**Response:**
```json
{
  "roles": [
    {
      "roleId": "507f1f77bcf86cd799439011",
      "roleName": "Barista",
      "roleColor": "#8B4513",
      "effectiveFrom": "2024-01-01T00:00:00Z",
      "effectiveTo": null,
      "isActive": true,
      "employeeCount": 5
    }
  ]
}
```

### POST /api/locations/[locationId]/roles

Enable a role at a location.

**Request Body:**
```json
{
  "roleId": "507f1f77bcf86cd799439011",
  "effectiveFrom": "2024-01-01T00:00:00Z",
  "effectiveTo": null
}
```

**Response:**
```json
{
  "enablement": {
    "id": "507f1f77bcf86cd799439012",
    "locationId": "507f1f77bcf86cd799439010",
    "roleId": "507f1f77bcf86cd799439011",
    "roleName": "Barista",
    "roleColor": "#8B4513",
    "effectiveFrom": "2024-01-01T00:00:00Z",
    "effectiveTo": null,
    "isActive": true
  }
}
```

### DELETE /api/locations/[locationId]/roles/[roleId]

Disable a role at a location (sets effectiveTo to current time).

**Response:**
```json
{
  "success": true,
  "message": "Role disabled at location"
}
```

### PATCH /api/locations/[locationId]/roles/[roleId]

Update role enablement dates.

**Request Body:**
```json
{
  "effectiveFrom": "2024-01-01T00:00:00Z",
  "effectiveTo": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "enablement": {
    "id": "507f1f77bcf86cd799439012",
    "locationId": "507f1f77bcf86cd799439010",
    "roleId": "507f1f77bcf86cd799439011",
    "roleName": "Barista",
    "roleColor": "#8B4513",
    "effectiveFrom": "2024-01-01T00:00:00Z",
    "effectiveTo": "2024-12-31T23:59:59Z",
    "isActive": true
  }
}
```

## Error Responses

All endpoints return standard error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid location ID"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "error": "Location not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch enabled roles"
}
```

## Business Logic

- Role enablement is time-bound with `effectiveFrom` and `effectiveTo` dates
- Setting `effectiveTo` to `null` means the enablement is indefinite
- Overlapping enablements for the same role at the same location are not allowed
- Disabling a role sets `effectiveTo` to the current time
- The `employeeCount` shows how many employees are currently assigned to that role at the location
