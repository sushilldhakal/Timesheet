import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { 
  loginSchema, 
  loginResponseSchema, 
  errorResponseSchema,
  successResponseSchema,
  meResponseSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setupPasswordSchema,
  tokenVerificationResponseSchema,
  resetPasswordResponseSchema,
  setupTokenVerificationResponseSchema,
  setupPasswordResponseSchema
} from '../validations/auth';
import { 
  employeeCreateSchema,
  employeeQuerySchema,
  employeesListResponseSchema,
  employeeCreateResponseSchema
} from '../validations/employee';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  categoryQuerySchema,
  categoriesListResponseSchema,
  categoryCreateResponseSchema,
  categoryResponseSchema,
  categoryIdParamSchema
} from '../validations/category';
import {
  locationIdParamSchema,
  enableRoleSchema,
  updateEnablementSchema,
  roleEnablementQuerySchema,
  locationRolesResponseSchema,
  roleEnablementResponseSchema,
  locationRoleParamsSchema
} from '../validations/location';
import {
  createRosterSchema,
  weekIdParamSchema,
  addShiftSchema,
  createRosterResponseSchema,
  rosterResponseSchema,
  shiftCreateResponseSchema
} from '../validations/roster';
import {
  templateQuerySchema,
  templateCreateSchema,
  templatesListResponseSchema,
  templateCreateResponseSchema
} from '../validations/schedule';
import {
  timesheetDashboardQuerySchema,
  timesheetPostSchema,
  timesheetsDashboardResponseSchema,
  timesheetCreateResponseSchema
} from '../validations/timesheet';
import {
  roleAvailabilityQuerySchema,
  rolesAvailabilityResponseSchema
} from '../validations/role';
import {
  calendarEventsQuerySchema,
  calendarEventCreateSchema,
  calendarEventsResponseSchema,
  calendarEventCreateResponseSchema
} from '../validations/calendar';
import {
  awardQuerySchema,
  awardCreateSchema,
  awardUpdateSchema,
  awardIdParamSchema,
  awardsListResponseSchema,
  awardCreateResponseSchema,
  singleAwardResponseSchema,
  awardResponseSchema
} from '../validations/award';
import {
  deviceActivateSchema,
  deviceCheckSchema,
  deviceActivateResponseSchema,
  deviceCheckResponseSchema
} from '../validations/device';
import {
  userCreateSchema,
  usersListResponseSchema,
  userCreateResponseSchema,
  adminCreateSchema
} from '../validations/user';
import {
  setupStatusResponseSchema,
  adminCreateResponseSchema
} from '../validations/setup';
import {
  activityLogQuerySchema,
  activityLogCreateSchema,
  activityLogsResponseSchema,
  activityLogCreateResponseSchema,
  mailSettingsUpdateSchema,
  mailSettingsResponseSchema,
  mailTestSchema,
  mailTestResponseSchema,
  storageSettingsUpdateSchema,
  storageSettingsResponseSchema,
  storageSettingsCreateResponseSchema,
  storageStatsResponseSchema,
  cleanupRequestSchema,
  timesheetsCleanupResponseSchema
} from '../validations/admin';
import {
  analyticsEmployeeIdParamSchema,
  analyticsWeekIdParamSchema,
  analyticsShiftIdParamSchema,
  employeeReportQuerySchema,
  analyticsReportResponseSchema,
  noShowsResponseSchema,
  punctualityResponseSchema,
  varianceResponseSchema
} from '../validations/analytics';
import {
  dashboardLocationIdParamSchema,
  dashboardRoleIdParamSchema,
  dashboardLocationRoleParamsSchema,
  hoursSummaryQuerySchema,
  dashboardStatsQuerySchema,
  dashboardDateQuerySchema,
  hoursSummaryResponseSchema,
  inactiveEmployeesResponseSchema,
  dashboardStatsResponseSchema,
  userStatsResponseSchema,
  roleStatsResponseSchema,
  locationStatsResponseSchema,
  locationRoleStatsResponseSchema
} from '../validations/dashboard';
import {
  absenceIdParamSchema,
  approveAbsenceSchema,
  affectedShiftsResponseSchema,
  approveAbsenceResponseSchema
} from '../validations/absences';
import {
  shiftSwapIdParamSchema,
  shiftSwapQuerySchema,
  createShiftSwapSchema,
  approveShiftSwapSchema,
  denyShiftSwapSchema,
  acceptShiftSwapSchema,
  shiftSwapRequestsResponseSchema,
  shiftSwapRequestResponseSchema
} from '../validations/shift-swaps';
import {
  flagsQuerySchema,
  flagsResponseSchema
} from '../validations/flags';
import {
  employeeIdParamSchema,
  faceProfileCreateSchema,
  faceProfileUpdateSchema,
  faceProfilesQuerySchema,
  faceProfilesListResponseSchema,
  faceProfileResponseSchema,
  faceProfileCreateResponseSchema
} from '../validations/face-profiles';
import {
  buddyPunchAlertIdParamSchema,
  buddyPunchAlertsQuerySchema,
  buddyPunchAlertCreateSchema,
  buddyPunchAlertUpdateSchema,
  buddyPunchAlertsListResponseSchema,
  buddyPunchAlertResponseSchema,
  buddyPunchAlertCreateResponseSchema,
  buddyPunchAlertUpdateResponseSchema
} from '../validations/buddy-punch-alerts';
import {
  imageProxyQuerySchema,
  imageProxyErrorResponseSchema
} from '../validations/image';
import {
  imageUploadResponseSchema
} from '../validations/upload';
import {
  cronSecretQuerySchema,
  cloudinaryCleanupResponseSchema
} from '../validations/cron';
import {
  publicLocationsResponseSchema
} from '../validations/public';
import {
  deviceCreateSchema,
  deviceUpdateSchema,
  deviceDeleteSchema,
  deviceCreateResponseSchema,
  devicesListResponseSchema,
  deviceUpdateResponseSchema,
  deviceDeleteResponseSchema
} from '../validations/device-manage';
import {
  deviceRegisterSchema,
  deviceRegisterResponseSchema
} from '../validations/device-register';
import {
  employeeIdParamSchema as employeeDetailIdParamSchema,
  roleAssignmentQuerySchema,
  roleAssignmentCreateSchema,
  roleAssignmentsListResponseSchema,
  roleAssignmentCreateResponseSchema,
  roleAssignmentUpdateSchema,
  roleAssignmentUpdateResponseSchema,
  roleAssignmentDeleteResponseSchema
} from '../validations/employee-roles';
import {
  scheduleQuerySchema,
  scheduleCreateSchema,
  scheduleUpdateSchema,
  schedulesListResponseSchema,
  scheduleCreateResponseSchema,
  scheduleUpdateResponseSchema,
  scheduleDeleteResponseSchema,
  scheduleIdParamSchema
} from '../validations/employee-schedules';
import {
  timesheetQuerySchema,
  timesheetUpdateSchema,
  timesheetListResponseSchema,
  timesheetUpdateResponseSchema as employeeTimesheetUpdateResponseSchema
} from '../validations/employee-timesheet';

async function generateOpenAPISpec() {
  try {
    // Manually define routes to avoid DB connection issues during generation
    const routes = [
      // Auth routes
      {
        path: '/api/auth/login',
        method: 'post',
        summary: 'User login',
        description: 'Authenticate user with username and password',
        tags: ['Auth'],
        security: undefined,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: loginSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: loginResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/auth/logout',
        method: 'post',
        summary: 'User logout',
        description: 'Clear authentication cookie and log out user',
        tags: ['Auth'],
        security: [{ adminAuth: [] }],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: successResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/auth/me',
        method: 'get',
        summary: 'Get current user',
        description: 'Get current authenticated user information',
        tags: ['Auth'],
        security: [{ adminAuth: [] }],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: meResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/auth/change-password',
        method: 'post',
        summary: 'Change password',
        description: 'Change password for authenticated admin or employee user. Supports both admin authentication (admin_token cookie) and employee authentication (employee_token cookie).',
        tags: ['Auth'],
        security: undefined, // Handles both adminAuth and employeeAuth internally
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: changePasswordSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: successResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/auth/forgot-password',
        method: 'post',
        summary: 'Forgot password',
        description: 'Send password reset email to user',
        tags: ['Auth'],
        security: undefined,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: forgotPasswordSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: successResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/auth/reset-password',
        method: 'get',
        summary: 'Verify reset token',
        description: 'Verify password reset token validity',
        tags: ['Auth'],
        security: undefined,
        parameters: [
          {
            name: 'token',
            in: 'query',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: tokenVerificationResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/auth/reset-password',
        method: 'post',
        summary: 'Reset password',
        description: 'Reset password using valid token',
        tags: ['Auth'],
        security: undefined,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: resetPasswordSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: resetPasswordResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/auth/setup-password',
        method: 'get',
        summary: 'Verify setup token',
        description: 'Verify password setup token validity for new employees',
        tags: ['Auth'],
        security: undefined,
        parameters: [
          {
            name: 'token',
            in: 'query',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: setupTokenVerificationResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/auth/setup-password',
        method: 'post',
        summary: 'Setup password',
        description: 'Set initial password for new employee using setup token',
        tags: ['Auth'],
        security: undefined,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: setupPasswordSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: setupPasswordResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Employees routes
      {
        path: '/api/employees',
        method: 'get',
        summary: 'List employees',
        description: 'Get a paginated list of employees with optional search and filtering',
        tags: ['Employees'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search term for employee name, pin, email, phone, role, employer, or location'
          },
          {
            name: 'location',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by location (comma-separated for multiple)'
          },
          {
            name: 'role',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by role (comma-separated for multiple)'
          },
          {
            name: 'employer',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by employer (comma-separated for multiple)'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 1000, default: 50 },
            description: 'Number of employees to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', minimum: 0, default: 0 },
            description: 'Number of employees to skip'
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: { type: 'string', default: 'name' },
            description: 'Field to sort by'
          },
          {
            name: 'order',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
            description: 'Sort order'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: employeesListResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/employees',
        method: 'post',
        summary: 'Create employee',
        description: 'Create a new employee with optional role assignments and email setup',
        tags: ['Employees'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: employeeCreateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: employeeCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          409: {
            description: 'Response 409',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Categories routes
      {
        path: '/api/categories',
        method: 'get',
        summary: 'List categories by type',
        description: 'Get all categories, optionally filtered by type (role, location, employer)',
        tags: ['Categories'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['role', 'location', 'employer'] },
            description: 'Filter categories by type'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: categoriesListResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/categories',
        method: 'post',
        summary: 'Create category',
        description: 'Create a new category (role, location, or employer)',
        tags: ['Categories'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: categoryCreateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: categoryCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          409: {
            description: 'Response 409',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/categories/{id}',
        method: 'get',
        summary: 'Get single category',
        description: 'Get a category by ID',
        tags: ['Categories'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Category ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    category: categoryResponseSchema
                  }
                }
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/categories/{id}',
        method: 'patch',
        summary: 'Update category',
        description: 'Update a category by ID',
        tags: ['Categories'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Category ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: categoryUpdateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    category: categoryResponseSchema
                  }
                }
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          409: {
            description: 'Response 409',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/categories/{id}',
        method: 'delete',
        summary: 'Delete category',
        description: 'Delete a category by ID',
        tags: ['Categories'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Category ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: successResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Location routes
      {
        path: '/api/locations/{locationId}/roles',
        method: 'get',
        summary: 'Get all roles enabled at a location',
        description: 'Get all roles enabled at a location with optional date filtering and employee counts',
        tags: ['Locations'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'locationId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Location ID'
          },
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Date to check (default: today)'
          },
          {
            name: 'includeInactive',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Include expired enablements'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: locationRolesResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          503: {
            description: 'Response 503',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/locations/{locationId}/roles',
        method: 'post',
        summary: 'Enable a role at a location',
        description: 'Enable a role at a location with optional effective date range',
        tags: ['Locations'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'locationId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Location ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: enableRoleSchema
            }
          }
        },
        responses: {
          201: {
            description: 'Response 201',
            content: {
              'application/json': {
                schema: roleEnablementResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          503: {
            description: 'Response 503',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/locations/{locationId}/roles/{roleId}',
        method: 'delete',
        summary: 'Disable a role at a location',
        description: 'Disable a role at a location (sets effectiveTo to now)',
        tags: ['Locations'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'locationId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Location ID'
          },
          {
            name: 'roleId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Role ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: successResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          503: {
            description: 'Response 503',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/locations/{locationId}/roles/{roleId}',
        method: 'patch',
        summary: 'Update role enablement dates',
        description: 'Update the effective date range for a role enablement at a location',
        tags: ['Locations'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'locationId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Location ID'
          },
          {
            name: 'roleId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Role ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: updateEnablementSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: roleEnablementResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          503: {
            description: 'Response 503',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Roster routes
      {
        path: '/api/rosters',
        method: 'post',
        summary: 'Create a new roster',
        description: 'Create a new roster for a specific week with optional auto-population from schedules',
        tags: ['Rosters'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: createRosterSchema
            }
          }
        },
        responses: {
          201: {
            description: 'Response 201',
            content: {
              'application/json': {
                schema: createRosterResponseSchema
              }
            }
          },
          207: {
            description: 'Response 207',
            content: {
              'application/json': {
                schema: createRosterResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/rosters/{weekId}',
        method: 'get',
        summary: 'Get roster for a specific week',
        description: 'Get roster details and all shifts for a specific week',
        tags: ['Rosters'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'weekId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
            description: 'Week ID in format YYYY-Www'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    roster: rosterResponseSchema
                  }
                }
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/rosters/{weekId}',
        method: 'delete',
        summary: 'Delete a roster',
        description: 'Delete a roster and all its shifts (only if not published)',
        tags: ['Rosters'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'weekId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
            description: 'Week ID in format YYYY-Www'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: successResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/rosters/{weekId}/shifts',
        method: 'post',
        summary: 'Add a shift to a roster',
        description: 'Add a new shift to a roster with validation',
        tags: ['Rosters'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'weekId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
            description: 'Week ID in format YYYY-Www'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: addShiftSchema
            }
          }
        },
        responses: {
          201: {
            description: 'Response 201',
            content: {
              'application/json': {
                schema: shiftCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Schedule routes
      {
        path: '/api/schedules/templates',
        method: 'get',
        summary: 'List role templates',
        description: 'List all role templates for an organization',
        tags: ['Schedules'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'organizationId',
            in: 'query',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Organization ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: templatesListResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/schedules/templates',
        method: 'post',
        summary: 'Create role template',
        description: 'Create a new role template with shift patterns',
        tags: ['Schedules'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: templateCreateSchema
            }
          }
        },
        responses: {
          201: {
            description: 'Response 201',
            content: {
              'application/json': {
                schema: templateCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Timesheet routes
      {
        path: '/api/timesheets',
        method: 'get',
        summary: 'Get aggregated timesheets',
        description: 'Get aggregated timesheets with filtering, sorting, and pagination',
        tags: ['Timesheets'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Start date for filtering'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'End date for filtering'
          },
          {
            name: 'employeeId',
            in: 'query',
            schema: { type: 'array', items: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } },
            description: 'Filter by employee IDs'
          },
          {
            name: 'employer',
            in: 'query',
            schema: { type: 'array', items: { type: 'string' } },
            description: 'Filter by employer names'
          },
          {
            name: 'location',
            in: 'query',
            schema: { type: 'array', items: { type: 'string' } },
            description: 'Filter by location names'
          },
          {
            name: 'role',
            in: 'query',
            schema: { type: 'array', items: { type: 'string' } },
            description: 'Filter by role names'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 50 },
            description: 'Number of records to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', minimum: 0, default: 0 },
            description: 'Number of records to skip'
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: { type: 'string', enum: ['date', 'name', 'comment', 'employer', 'role', 'location', 'clockIn', 'breakIn', 'breakOut', 'clockOut', 'breakHours', 'totalHours'], default: 'date' },
            description: 'Field to sort by'
          },
          {
            name: 'order',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
            description: 'Sort order'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: timesheetsDashboardResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/timesheets',
        method: 'post',
        summary: 'Create timesheet entry',
        description: 'Create a new timesheet entry with automatic shift matching',
        tags: ['Timesheets'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: timesheetPostSchema
            }
          }
        },
        responses: {
          201: {
            description: 'Response 201',
            content: {
              'application/json': {
                schema: timesheetCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Roles routes
      {
        path: '/api/roles/availability',
        method: 'get',
        summary: 'Get available roles for a location',
        description: 'Get available roles for a location on a specific date with employee counts',
        tags: ['Roles'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'locationId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Location ID'
          },
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Date to check (default: today)'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: rolesAvailabilityResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Calendar routes
      {
        path: '/api/calendar/events',
        method: 'get',
        summary: 'Get calendar events',
        description: 'Fetch filtered calendar events based on date range and optional user/location filter',
        tags: ['Calendar'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
            description: 'Start date for filtering (ISO 8601 format)'
          },
          {
            name: 'endDate',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
            description: 'End date for filtering (ISO 8601 format)'
          },
          {
            name: 'userId',
            in: 'query',
            schema: { type: 'string', default: 'all' },
            description: 'Employee ID or "all" for all employees'
          },
          {
            name: 'locationId',
            in: 'query',
            schema: { type: 'string', default: 'all' },
            description: 'Location ID or "all" for all locations'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: calendarEventsResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/calendar/events',
        method: 'post',
        summary: 'Create calendar event',
        description: 'Create a new shift in the roster',
        tags: ['Calendar'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: calendarEventCreateSchema
            }
          }
        },
        responses: {
          201: {
            description: 'Response 201',
            content: {
              'application/json': {
                schema: calendarEventCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Awards routes
      {
        path: '/api/awards',
        method: 'get',
        summary: 'List awards',
        description: 'Get a paginated list of awards with optional search',
        tags: ['Awards'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            description: 'Number of awards per page'
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string', default: '' },
            description: 'Search term for award name'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: awardsListResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/awards',
        method: 'post',
        summary: 'Create award',
        description: 'Create a new award',
        tags: ['Awards'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: awardCreateSchema
            }
          }
        },
        responses: {
          201: {
            description: 'Response 201',
            content: {
              'application/json': {
                schema: awardCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          409: {
            description: 'Response 409',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/awards/{id}',
        method: 'get',
        summary: 'Get single award',
        description: 'Get an award by ID',
        tags: ['Awards'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Award ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: singleAwardResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/awards/{id}',
        method: 'put',
        summary: 'Update award',
        description: 'Update an award by ID',
        tags: ['Awards'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Award ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: awardUpdateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: awardResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          409: {
            description: 'Response 409',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/awards/{id}',
        method: 'delete',
        summary: 'Delete award',
        description: 'Delete an award by ID (only if not assigned to employees)',
        tags: ['Awards'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Award ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: successResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          409: {
            description: 'Response 409',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Devices routes
      {
        path: '/api/devices/activate',
        method: 'post',
        summary: 'Activate device',
        description: 'Activate a device with one-time code. Links a device UUID to a pre-created device record used during initial tablet setup.',
        tags: ['Devices'],
        security: undefined,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: deviceActivateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: deviceActivateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: deviceActivateResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: deviceActivateResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/devices/check',
        method: 'post',
        summary: 'Check device authorization',
        description: 'Silent device authentication. Checks if a device UUID is authorized to access the app. Used on every PWA load for transparent security.',
        tags: ['Devices'],
        security: undefined,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: deviceCheckSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: deviceCheckResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: deviceCheckResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: deviceCheckResponseSchema
              }
            }
          }
        }
      },
      // Users routes
      {
        path: '/api/users',
        method: 'get',
        summary: 'List users',
        description: 'List all users (admin only). Excludes super_admin (hidden).',
        tags: ['Users'],
        security: [{ adminAuth: [] }],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: usersListResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/users',
        method: 'post',
        summary: 'Create user',
        description: 'Create user (admin only)',
        tags: ['Users'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: userCreateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: userCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          409: {
            description: 'Response 409',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Setup routes
      {
        path: '/api/setup/status',
        method: 'get',
        summary: 'Get setup status',
        description: 'Check if the application setup is complete',
        tags: ['Setup'],
        security: undefined,
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: setupStatusResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: setupStatusResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/setup/create-admin',
        method: 'post',
        summary: 'Create admin user',
        description: 'Create the initial admin user during setup',
        tags: ['Setup'],
        security: undefined,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: adminCreateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: adminCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: adminCreateResponseSchema
              }
            }
          },
          409: {
            description: 'Response 409',
            content: {
              'application/json': {
                schema: adminCreateResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: adminCreateResponseSchema
              }
            }
          }
        }
      },
      // Admin routes
      {
        path: '/api/admin/activity-logs',
        method: 'get',
        summary: 'Get activity logs',
        description: 'Get activity logs with pagination and filtering',
        tags: ['Admin'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string', default: 'storage' },
            description: 'Filter by category'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
            description: 'Number of logs to return'
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: activityLogsResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/admin/activity-logs',
        method: 'post',
        summary: 'Create activity log',
        description: 'Create a new activity log entry',
        tags: ['Admin'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: activityLogCreateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: activityLogCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/admin/mail-settings',
        method: 'get',
        summary: 'Get mail settings',
        description: 'Get current mail configuration settings',
        tags: ['Admin'],
        security: [{ adminAuth: [] }],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: mailSettingsResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/admin/mail-settings',
        method: 'post',
        summary: 'Update mail settings',
        description: 'Update mail configuration settings',
        tags: ['Admin'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: mailSettingsUpdateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: successResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/admin/mail-settings/test',
        method: 'post',
        summary: 'Test mail settings',
        description: 'Send a test email to verify mail configuration',
        tags: ['Admin'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: mailTestSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: mailTestResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/admin/storage-settings',
        method: 'get',
        summary: 'Get current storage settings',
        description: 'Get current storage settings with masked secrets for both Cloudinary and R2 providers',
        tags: ['Admin'],
        security: [{ adminAuth: [] }],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: storageSettingsResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/admin/storage-settings',
        method: 'post',
        summary: 'Create or update storage settings',
        description: 'Create or update storage settings for Cloudinary or R2 providers',
        tags: ['Admin'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: storageSettingsUpdateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: storageSettingsCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/admin/storage-settings',
        method: 'delete',
        summary: 'Delete storage settings',
        description: 'Delete all active storage settings',
        tags: ['Admin'],
        security: [{ adminAuth: [] }],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: successResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/admin/storage-stats',
        method: 'get',
        summary: 'Get storage usage statistics',
        description: 'Get storage usage statistics from the active storage provider (Cloudinary or R2)',
        tags: ['Admin'],
        security: [{ adminAuth: [] }],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: storageStatsResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/admin/cleanup/cloudinary',
        method: 'post',
        summary: 'Delete Cloudinary images older than date',
        description: 'Delete images from Cloudinary storage that are older than the specified date (admin only)',
        tags: ['Admin'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: cleanupRequestSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: cloudinaryCleanupResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/admin/cleanup/timesheets',
        method: 'post',
        summary: 'Delete timesheet records older than date',
        description: 'Delete timesheet records from database that are older than the specified date (admin only)',
        tags: ['Admin'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: cleanupRequestSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: timesheetsCleanupResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Analytics routes
      {
        path: '/api/analytics/employee-report/{employeeId}',
        method: 'get',
        summary: 'Get employee analytics report',
        description: 'Get analytics report for a specific employee within a date range',
        tags: ['Analytics'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'employeeId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          },
          {
            name: 'startDate',
            in: 'query',
            required: true,
            schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            description: 'Start date (YYYY-MM-DD format)'
          },
          {
            name: 'endDate',
            in: 'query',
            required: true,
            schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            description: 'End date (YYYY-MM-DD format)'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: analyticsReportResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/analytics/weekly-report/{weekId}',
        method: 'get',
        summary: 'Get weekly analytics report',
        description: 'Get analytics report for a specific week',
        tags: ['Analytics'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'weekId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
            description: 'Week ID in format YYYY-Www'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: analyticsReportResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/analytics/no-shows/{weekId}',
        method: 'get',
        summary: 'Get no-shows for a week',
        description: 'Get list of no-shows (employees who did not clock in for scheduled shifts) for a specific week',
        tags: ['Analytics'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'weekId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
            description: 'Week ID in format YYYY-Www'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: noShowsResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/analytics/punctuality/{shiftId}',
        method: 'get',
        summary: 'Get punctuality analysis for a shift',
        description: 'Get punctuality analysis (early/late/on-time) for a specific shift',
        tags: ['Analytics'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'shiftId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Shift ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: punctualityResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/analytics/variance/{shiftId}',
        method: 'get',
        summary: 'Calculate variance for a specific shift',
        description: 'Calculate the variance between scheduled hours and actual hours worked for a specific shift',
        tags: ['Analytics'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'shiftId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Shift ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: varianceResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Dashboard routes
      {
        path: '/api/dashboard/hours-summary',
        method: 'get',
        summary: 'Get hours summary dashboard',
        description: 'Returns most hours (top staff, overtime) and least hours (< 38h, min first) for a date range',
        tags: ['Dashboard'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            description: 'Start date (YYYY-MM-DD format)'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            description: 'End date (YYYY-MM-DD format)'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: hoursSummaryResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/dashboard/inactive-employees',
        method: 'get',
        summary: 'Get inactive employees',
        description: 'Get employees with no punch in the last 100 days',
        tags: ['Dashboard'],
        security: [{ adminAuth: [] }],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: inactiveEmployeesResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/dashboard/stats',
        method: 'get',
        summary: 'Get dashboard statistics',
        description: 'Get comprehensive dashboard statistics including timeline, location distribution, attendance, and trends',
        tags: ['Dashboard'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'timelineDate',
            in: 'query',
            schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            description: 'Timeline date (YYYY-MM-DD format)'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: dashboardStatsResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/dashboard/user/stats',
        method: 'get',
        summary: 'Get user dashboard statistics',
        description: 'Get dashboard statistics for the current user including managed locations and roles',
        tags: ['Dashboard'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string' },
            description: 'Effective date (ISO 8601 format)'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: userStatsResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/dashboard/role/{roleId}/stats',
        method: 'get',
        summary: 'Get role dashboard statistics',
        description: 'Get dashboard statistics for a specific role including location distribution and metrics',
        tags: ['Dashboard'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'roleId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Role ID'
          },
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string' },
            description: 'Effective date (ISO 8601 format)'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: roleStatsResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/dashboard/location/{locationId}/stats',
        method: 'get',
        summary: 'Get location dashboard statistics',
        description: 'Get dashboard statistics for a specific location including role distribution and metrics',
        tags: ['Dashboard'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'locationId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Location ID'
          },
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string' },
            description: 'Effective date (ISO 8601 format)'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: locationStatsResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/dashboard/location/{locationId}/role/{roleId}/stats',
        method: 'get',
        summary: 'Get location-role dashboard statistics',
        description: 'Get dashboard statistics for a specific location-role combination including employee breakdown',
        tags: ['Dashboard'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'locationId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Location ID'
          },
          {
            name: 'roleId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Role ID'
          },
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string' },
            description: 'Effective date (ISO 8601 format)'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: locationRoleStatsResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Shift Swaps routes (Task 20)
      {
        path: '/api/shift-swaps/{id}/accept',
        method: 'patch',
        summary: 'Accept shift swap request',
        description: 'Recipient accepts a shift swap request',
        tags: ['ShiftSwaps'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Shift swap ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: acceptShiftSwapSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: shiftSwapRequestResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/shift-swaps/{id}/deny',
        method: 'patch',
        summary: 'Deny shift swap request',
        description: 'Manager denies a shift swap request with reason',
        tags: ['ShiftSwaps'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Shift swap ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: denyShiftSwapSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: shiftSwapRequestResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Flags routes (Task 20)
      {
        path: '/api/flags',
        method: 'get',
        summary: 'Get flagged punches',
        description: 'Get flagged clock-in/out punches from the last 30 days with optional filtering',
        tags: ['Flags'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'filter',
            in: 'query',
            schema: { type: 'string', enum: ['no_image', 'no_location', 'no_image_no_location'] },
            description: 'Filter categories by type'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
            description: 'Number of flags to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', minimum: 0, default: 0 },
            description: 'Number of flags to skip'
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: { type: 'string', enum: ['date', 'name', 'pin', 'typeLabel', 'hasImage', 'hasLocation', 'issueType'], default: 'date' },
            description: 'Field to sort by'
          },
          {
            name: 'order',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            description: 'Sort order'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: flagsResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Face Profiles routes (Task 21)
      {
        path: '/api/face-profiles',
        method: 'get',
        summary: 'List face profiles',
        description: 'Get all face profiles with optional filtering by active status',
        tags: ['FaceRecognition'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'activeOnly',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter to active profiles only (true/false)'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: faceProfilesListResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/face-profiles',
        method: 'post',
        summary: 'Enroll face profile',
        description: 'Enroll or re-enroll a staff member face profile for recognition',
        tags: ['FaceRecognition'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: faceProfileCreateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: faceProfileCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/face-profiles/{employeeId}',
        method: 'get',
        summary: 'Get face profile by employee ID',
        description: 'Fetch face profile for a specific employee (without descriptor for security)',
        tags: ['FaceRecognition'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'employeeId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: faceProfileResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/face-profiles/{employeeId}',
        method: 'patch',
        summary: 'Update face profile status',
        description: 'Toggle active status of a face profile',
        tags: ['FaceRecognition'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'employeeId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: faceProfileUpdateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: faceProfileCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/face-profiles/{employeeId}',
        method: 'delete',
        summary: 'Delete face profile',
        description: 'Delete face profile for GDPR compliance (right to erasure)',
        tags: ['FaceRecognition'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'employeeId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: successResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Buddy Punch Alerts routes (Task 21)
      {
        path: '/api/buddy-punch-alerts',
        method: 'get',
        summary: 'List buddy punch alerts',
        description: 'Get paginated list of buddy punch alerts with filtering options',
        tags: ['FaceRecognition'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by status'
          },
          {
            name: 'employeeId',
            in: 'query',
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Filter by employee ID'
          },
          {
            name: 'locationId',
            in: 'query',
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Filter by location ID'
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            description: 'Number of alerts per page'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: buddyPunchAlertsListResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/buddy-punch-alerts',
        method: 'post',
        summary: 'Create buddy punch alert',
        description: 'Create a new buddy punch alert (internal use)',
        tags: ['FaceRecognition'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: buddyPunchAlertCreateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: buddyPunchAlertCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/buddy-punch-alerts/{id}',
        method: 'get',
        summary: 'Get buddy punch alert by ID',
        description: 'Get a single buddy punch alert with full details',
        tags: ['FaceRecognition'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Buddy punch alert ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: buddyPunchAlertResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/buddy-punch-alerts/{id}',
        method: 'patch',
        summary: 'Update buddy punch alert',
        description: 'Update status and notes of a buddy punch alert',
        tags: ['FaceRecognition'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Buddy punch alert ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: buddyPunchAlertUpdateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: buddyPunchAlertUpdateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/buddy-punch-alerts/{id}',
        method: 'delete',
        summary: 'Delete buddy punch alert',
        description: 'Delete a buddy punch alert permanently',
        tags: ['FaceRecognition'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Buddy punch alert ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: successResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Image routes (Task 22)
      {
        path: '/api/image',
        method: 'get',
        summary: 'Image proxy',
        description: 'Auth-protected image proxy for Cloudinary images. Requires dashboard or employee session.',
        tags: ['Media'],
        security: undefined, // Handles both adminAuth and employeeAuth internally
        parameters: [
          {
            name: 'url',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'uri' },
            description: 'URL of the image to proxy'
          }
        ],
        responses: {
          200: {
            description: 'Image binary data',
            content: {
              'image/*': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: imageProxyErrorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: imageProxyErrorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: imageProxyErrorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: imageProxyErrorResponseSchema
              }
            }
          }
        }
      },
      // Upload routes (Task 22)
      {
        path: '/api/upload/image',
        method: 'post',
        summary: 'Upload image',
        description: 'Upload image to Cloudinary storage and return the URL',
        tags: ['Media'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file to upload'
                  }
                },
                required: ['file']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: imageUploadResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Public routes
      {
        path: '/api/public/locations',
        method: 'get',
        summary: 'Get public locations',
        description: 'Get basic location information for device registration (no authentication required)',
        tags: ['Public'],
        security: undefined,
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: publicLocationsResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Device management routes
      {
        path: '/api/device/manage',
        method: 'post',
        summary: 'Create device',
        description: 'Create a new device record with activation code for tablet setup',
        tags: ['Devices'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: deviceCreateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: deviceCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/device/manage',
        method: 'get',
        summary: 'List devices',
        description: 'List all devices with populated user references and punch counts',
        tags: ['Devices'],
        security: [{ adminAuth: [] }],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: devicesListResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/device/manage',
        method: 'patch',
        summary: 'Update device status',
        description: 'Update device status (disable, enable, revoke) with optional reason',
        tags: ['Devices'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: deviceUpdateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: deviceUpdateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/device/manage',
        method: 'delete',
        summary: 'Delete device',
        description: 'Delete a device (must be revoked first)',
        tags: ['Devices'],
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: deviceDeleteSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: deviceDeleteResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/device/register',
        method: 'post',
        summary: 'Register device',
        description: 'Register a new device with admin credentials and location information',
        tags: ['Devices'],
        security: undefined,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: deviceRegisterSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: deviceRegisterResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          403: {
            description: 'Response 403',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Cron routes (Task 22)
      {
        path: '/api/cron/cleanup-cloudinary',
        method: 'get',
        summary: 'Cleanup old Cloudinary images (GET)',
        description: 'Deletes Cloudinary images in the timesheet folder older than 40 days via GET request',
        tags: ['Cron'],
        security: undefined, // Uses CRON_SECRET for auth
        parameters: [
          {
            name: 'secret',
            in: 'query',
            schema: { type: 'string' },
            description: 'Cron secret for authentication'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: cloudinaryCleanupResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/cron/cleanup-cloudinary',
        method: 'post',
        summary: 'Cleanup old Cloudinary images (POST)',
        description: 'Deletes Cloudinary images in the timesheet folder older than 40 days via POST request',
        tags: ['Cron'],
        security: undefined, // Uses CRON_SECRET for auth
        parameters: [
          {
            name: 'secret',
            in: 'query',
            schema: { type: 'string' },
            description: 'Cron secret for authentication'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: cloudinaryCleanupResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      // Employee Detail Routes - BATCH 1
      {
        path: '/api/employees/{id}/roles',
        method: 'get',
        summary: 'Get employee role assignments',
        description: 'Get all role assignments for an employee with optional filtering',
        tags: ['Employees'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          },
          {
            name: 'locationId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by location ID'
          },
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by date'
          },
          {
            name: 'includeInactive',
            in: 'query',
            schema: { type: 'string' },
            description: 'Include inactive assignments'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: roleAssignmentsListResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          503: {
            description: 'Response 503',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/employees/{id}/roles',
        method: 'post',
        summary: 'Assign role to employee',
        description: 'Assign employee to a role at a location',
        tags: ['Employees'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: roleAssignmentCreateSchema
            }
          }
        },
        responses: {
          201: {
            description: 'Response 201',
            content: {
              'application/json': {
                schema: roleAssignmentCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          503: {
            description: 'Response 503',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/employees/{id}/roles/{assignmentId}',
        method: 'patch',
        summary: 'Update role assignment',
        description: 'Update role assignment (typically to set end date)',
        tags: ['Employees'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          },
          {
            name: 'assignmentId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Assignment ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: roleAssignmentUpdateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: roleAssignmentUpdateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          503: {
            description: 'Response 503',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/employees/{id}/roles/{assignmentId}',
        method: 'delete',
        summary: 'Remove role assignment',
        description: 'Remove role assignment (sets validTo to now)',
        tags: ['Employees'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          },
          {
            name: 'assignmentId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Assignment ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: roleAssignmentDeleteResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          503: {
            description: 'Response 503',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/employees/{id}/schedules',
        method: 'get',
        summary: 'Get employee schedules',
        description: 'Get schedules for an employee with optional date filtering',
        tags: ['Employees'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          },
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by date'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: schedulesListResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/employees/{id}/schedules',
        method: 'post',
        summary: 'Create employee schedule',
        description: 'Create a new schedule for an employee',
        tags: ['Employees'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: scheduleCreateSchema
            }
          }
        },
        responses: {
          201: {
            description: 'Response 201',
            content: {
              'application/json': {
                schema: scheduleCreateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/employees/{id}/schedules/{scheduleId}',
        method: 'put',
        summary: 'Update employee schedule',
        description: 'Update a schedule for an employee',
        tags: ['Employees'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          },
          {
            name: 'scheduleId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Schedule ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: scheduleUpdateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: scheduleUpdateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/employees/{id}/schedules/{scheduleId}',
        method: 'delete',
        summary: 'Delete employee schedule',
        description: 'Delete a schedule for an employee',
        tags: ['Employees'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          },
          {
            name: 'scheduleId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Schedule ID'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: scheduleDeleteResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/employees/{id}/timesheet',
        method: 'get',
        summary: 'Get employee timesheet',
        description: "Get employee's daily timesheet with pagination and filtering",
        tags: ['Employees'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search term'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'string' },
            description: 'Limit results'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'string' },
            description: 'Offset results'
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: { type: 'string' },
            description: 'Sort by field'
          },
          {
            name: 'order',
            in: 'query',
            schema: { type: 'string' },
            description: 'Sort order'
          }
        ],
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: timesheetListResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      },
      {
        path: '/api/employees/{id}/timesheet',
        method: 'patch',
        summary: 'Update employee timesheet',
        description: 'Update a timesheet entry for an employee',
        tags: ['Employees'],
        security: [{ adminAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
            description: 'Employee ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: timesheetUpdateSchema
            }
          }
        },
        responses: {
          200: {
            description: 'Response 200',
            content: {
              'application/json': {
                schema: employeeTimesheetUpdateResponseSchema
              }
            }
          },
          400: {
            description: 'Response 400',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          401: {
            description: 'Response 401',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          404: {
            description: 'Response 404',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          },
          500: {
            description: 'Response 500',
            content: {
              'application/json': {
                schema: errorResponseSchema
              }
            }
          }
        }
      }
    ];

    // Build paths object from routes
    const paths: Record<string, any> = {};
    
    routes.forEach(route => {
      if (!paths[route.path]) {
        paths[route.path] = {};
      }
      paths[route.path][route.method] = {
        summary: route.summary,
        description: route.description,
        tags: route.tags,
        security: route.security,
        requestBody: route.requestBody,
        parameters: route.parameters,
        responses: route.responses
      };
    });

    // Create OpenAPI document
    const document = {
      openapi: '3.1.0',
      info: {
        title: 'Timesheet API',
        version: '1.0.0',
        description: 'Auto-generated OpenAPI specification for Timesheet application'
      },
      servers: [
        {
          url: process.env.NODE_ENV === 'production' 
            ? 'https://your-domain.com' 
            : 'http://localhost:3000',
          description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
        }
      ],
      components: {
        securitySchemes: {
          adminAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'admin_token',
            description: 'Admin/User authentication via HTTP-only cookie containing JWT token'
          },
          employeeAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'employee_token',
            description: 'Employee authentication via HTTP-only cookie containing JWT token'
          },
          deviceAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'device_token',
            description: 'Device authentication via HTTP-only cookie containing JWT token'
          }
        }
      },
      paths
    };

    // Ensure public directory exists
    const outputPath = 'public/openapi.json';
    mkdirSync(dirname(outputPath), { recursive: true });

    // Write output to public/openapi.json
    writeFileSync(outputPath, JSON.stringify(document, null, 2));

    // Count endpoints for logging
    const endpointCount = Object.keys(document.paths || {}).length;
    
    console.log(`✅ OpenAPI specification generated successfully!`);
    console.log(`📁 Output: ${outputPath}`);
    console.log(`🔗 Endpoints: ${endpointCount}`);
    console.log(`📊 Total routes: ${routes.length}`);
    console.log(`🔐 Security schemes: ${Object.keys(document.components?.securitySchemes || {}).length}`);

    return document;
  } catch (error) {
    console.error('❌ Failed to generate OpenAPI specification:', error);
    process.exit(1);
  }
}

// Run generation if this file is executed directly
if (require.main === module) {
  generateOpenAPISpec();
}

export { generateOpenAPISpec };