import { Roster, getWeekBoundaries } from "@/lib/db/schemas/roster";

export class RosterDbQueries {
  static async findRosterByWeekId(weekId: string) {
    return await Roster.findOne({ weekId });
  }

  static async requireRosterByWeekId(weekId: string) {
    const roster = await Roster.findOne({ weekId });
    if (!roster) return null;
    return roster;
  }

  static async createRosterIfMissing(weekId: string) {
    let roster = await Roster.findOne({ weekId });
    if (roster) return roster;

    const { start, end } = getWeekBoundaries(weekId);
    const [yearStr, weekStr] = weekId.split("-W");

    roster = await Roster.create({
      weekId,
      year: parseInt(yearStr, 10),
      weekNumber: parseInt(weekStr, 10),
      weekStartDate: start,
      weekEndDate: end,
      shifts: [],
      status: "draft",
    });

    return roster;
  }
}

