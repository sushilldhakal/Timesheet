import { apiErrors } from '@/lib/api/api-error';
import { logDeviceDisabled, logDeviceRevocation } from '@/lib/auth/auth-logger';
import { DeviceDbQueries } from '@/lib/db/queries/devices';

function generateActivationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export class DeviceService {
  async createDevice(args: { authSub: string; tenantId: string; deviceName: string; locationName: string; locationAddress?: string }) {
    const { authSub, tenantId, deviceName, locationName, locationAddress } = args;

    let activationCode = '';
    let codeExists = true;
    while (codeExists) {
      activationCode = generateActivationCode();
      const existing = await DeviceDbQueries.findByActivationCode(activationCode);
      codeExists = !!existing;
    }

    const device = await DeviceDbQueries.createDevice({
      tenantId,
      deviceName,
      locationName,
      locationAddress: locationAddress || '',
      status: 'active',
      registeredBy: authSub,
      registeredAt: new Date(),
      lastActivity: new Date(),
      totalPunches: 0,
      activationCode,
      activationCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await (device as any).populate('registeredBy', 'name email');

    return {
      success: true,
      device,
      activationCode,
      activationUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/pin?activate=${activationCode}`,
    };
  }

  async listDevicesWithPunchCounts() {
    const devices = await DeviceDbQueries.listDevicesLean();
    const { DailyShift } = await import('@/lib/db/schemas/daily-shift');

    const devicesWithPunchCounts = await Promise.all(
      devices.map(async (device: any) => {
        if (!device.deviceId) return { ...device, totalPunches: 0 };

        const punchCount = await DailyShift.countDocuments({
          $or: [
            { 'clockIn.deviceId': device.deviceId },
            { 'breakIn.deviceId': device.deviceId },
            { 'breakOut.deviceId': device.deviceId },
            { 'clockOut.deviceId': device.deviceId },
          ],
        });
        return { ...device, totalPunches: punchCount };
      })
    );

    return { devices: devicesWithPunchCounts };
  }

  async updateDeviceStatus(args: { authSub: string; deviceId: string; action: string; reason?: string }) {
    const { authSub, deviceId, action, reason } = args;

    let device = await DeviceDbQueries.findByDeviceId(deviceId);
    if (!device) {
      try {
        device = await DeviceDbQueries.findById(deviceId);
      } catch {
        device = null;
      }
    }
    if (!device) throw apiErrors.notFound('Device not found');

    switch (action) {
      case 'disable':
        (device as any).status = 'disabled';
        logDeviceDisabled((device as any).deviceId || (device as any)._id.toString(), reason);
        break;
      case 'enable':
        if ((device as any).status === 'revoked') throw apiErrors.badRequest('Cannot enable revoked device');
        (device as any).status = 'active';
        break;
      case 'revoke':
        (device as any).status = 'revoked';
        (device as any).revokedAt = new Date();
        (device as any).revokedBy = authSub;
        (device as any).revocationReason = reason || '';
        logDeviceRevocation((device as any).deviceId || (device as any)._id.toString(), authSub, reason);
        break;
      default:
        throw apiErrors.badRequest('Invalid action');
    }

    await (device as any).save();
    await (device as any).populate('registeredBy', 'name email');
    await (device as any).populate('revokedBy', 'name email');

    return { success: true, device };
  }

  async deleteDevice(deviceId: string) {
    let device = await DeviceDbQueries.findByDeviceId(deviceId);
    if (!device) {
      try {
        device = await DeviceDbQueries.findById(deviceId);
      } catch {
        device = null;
      }
    }
    if (!device) throw apiErrors.notFound('Device not found');
    if ((device as any).status !== 'revoked') throw apiErrors.badRequest('Device must be revoked before deletion');

    await DeviceDbQueries.deleteById((device as any)._id);
    return { success: true };
  }
}

export const deviceService = new DeviceService();

