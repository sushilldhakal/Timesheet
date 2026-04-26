import { connectDB, Device } from "@/lib/db";
import { logger } from "@/lib/utils/logger";

export class DeviceAuthService {
  async check(deviceId: string) {
    await connectDB();
    const device = await Device.findOne({ deviceId, status: "active" }).lean();
    if (!device) {
      logger.warn(`[api/devices/check] Unauthorized device attempt: ${deviceId}`);
      return {
        status: 200,
        data: { authorized: false, error: "Device not authorized", reason: "Device not found or inactive" },
      };
    }

    Device.findByIdAndUpdate((device as any)._id, { lastActivity: new Date() }).catch((err) => {
      logger.error("[api/devices/check] Failed to update lastActivity:", err);
    });

    logger.log(`[api/devices/check] Device authorized: ${deviceId} (${(device as any).deviceName})`);
    return {
      status: 200,
      data: {
        authorized: true,
        device: {
          id: String((device as any)._id),
          deviceId: (device as any).deviceId,
          deviceName: (device as any).deviceName,
          locationName: (device as any).locationName,
          lastActivity: (device as any).lastActivity?.toISOString(),
        },
      },
    };
  }

  async activate(deviceId: string, activationCode: string) {
    await connectDB();
    const code = activationCode.toUpperCase();
    
    // Find by activation code regardless of status first, to give better error messages
    const device = await Device.findOne({ activationCode: code }).lean();
    if (!device) {
      logger.warn(`[api/devices/activate] No device found with activation code: ${code}`);
      return { status: 400, data: { success: false, error: "Invalid activation code" } };
    }

    if ((device as any).status !== "active") {
      logger.warn(`[api/devices/activate] Device status is '${(device as any).status}', not active`);
      return { status: 400, data: { success: false, error: `Device is ${(device as any).status} and cannot be activated` } };
    }

    // Check expiry
    const expiry = (device as any).activationCodeExpiry;
    if (expiry && new Date(expiry) < new Date()) {
      logger.warn(`[api/devices/activate] Activation code expired at ${expiry}`);
      return { status: 400, data: { success: false, error: "Activation code has expired. Please generate a new one from the dashboard." } };
    }

    if ((device as any).deviceId && (device as any).deviceId !== deviceId) {
      logger.warn(
        `[api/devices/activate] Device already activated with different UUID: ${(device as any).deviceId} vs ${deviceId}`,
      );
      return { status: 400, data: { success: false, error: "This activation code has already been used by another device" } };
    }

    if ((device as any).deviceId === deviceId) {
      logger.log(`[api/devices/activate] Re-activating device: ${deviceId} (${(device as any).deviceName})`);
      await Device.findByIdAndUpdate((device as any)._id, { lastActivity: new Date() });
      return {
        status: 200,
        data: { success: true, device: { id: String((device as any)._id), deviceId, deviceName: (device as any).deviceName, locationName: (device as any).locationName } },
      };
    }

    await Device.findByIdAndUpdate((device as any)._id, {
      deviceId,
      $unset: { activationCodeExpiry: 1 },
      lastActivity: new Date(),
    });

    logger.log(`[api/devices/activate] Device activated: ${deviceId} (${(device as any).deviceName})`);
    return {
      status: 200,
      data: { success: true, device: { id: String((device as any)._id), deviceId, deviceName: (device as any).deviceName, locationName: (device as any).locationName } },
    };
  }
}

export const deviceAuthService = new DeviceAuthService();

