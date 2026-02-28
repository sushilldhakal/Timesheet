# Location Role Matrix Component

## Overview

The `LocationRoleMatrix` component provides a visual matrix interface for managing role enablement across multiple locations. It allows administrators to:

- View all locations and roles in a matrix format
- Toggle role enablement at specific locations with a single click
- Perform bulk operations to enable roles at multiple locations
- Export the matrix data to CSV format
- See employee counts for each role at each location

## Features

### 1. Matrix View (locations × roles)
- Displays locations as rows and roles as columns
- Visual indicators for enabled/disabled roles
- Shows employee count badges for enabled roles
- Sticky headers for easy navigation
- Responsive design with horizontal scrolling

### 2. Bulk Enable/Disable Operations
- Select multiple locations using checkboxes
- Choose a role to enable across selected locations
- Bulk enable operation with a single API call
- Clear selection and cancel functionality

### 3. Export to CSV Functionality
- Export the entire matrix to a CSV file
- Includes location names, role names, and enablement status
- Shows employee counts in the export
- Automatic file download with timestamp

## Usage

### Basic Example

```tsx
import { LocationRoleMatrix } from "@/components/locations/LocationRoleMatrix"
import type { ICategory, ILocationRoleEnablement } from "@/components/locations/LocationRoleMatrix"

function MyPage() {
  const [locations, setLocations] = useState<ICategory[]>([])
  const [roles, setRoles] = useState<ICategory[]>([])
  const [enablements, setEnablements] = useState<ILocationRoleEnablement[]>([])

  const handleToggle = async (locationId: string, roleId: string) => {
    // Toggle role enablement at location
    // Make API call to enable/disable
    // Refresh data
  }

  const handleBulkEnable = async (roleId: string, locationIds: string[]) => {
    // Enable role at multiple locations
    // Make API calls
    // Refresh data
  }

  return (
    <LocationRoleMatrix
      locations={locations}
      roles={roles}
      enablements={enablements}
      onToggle={handleToggle}
      onBulkEnable={handleBulkEnable}
    />
  )
}
```

### Complete Example

See `app/(dashboard)/dashboard/admin/role-matrix/page.tsx` for a complete implementation that:
- Fetches locations, roles, and enablements from the API
- Handles toggle operations
- Handles bulk enable operations
- Refreshes data after changes
- Shows loading and error states

## Props

### `locations: ICategory[]`
Array of location objects. Each location should have:
- `_id` or `id`: Unique identifier
- `name`: Display name
- `type`: Should be "location"

### `roles: ICategory[]`
Array of role objects. Each role should have:
- `_id` or `id`: Unique identifier
- `name`: Display name
- `type`: Should be "role"
- `color` (optional): Hex color code for visual identification

### `enablements: ILocationRoleEnablement[]`
Array of role enablement records. Each enablement should have:
- `_id` or `id`: Unique identifier
- `locationId`: ID of the location
- `roleId`: ID of the role
- `effectiveFrom`: Start date (ISO string)
- `effectiveTo`: End date (ISO string or null)
- `isActive`: Boolean indicating if currently active
- `employeeCount` (optional): Number of employees assigned

### `onToggle: (locationId: string, roleId: string) => Promise<void>`
Callback function called when a cell is clicked to toggle role enablement.
- Should handle both enabling and disabling
- Should make appropriate API calls
- Should refresh data after completion
- Can throw errors to show alerts

### `onBulkEnable: (roleId: string, locationIds: string[]) => Promise<void>`
Callback function called when bulk enable is triggered.
- Receives the role ID and array of location IDs
- Should enable the role at all specified locations
- Should refresh data after completion
- Can throw errors to show alerts

## API Integration

The component expects the following API endpoints:

### Get Roles for Location
```
GET /api/locations/{locationId}/roles
```
Returns:
```json
{
  "roles": [
    {
      "roleId": "...",
      "roleName": "...",
      "roleColor": "...",
      "effectiveFrom": "...",
      "effectiveTo": null,
      "isActive": true,
      "employeeCount": 5
    }
  ]
}
```

### Enable Role at Location
```
POST /api/locations/{locationId}/roles
```
Body:
```json
{
  "roleId": "...",
  "effectiveFrom": "2024-01-01T00:00:00Z",
  "effectiveTo": null
}
```

### Disable Role at Location
```
DELETE /api/locations/{locationId}/roles/{roleId}
```

## Styling

The component uses:
- Tailwind CSS for styling
- shadcn/ui components (Card, Button, Badge, Checkbox)
- Custom color coding for enabled/disabled states
- Responsive design with sticky headers

## Accessibility

- Keyboard navigation support
- ARIA labels for interactive elements
- Clear visual indicators for state
- Descriptive button labels
- Loading states for async operations

## Performance Considerations

- Uses `useMemo` for enablement map to avoid recalculation
- Optimistic UI updates with loading states
- Efficient re-renders with proper key usage
- Handles large datasets with scrolling

## Error Handling

- Shows loading states during operations
- Displays error messages via alerts
- Prevents multiple simultaneous operations
- Graceful degradation for missing data

## Future Enhancements

- Undo/redo functionality
- Filtering and search
- Sorting by location or role
- Batch disable operations
- Date range selection for enablements
- Inline editing of effective dates
- Drag-and-drop for bulk operations


---

# Enable Role Dialog Component

## Overview

The `EnableRoleDialog` component provides a dialog interface for enabling a role at a specific location with date range selection. It includes:

- Date picker for effectiveFrom (required) and effectiveTo (optional)
- Form validation to ensure dates are valid
- Error handling for API failures
- Success confirmation animation
- Toast notifications for feedback

## Features

### 1. Date Range Selection
- Required effectiveFrom date (defaults to today)
- Optional effectiveTo date (leave empty for indefinite)
- Validation ensures effectiveTo >= effectiveFrom
- Uses SingleDayPicker component for date selection

### 2. Validation and Error Display
- Client-side validation using Zod schema
- Server-side error handling with specific error messages
- Inline form validation errors
- Toast notifications for success/error states

### 3. Success Confirmation
- Animated success screen with checkmark icon
- Auto-closes after showing success message
- Calls onSuccess callback for parent component to refresh data

## Usage

### Basic Example

```tsx
import { EnableRoleDialog } from "@/components/locations/EnableRoleDialog"
import { useState } from "react"

function MyComponent() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleSuccess = () => {
    // Refresh your data here
    console.log("Role enabled successfully!")
  }

  return (
    <>
      <button onClick={() => setDialogOpen(true)}>
        Enable Role
      </button>

      <EnableRoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        locationId="507f1f77bcf86cd799439010"
        locationName="Main Branch"
        roleId="507f1f77bcf86cd799439011"
        roleName="Barista"
        roleColor="#8B4513"
        onSuccess={handleSuccess}
      />
    </>
  )
}
```

### Integration with LocationRoleList

```tsx
import { LocationRoleList } from "@/components/locations/LocationRoleList"
import { EnableRoleDialog } from "@/components/locations/EnableRoleDialog"
import { useState } from "react"

function LocationRolesPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<{
    roleId: string
    roleName: string
    roleColor?: string
  } | null>(null)

  const handleToggle = async (roleId: string) => {
    const role = roles.find(r => r.roleId === roleId)
    if (!role) return

    if (role.isEnabled) {
      // Disable role
      await fetch(`/api/locations/${locationId}/roles/${roleId}`, {
        method: "DELETE",
      })
      refreshData()
    } else {
      // Show enable dialog
      setSelectedRole({
        roleId: role.roleId,
        roleName: role.roleName,
        roleColor: role.roleColor,
      })
      setDialogOpen(true)
    }
  }

  return (
    <>
      <LocationRoleList
        locationId={locationId}
        roles={roles}
        onToggle={handleToggle}
      />

      {selectedRole && (
        <EnableRoleDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          locationId={locationId}
          locationName={locationName}
          roleId={selectedRole.roleId}
          roleName={selectedRole.roleName}
          roleColor={selectedRole.roleColor}
          onSuccess={refreshData}
        />
      )}
    </>
  )
}
```

## Props

### `open: boolean`
Controls whether the dialog is visible.

### `onOpenChange: (open: boolean) => void`
Callback when dialog open state changes. Used to close the dialog.

### `locationId: string`
The ID of the location where the role will be enabled.

### `locationName: string`
Display name of the location (shown in the dialog).

### `roleId: string`
The ID of the role to enable.

### `roleName: string`
Display name of the role (shown in the dialog).

### `roleColor?: string`
Optional hex color code for the role (shown as a color indicator).

### `onSuccess?: () => void`
Optional callback called after successfully enabling the role. Use this to refresh your data.

## API Integration

The component makes a POST request to:
```
POST /api/locations/{locationId}/roles
```

Request body:
```json
{
  "roleId": "507f1f77bcf86cd799439011",
  "effectiveFrom": "2024-01-01T00:00:00Z",
  "effectiveTo": null
}
```

Response (success):
```json
{
  "success": true,
  "data": {
    "enablement": {
      "id": "...",
      "locationId": "...",
      "roleId": "...",
      "roleName": "Barista",
      "roleColor": "#8B4513",
      "effectiveFrom": "2024-01-01T00:00:00Z",
      "effectiveTo": null,
      "isActive": true
    }
  }
}
```

Response (error):
```json
{
  "success": false,
  "message": "Role is already enabled at this location",
  "code": "ALREADY_ENABLED"
}
```

## Error Handling

The component handles several error cases:

### Already Enabled
If the role is already enabled with overlapping dates:
- Shows error toast with title "Role Already Enabled"
- Displays the server error message

### Network Error
If the request fails due to network issues:
- Shows error toast with title "Network Error"
- Suggests trying again

### Validation Error
If the form data is invalid:
- Shows inline validation errors below form fields
- Prevents form submission until fixed

## Styling

The component uses:
- shadcn/ui Dialog component
- SingleDayPicker for date selection
- Form components with validation
- Toast notifications for feedback
- Success animation with CheckCircle2 icon
- Role color indicator badge

## Accessibility

- Keyboard navigation support
- ARIA labels for form fields
- Clear error messages
- Loading states with disabled buttons
- Focus management in dialog

## Validation Rules

1. **effectiveFrom** (required)
   - Must be a valid date
   - Defaults to today

2. **effectiveTo** (optional)
   - Must be a valid date or null
   - If provided, must be >= effectiveFrom
   - Leave empty for indefinite enablement

## Future Enhancements

- Bulk enable multiple roles at once
- Copy dates from another role
- Preset date ranges (e.g., "This Quarter", "This Year")
- Conflict detection before submission
- Preview of affected employees
