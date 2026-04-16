import { PublicHolidaysDbQueries } from "@/lib/db/queries/public-holidays";
import { connectDB } from "@/lib/db";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function secondMondayOfJune(year: number) {
  const firstOfJune = new Date(year, 5, 1);
  const day = firstOfJune.getDay();
  const offsetToMonday = (8 - day) % 7;
  const firstMonday = addDays(firstOfJune, offsetToMonday);
  return addDays(firstMonday, 7);
}

function aflGrandFinalFridayVIC(year: number) {
  const lastDayOfSep = new Date(year, 9, 0);
  const dow = lastDayOfSep.getDay();
  const daysBackToSaturday = (dow - 6 + 7) % 7;
  const lastSaturday = addDays(lastDayOfSep, -daysBackToSaturday);
  return addDays(lastSaturday, -1);
}

function secondMondayOfMarch(year: number) {
  const firstOfMarch = new Date(year, 2, 1);
  const day = firstOfMarch.getDay();
  const offsetToMonday = (8 - day) % 7;
  const firstMonday = addDays(firstOfMarch, offsetToMonday);
  return addDays(firstMonday, 7);
}

function firstTuesdayOfNovember(year: number) {
  const firstOfNov = new Date(year, 10, 1);
  const day = firstOfNov.getDay();
  const offsetToTuesday = (9 - day) % 7;
  return addDays(firstOfNov, offsetToTuesday);
}

type SeedHoliday = { date: Date; name: string; state: "NAT" | "VIC"; isRecurring: boolean };

function buildSeedHolidays(year: number): SeedHoliday[] {
  const easter = easterSunday(year);
  const holidays: SeedHoliday[] = [
    { date: new Date(year, 0, 1), name: "New Year's Day", state: "NAT", isRecurring: true },
    { date: new Date(year, 0, 26), name: "Australia Day", state: "NAT", isRecurring: true },
    { date: secondMondayOfMarch(year), name: "Labour Day", state: "VIC", isRecurring: false },
    { date: addDays(easter, -2), name: "Good Friday", state: "NAT", isRecurring: false },
    { date: addDays(easter, -1), name: "Easter Saturday", state: "NAT", isRecurring: false },
    { date: addDays(easter, 1), name: "Easter Monday", state: "NAT", isRecurring: false },
    { date: new Date(year, 3, 25), name: "ANZAC Day", state: "NAT", isRecurring: true },
    { date: secondMondayOfJune(year), name: "King's Birthday", state: "VIC", isRecurring: false },
    { date: aflGrandFinalFridayVIC(year), name: "AFL Grand Final Friday", state: "VIC", isRecurring: false },
    { date: firstTuesdayOfNovember(year), name: "Melbourne Cup", state: "VIC", isRecurring: false },
    { date: new Date(year, 11, 25), name: "Christmas Day", state: "NAT", isRecurring: true },
    { date: new Date(year, 11, 26), name: "Boxing Day", state: "NAT", isRecurring: true },
  ];
  return holidays.map((h) => ({ ...h, date: startOfDay(h.date) }));
}

export class PublicHolidaySeedService {
  async seedYear(year: number) {
    await connectDB();
    const holidays = buildSeedHolidays(year);
    const ops = holidays.map((h) => ({
      updateOne: {
        filter: { date: h.date, state: h.state },
        update: { $set: { date: h.date, state: h.state, name: h.name, isRecurring: h.isRecurring } },
        upsert: true,
      },
    }));

    const result = await PublicHolidaysDbQueries.bulkUpsert(ops);
    const upserted = typeof (result as any).upsertedCount === "number" ? (result as any).upsertedCount : 0;
    const matchedOrModified =
      (typeof (result as any).matchedCount === "number" ? (result as any).matchedCount : 0) +
      (typeof (result as any).modifiedCount === "number" ? (result as any).modifiedCount : 0);

    return { success: true, year, upserted, matchedOrModified };
  }
}

export const publicHolidaySeedService = new PublicHolidaySeedService();

