import mongoose from 'mongoose';
import { CalendarBulkEventsDbQueries } from '@/lib/db/queries/calendar-bulk-events';
import { connectDB } from '@/lib/db';

export class CalendarBulkEventsService {
  async bulkDelete(body: any) {
    await connectDB();
    const { ids } = body;
    const oids = ids.map((id: string) => new mongoose.Types.ObjectId(id));
    const result = await CalendarBulkEventsDbQueries.bulkPullShiftsByIds(oids);

    return {
      deleted: result.modifiedCount > 0 ? ids.length : 0,
      notFound: result.matchedCount === 0 ? ids.length : 0,
    };
  }
}

export const calendarBulkEventsService = new CalendarBulkEventsService();

