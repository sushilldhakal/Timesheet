import { apiErrors } from '@/lib/api/api-error';
import { createDeviceToken, setDeviceCookie } from '@/lib/auth/auth-helpers';
import { logDeviceRegistrationFailure } from '@/lib/auth/auth-logger';
import { isAdminOrSuperAdmin } from '@/lib/config/roles';
import { connectDB } from '@/lib/db';
import { DeviceRegisterDbQueries } from '@/lib/db/queries/device-register';

export class DeviceRegisterService {
  async register(body: any) {
    if (!body) throw apiErrors.badRequest('Request body is required');
    await connectDB();

    const { email, password, locationName, locationAddress } = body;
    if (!locationName || typeof locationName !== 'string' || !locationName.trim()) {
      logDeviceRegistrationFailure('Missing or invalid location name');
      throw apiErrors.badRequest('Location name is required');
    }
    if (!email || !password) {
      logDeviceRegistrationFailure('Missing authentication credentials');
      throw apiErrors.badRequest('Email and password required');
    }

    const normalizedInput = email.trim().toLowerCase();
    const bcrypt = await import('bcrypt');

    const adminUser = await DeviceRegisterDbQueries.findAdminByEmailWithPasswordLean(normalizedInput);

    if (process.env.NODE_ENV === 'development') {
      console.log('[device/register] Looking for user:', normalizedInput);
      console.log('[device/register] User found:', !!adminUser);
      if (adminUser) {
        console.log('[device/register] User details:', {
          id: (adminUser as any)._id,
          email: (adminUser as any).email,
          role: (adminUser as any).role,
        });
      }
    }

    if (!adminUser || !(adminUser as any).password) {
      logDeviceRegistrationFailure('Invalid credentials - user not found', { email: normalizedInput });
      throw apiErrors.unauthorized('Invalid email or password. Please check your credentials.');
    }

    const passwordMatch = await bcrypt.compare(password, (adminUser as any).password);
    if (process.env.NODE_ENV === 'development') {
      console.log('[device/register] Password match:', passwordMatch);
      console.log('[device/register] User role:', (adminUser as any).role);
    }

    if (!passwordMatch) {
      logDeviceRegistrationFailure('Invalid password', { email: normalizedInput });
      throw apiErrors.unauthorized('Invalid email or password. Please check your credentials.');
    }

    if (!isAdminOrSuperAdmin((adminUser as any).role)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[device/register] User role check failed:', {
          userRole: (adminUser as any).role,
          isAdmin: (adminUser as any).role === 'admin',
          isSuperAdmin: (adminUser as any).role === 'super_admin',
          isAdminOrSuperAdmin: isAdminOrSuperAdmin((adminUser as any).role),
        });
      }
      logDeviceRegistrationFailure('Insufficient permissions', { email: normalizedInput, role: (adminUser as any).role });
      throw apiErrors.forbidden(
        'Access denied. Only administrators can register devices. Please use an admin account.'
      );
    }

    const deviceId = crypto.randomUUID();
    const device = await DeviceRegisterDbQueries.createDevice({
      deviceId,
      locationName: locationName.trim(),
      locationAddress: locationAddress?.trim() || '',
      status: 'active',
      registeredBy: (adminUser as any)._id,
      registeredAt: new Date(),
      lastActivity: new Date(),
    });

    const token = await createDeviceToken({ sub: deviceId, location: locationName.trim() });
    await setDeviceCookie(token);

    return { success: true, deviceId: (device as any).deviceId };
  }
}

export const deviceRegisterService = new DeviceRegisterService();

