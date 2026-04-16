import { Location } from '@/lib/db';

export class PublicLocationsDbQueries {
  static async listActiveLocationsLean() {
    return Location.find({ isActive: true })
      .select('_id name')
      .sort({ name: 1 })
      .lean();
  }
}

