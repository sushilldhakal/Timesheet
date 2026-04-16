import { connectDB } from '@/lib/db';
import { PublicLocationsDbQueries } from '@/lib/db/queries/public-locations';

export class PublicLocationsService {
  async listActiveLocations() {
    await connectDB();
    const locations = await PublicLocationsDbQueries.listActiveLocationsLean();
    const items = (locations as any[]).map((location) => ({
      _id: location._id.toString(),
      id: location._id.toString(),
      name: location.name,
    }));

    return {
      locations: items,
      count: items.length,
    };
  }
}

export const publicLocationsService = new PublicLocationsService();

