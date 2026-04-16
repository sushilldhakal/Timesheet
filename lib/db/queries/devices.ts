import { Device } from '@/lib/db/schemas/device';

export class DeviceDbQueries {
  static async findByActivationCode(code: string) {
    return Device.findOne({ activationCode: code });
  }

  static async createDevice(data: any) {
    return Device.create(data);
  }

  static async listDevicesLean() {
    return Device.find()
      .populate('registeredBy', 'name username')
      .populate('revokedBy', 'name username')
      .sort({ registeredAt: -1 })
      .lean();
  }

  static async findByDeviceId(deviceId: string) {
    return Device.findOne({ deviceId });
  }

  static async findById(id: string) {
    return Device.findById(id);
  }

  static async deleteById(id: string) {
    return Device.findByIdAndDelete(id);
  }
}

