import { Roster } from '@/lib/db/schemas/roster';

export class CalendarBulkEventsDbQueries {
  static async bulkPullShiftsByIds(ids: string[]) {
    return Roster.updateMany(
      { 'shifts._id': { $in: ids } },
      { $pull: { shifts: { _id: { $in: ids } } } } as Parameters<typeof Roster.updateMany>[1],
    );
  }
}

