import { PublicHolidaysDbQueries } from "@/lib/db/queries/public-holidays";
import { connectDB } from "@/lib/db";

function normalizeDateToLocalStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export class PublicHolidayService {
  async list(query: any) {
    await connectDB();
    const filter: Record<string, unknown> = {};
    if (query?.state) filter.state = query.state;
    if (query?.year) {
      const start = new Date(query.year, 0, 1);
      const end = new Date(query.year, 11, 31, 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const publicHolidays = await PublicHolidaysDbQueries.listLean(filter);
    return {
      publicHolidays: (publicHolidays as any[]).map((h) => ({
        _id: String(h._id),
        date: h.date,
        name: h.name,
        state: h.state,
        isRecurring: h.isRecurring,
        createdAt: h.createdAt,
      })),
    };
  }

  async create(body: any) {
    await connectDB();
    const normalizedDate = normalizeDateToLocalStartOfDay(body.date);
    const publicHoliday = await PublicHolidaysDbQueries.create({
      date: normalizedDate,
      name: body.name,
      state: body.state,
      isRecurring: body.isRecurring,
    });

    return {
      status: 201,
      data: {
        success: true,
        publicHoliday: {
          _id: String((publicHoliday as any)._id),
          date: (publicHoliday as any).date,
          name: (publicHoliday as any).name,
          state: (publicHoliday as any).state,
          isRecurring: (publicHoliday as any).isRecurring,
          createdAt: (publicHoliday as any).createdAt,
        },
      },
    };
  }

  async get(id: string) {
    await connectDB();
    const holiday = await PublicHolidaysDbQueries.findByIdLean(id);
    if (!holiday) return { status: 404, data: { error: "Public holiday not found" } };
    return {
      status: 200,
      data: {
        publicHoliday: {
          _id: String((holiday as any)._id),
          date: (holiday as any).date,
          name: (holiday as any).name,
          state: (holiday as any).state,
          isRecurring: (holiday as any).isRecurring,
          createdAt: (holiday as any).createdAt,
        },
      },
    };
  }

  async update(id: string, body: any) {
    await connectDB();
    const updates: Record<string, unknown> = {};
    if (body?.date) updates.date = normalizeDateToLocalStartOfDay(body.date);
    if (typeof body?.name === "string") updates.name = body.name;
    if (typeof body?.state === "string") updates.state = body.state;
    if (typeof body?.isRecurring === "boolean") updates.isRecurring = body.isRecurring;

    const updated = await PublicHolidaysDbQueries.findByIdAndUpdate(id, { $set: updates });
    if (!updated) return { status: 404, data: { error: "Public holiday not found" } };
    return {
      status: 200,
      data: {
        success: true,
        publicHoliday: {
          _id: String((updated as any)._id),
          date: (updated as any).date,
          name: (updated as any).name,
          state: (updated as any).state,
          isRecurring: (updated as any).isRecurring,
          createdAt: (updated as any).createdAt,
        },
      },
    };
  }

  async remove(id: string) {
    await connectDB();
    const deleted = await PublicHolidaysDbQueries.deleteById(id);
    if (!deleted) return { status: 404, data: { error: "Public holiday not found" } };
    return { status: 200, data: { success: true } };
  }

  mapDup(err: any, message: string) {
    const isDup = err?.code === 11000;
    return { status: isDup ? 400 : 500, data: { error: isDup ? "Public holiday already exists for that date/state" : message } };
  }
}

export const publicHolidayService = new PublicHolidayService();

