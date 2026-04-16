import { Device } from '@/lib/db/schemas/device';
import { User } from '@/lib/db/schemas/user';

export class DeviceRegisterDbQueries {
  static async findAdminByEmailOrUsernameWithPasswordLean(normalizedInput: string) {
    return User.findOne({ email: normalizedInput }).select('+password').lean();
  }

  static async createDevice(args: any) {
    return Device.create(args);
  }
}

