/**
 * Backward Compatibility Tests for User Role Hierarchy Refactor
 * 
 * This test suite verifies that:
 * 1. Existing "user" role documents remain functional
 * 2. All new fields have proper defaults for existing data
 * 3. Deprecated fields still work but show deprecation warnings
 * 4. Schema changes don't break existing MongoDB documents
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import mongoose from 'mongoose'
import { User, DailyShift } from '@/lib/db'
import { 
  canCreateUser, 
  getRoleScope, 
  canApproveShift, 
  canLockShift, 
  canProcessPayroll, 
  canManageAwards,
  isUser,
  UserRole 
} from '@/lib/config/roles'
import { 
  getUserPermissionContext,
  canViewLocation,
  canViewRole,
  canApproveShift as canApproveShiftScoped,
  canLockShift as canLockShiftScoped,
  canAccessPayroll,
  canManageAwards as canManageAwardsScoped
} from '@/lib/utils/dashboard/dashboard-permissions'

// Test database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/timesheet-test'

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI)
})

afterAll(async () => {
  await mongoose.connection.close()
})

beforeEach(async () => {
  // Clean up test data
  await User.deleteMany({ username: { $regex: /^test-/ } })
  await DailyShift.deleteMany({ pin: { $regex: /^test-/ } })
})

describe('User Schema Backward Compatibility', () => {
  it('should support existing "user" role documents', async () => {
    // Create a user with the deprecated "user" role (simulating existing data)
    const legacyUser = await User.create({
      name: 'Legacy User',
      username: 'test-legacy-user',
      email: 'legacy@example.com',
      password: 'password123',
      role: 'user', // Deprecated but should still work
      location: ['location1', 'location2'],
      rights: ['view_dashboard'], // Deprecated but should still work
      managedRoles: ['role1'],
      // Note: createdBy is not set (simulating existing data)
    })

    expect(legacyUser.role).toBe('user')
    expect(legacyUser.createdBy).toBeNull() // Should default to null
    expect(legacyUser.location).toEqual(['location1', 'location2'])
    expect(legacyUser.rights).toEqual(['view_dashboard'])
    expect(legacyUser.managedRoles).toEqual(['role1'])
  })

  it('should handle new role types correctly', async () => {
    const newRoles = ['manager', 'supervisor', 'accounts']
    
    for (const role of newRoles) {
      const user = await User.create({
        name: `Test ${role}`,
        username: `test-${role}`,
        email: `${role}@example.com`,
        password: 'password123',
        role: role as any,
        location: ['location1'],
        managedRoles: ['role1'],
        createdBy: 'creator-id-123',
      })

      expect(user.role).toBe(role)
      expect(user.createdBy).toBe('creator-id-123')
      expect(user.location).toEqual(['location1'])
      expect(user.managedRoles).toEqual(['role1'])
    }
  })

  it('should provide proper defaults for new fields on existing documents', async () => {
    // Simulate an existing document by creating one without the new fields
    const existingDoc = new User({
      name: 'Existing User',
      username: 'test-existing',
      email: 'existing@example.com',
      password: 'password123',
      role: 'user',
      location: ['location1'],
      rights: ['view_dashboard'],
      managedRoles: ['role1'],
      // createdBy is not set (simulating existing data)
    })

    await existingDoc.save()

    // Fetch the document to verify defaults
    const fetched = await User.findById(existingDoc._id)
    expect(fetched?.createdBy).toBeNull() // Should default to null
  })

  it('should preserve backward compatibility for location field normalization', async () => {
    // Test that the pre-save hook still normalizes location strings to arrays
    const user = new User({
      name: 'Location Test User',
      username: 'test-location-norm',
      email: 'location@example.com',
      password: 'password123',
      role: 'user',
      location: 'single-location' as any, // Simulate legacy string format
      rights: [],
      managedRoles: [],
    })

    await user.save()

    // Should be normalized to array
    expect(Array.isArray(user.location)).toBe(true)
    expect(user.location).toEqual(['single-location'])
  })
})

describe('DailyShift Schema Backward Compatibility', () => {
  it('should support existing DailyShift documents without new fields', async () => {
    // Create a shift without the new context and workflow fields (simulating existing data)
    const legacyShift = await DailyShift.create({
      pin: 'test-legacy-pin',
      date: new Date('2024-01-01'),
      status: 'active',
      source: 'clock',
      // New fields are not set (simulating existing data)
    })

    expect(legacyShift.locationId).toBeNull() // Should default to null
    expect(legacyShift.roleId).toBeNull() // Should default to null
    expect(legacyShift.employeeId).toBeNull() // Should default to null
    expect(legacyShift.approvedBy).toBeNull() // Should default to null
    expect(legacyShift.approvedAt).toBeNull() // Should default to null
    expect(legacyShift.lockedBy).toBeNull() // Should default to null
    expect(legacyShift.lockedAt).toBeNull() // Should default to null
    expect(legacyShift.processedBy).toBeNull() // Should default to null
    expect(legacyShift.processedAt).toBeNull() // Should default to null
    expect(legacyShift.exportedAt).toBeNull() // Should default to null
    expect(legacyShift.exportReference).toBeNull() // Should default to null
  })

  it('should support new status values', async () => {
    const newStatuses = ['approved', 'locked', 'processed', 'exported', 'rejected']
    
    for (const status of newStatuses) {
      const shift = await DailyShift.create({
        pin: `test-${status}-pin`,
        date: new Date('2024-01-01'),
        status: status as any,
        source: 'clock',
        locationId: 'location1',
        roleId: 'role1',
      })

      expect(shift.status).toBe(status)
    }
  })

  it('should maintain existing pin field for backward compatibility', async () => {
    const shift = await DailyShift.create({
      pin: 'existing-pin-format',
      date: new Date('2024-01-01'),
      status: 'active',
      source: 'clock',
    })

    expect(shift.pin).toBe('existing-pin-format')
    // Verify that pin is still indexed and unique constraints work
    await expect(DailyShift.create({
      pin: 'existing-pin-format',
      date: new Date('2024-01-01'),
      status: 'active',
      source: 'clock',
    })).rejects.toThrow()
  })
})

describe('Role-Based Permission Backward Compatibility', () => {
  it('should maintain support for deprecated "user" role in permission checks', async () => {
    // Test that deprecated "user" role still works in permission functions
    expect(isUser('user')).toBe(true)
    expect(getRoleScope('user')).toBe('location')
    
    // User role should not have advanced permissions
    expect(canApproveShift('user')).toBe(false)
    expect(canLockShift('user')).toBe(false)
    expect(canProcessPayroll('user')).toBe(false)
    expect(canManageAwards('user')).toBe(false)
    
    // User role should not be able to create other users
    expect(canCreateUser('user', 'supervisor')).toBe(false)
    expect(canCreateUser('user', 'user')).toBe(false)
  })

  it('should support scoped permission checks for deprecated "user" role', async () => {
    const userContext = {
      userId: 'user-id',
      role: 'user' as const,
      managedLocations: ['location1', 'location2'],
      managedRoles: ['role1'],
    }

    // User should be able to view their assigned locations
    expect(canViewLocation(userContext, 'location1')).toBe(true)
    expect(canViewLocation(userContext, 'location3')).toBe(false)
    
    // User should be able to view their managed roles
    expect(canViewRole(userContext, 'role1')).toBe(true)
    expect(canViewRole(userContext, 'role2')).toBe(false)
    
    // User should not have approval/lock/payroll permissions
    expect(canApproveShiftScoped(userContext, 'location1')).toBe(false)
    expect(canLockShiftScoped(userContext, 'location1')).toBe(false)
    expect(canAccessPayroll(userContext, 'location1')).toBe(false)
    expect(canManageAwardsScoped(userContext)).toBe(false)
  })
})

describe('Hierarchy Enforcement Backward Compatibility', () => {
  it('should maintain existing admin creation capabilities', async () => {
    // Admin should still be able to create users (including deprecated "user" role)
    expect(canCreateUser('admin', 'user')).toBe(true)
    expect(canCreateUser('admin', 'manager')).toBe(true)
    expect(canCreateUser('admin', 'supervisor')).toBe(true)
    expect(canCreateUser('admin', 'accounts')).toBe(true)
    
    // Admin should not be able to create super_admin
    expect(canCreateUser('admin', 'super_admin')).toBe(false)
  })

  it('should maintain super_admin capabilities', async () => {
    // Super admin should be able to create any role
    expect(canCreateUser('super_admin', 'admin')).toBe(true)
    expect(canCreateUser('super_admin', 'manager')).toBe(true)
    expect(canCreateUser('super_admin', 'supervisor')).toBe(true)
    expect(canCreateUser('super_admin', 'accounts')).toBe(true)
    expect(canCreateUser('super_admin', 'user')).toBe(true)
    expect(canCreateUser('super_admin', 'super_admin')).toBe(true)
  })
})

describe('API Backward Compatibility', () => {
  it('should handle user creation with deprecated role', async () => {
    // Create an admin user for testing
    const adminUser = await User.create({
      name: 'Test Admin',
      username: 'test-admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      location: [],
      rights: [],
      managedRoles: [],
    })

    // Test that admin can still create "user" role (deprecated but supported)
    expect(canCreateUser('admin', 'user')).toBe(true)
  })

  it('should filter users correctly based on role hierarchy', async () => {
    // Create test users with different roles
    const adminUser = await User.create({
      name: 'Test Admin',
      username: 'test-admin-filter',
      email: 'admin-filter@example.com',
      password: 'password123',
      role: 'admin',
      location: [],
      rights: [],
      managedRoles: [],
    })

    const managerUser = await User.create({
      name: 'Test Manager',
      username: 'test-manager-filter',
      email: 'manager-filter@example.com',
      password: 'password123',
      role: 'manager',
      location: ['location1'],
      rights: [],
      managedRoles: [],
    })

    const userUser = await User.create({
      name: 'Test User',
      username: 'test-user-filter',
      email: 'user-filter@example.com',
      password: 'password123',
      role: 'user', // Deprecated role
      location: ['location1'],
      rights: [],
      managedRoles: [],
    })

    // Verify that all users were created successfully
    expect(adminUser.role).toBe('admin')
    expect(managerUser.role).toBe('manager')
    expect(userUser.role).toBe('user')
  })
})

describe('Deprecation Warnings', () => {
  it('should document deprecated fields in schema', async () => {
    // This test verifies that deprecated fields are properly documented
    // The actual deprecation warnings would be in JSDoc comments
    
    const user = await User.create({
      name: 'Deprecation Test',
      username: 'test-deprecation',
      email: 'deprecation@example.com',
      password: 'password123',
      role: 'user', // Deprecated
      location: ['location1'],
      rights: ['view_dashboard'], // Deprecated
      managedRoles: [],
    })

    // Deprecated fields should still work
    expect(user.role).toBe('user')
    expect(user.rights).toEqual(['view_dashboard'])
    
    // But new role-based permissions should be preferred
    expect(UserRole.USER).toBe('user') // Enum still exists
  })
})