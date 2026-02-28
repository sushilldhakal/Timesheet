# Location Roles Management Page

## Overview
This page allows administrators to manage which roles are enabled at a specific location.

## Features
- **View all roles**: Displays all available roles in the system
- **Enable/Disable roles**: Toggle switches to enable or disable roles for the location
- **Employee count**: Shows how many employees are assigned to each role at this location
- **Effective dates**: Displays when each role was enabled and when it expires (if applicable)
- **Visual indicators**: Color-coded role badges and status indicators

## Access
Navigate to: `/dashboard/locations/[locationId]/roles`

Replace `[locationId]` with the actual MongoDB ObjectId of the location.

## Usage
1. The page loads all available roles from the system
2. Roles that are currently enabled at the location show:
   - A green "Enabled" badge
   - The effective date range
   - The number of employees assigned to that role
3. Toggle the switch to enable or disable a role
4. When enabling a role, it becomes effective immediately
5. When disabling a role, it sets the effectiveTo date to now

## API Endpoints Used
- `GET /api/categories/{locationId}` - Fetch location details
- `GET /api/categories?type=role` - Fetch all available roles
- `GET /api/locations/{locationId}/roles` - Fetch enabled roles for the location
- `POST /api/locations/{locationId}/roles` - Enable a role at the location
- `DELETE /api/locations/{locationId}/roles/{roleId}` - Disable a role at the location

## Future Enhancements
- Add a "Manage Roles" button in the Categories table for locations
- Add date picker for custom effective dates when enabling roles
- Add confirmation dialog when disabling roles with active employees
- Add bulk enable/disable operations
