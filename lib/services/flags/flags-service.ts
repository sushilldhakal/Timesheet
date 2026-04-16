import { format, parse, isValid, subDays } from "date-fns";
import { connectDB } from "@/lib/db";
import { FlagsDbQueries } from "@/lib/db/queries/flags";
import type { FlagIssueType, FlagRow } from "@/lib/types/flags";

function getIssueType(hasImage: boolean, hasLocation: boolean): FlagIssueType | null {
  if (!hasImage && !hasLocation) return "no_image_no_location";
  if (!hasImage) return "no_image";
  if (!hasLocation) return "no_location";
  return null;
}

export class FlagsService {
  async list(query: any) {
    await connectDB();
    const { filter, limit = 50, offset = 0, sortBy = "date", order = "desc" } = query || {};

    const filterType = filter as FlagIssueType | undefined;
    const validFilters: FlagIssueType[] = ["no_image", "no_location", "no_image_no_location"];
    const validFilterType = filterType && validFilters.includes(filterType) ? filterType : null;

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = subDays(end, 29);
    start.setHours(0, 0, 0, 0);

    const shifts = await FlagsDbQueries.listFlaggedShiftsLean({ start, end });
    const pins = [...new Set((shifts as any[]).map((s) => String((s as any).pin ?? "")))].filter(Boolean);
    const employees = await FlagsDbQueries.listEmployeesByPinsLean(pins);

    const pinToName = new Map<string, string>();
    const pinToId = new Map<string, string>();
    (employees as any[]).forEach((e) => {
      pinToName.set(e.pin, e.name ?? "");
      pinToId.set(e.pin, String(e._id));
    });

    const rows: FlagRow[] = [];
    for (const shift of shifts as any[]) {
      const shiftDate = shift.date instanceof Date ? format(shift.date, "dd-MM-yyyy") : String(shift.date ?? "");

      if (shift.clockIn?.flag) {
        const imageStr = String(shift.clockIn.image ?? "").trim();
        const hasLocation = !!(shift.clockIn.lat && shift.clockIn.lng);
        const hasImage = imageStr.length > 0;
        const issueType = getIssueType(hasImage, hasLocation);
        if (issueType) {
          if (validFilterType) {
            if (validFilterType === "no_image" && hasImage) continue;
            if (validFilterType === "no_location" && hasLocation) continue;
            if (validFilterType === "no_image_no_location" && issueType !== "no_image_no_location") continue;
          }
          rows.push({
            id: `${shift.pin}-${shiftDate}-in`,
            employeeId: pinToId.get(String(shift.pin ?? "")) ?? "",
            date: shiftDate,
            pin: String(shift.pin ?? ""),
            name: pinToName.get(String(shift.pin ?? "")) ?? "",
            type: "in",
            typeLabel: "Clock In",
            hasImage,
            hasLocation,
            issueType,
          });
        }
      }

      if (shift.clockOut?.flag) {
        const imageStr = String(shift.clockOut.image ?? "").trim();
        const hasLocation = !!(shift.clockOut.lat && shift.clockOut.lng);
        const hasImage = imageStr.length > 0;
        const issueType = getIssueType(hasImage, hasLocation);
        if (issueType) {
          if (validFilterType) {
            if (validFilterType === "no_image" && hasImage) continue;
            if (validFilterType === "no_location" && hasLocation) continue;
            if (validFilterType === "no_image_no_location" && issueType !== "no_image_no_location") continue;
          }
          rows.push({
            id: `${shift.pin}-${shiftDate}-out`,
            employeeId: pinToId.get(String(shift.pin ?? "")) ?? "",
            date: shiftDate,
            pin: String(shift.pin ?? ""),
            name: pinToName.get(String(shift.pin ?? "")) ?? "",
            type: "out",
            typeLabel: "Clock Out",
            hasImage,
            hasLocation,
            issueType,
          });
        }
      }
    }

    const parseDateForSort = (s: string) => {
      try {
        const d1 = parse(s, "dd-MM-yyyy", new Date());
        if (isValid(d1)) return d1.getTime();
        const d2 = parse(s, "yyyy-MM-dd", new Date());
        return isValid(d2) ? d2.getTime() : 0;
      } catch {
        return 0;
      }
    };

    const mul = order === "asc" ? 1 : -1;
    rows.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortBy === "date") {
        cmp = parseDateForSort(a.date) - parseDateForSort(b.date);
      } else if (sortBy === "name" || sortBy === "pin" || sortBy === "typeLabel" || sortBy === "issueType") {
        const aVal = sortBy === "name" ? a.name : sortBy === "pin" ? a.pin : sortBy === "typeLabel" ? a.typeLabel : a.issueType;
        const bVal = sortBy === "name" ? b.name : sortBy === "pin" ? b.pin : sortBy === "typeLabel" ? b.typeLabel : b.issueType;
        cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
      } else if (sortBy === "hasImage" || sortBy === "hasLocation") {
        const aVal = sortBy === "hasImage" ? a.hasImage : a.hasLocation;
        const bVal = sortBy === "hasImage" ? b.hasImage : b.hasLocation;
        cmp = (aVal ? 1 : 0) - (bVal ? 1 : 0);
      }
      if (cmp !== 0) return cmp * mul;
      return (parseDateForSort(a.date) - parseDateForSort(b.date)) * mul;
    });

    const total = rows.length;
    const paginated = rows.slice(offset, offset + limit);
    return { items: paginated, total, limit, offset };
  }
}

export const flagsService = new FlagsService();

