import React from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Block, Resource, FlatRow, SchedulerSlots } from '@/components/scheduling/core/types-scheduler';
import { toDateISO } from "@/components/scheduling/core/constants-scheduler";
import { useSchedulerContext } from '@/components/scheduling/shell/SchedulerProvider';
import type { Virtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils/cn";
import { GROUP_SIDEBAR_STACK_H } from "@/components/scheduling/core/constants-scheduler";

function categorySidebarMeta(cat: Resource): {
  groupName?: string;
  groupColor?: string;
  teamColor?: string;
} {
  const m = cat.meta as Record<string, unknown> | undefined;
  return {
    groupName: typeof m?.groupName === "string" ? m.groupName : undefined,
    groupColor: typeof m?.groupColor === "string" ? m.groupColor : undefined,
    teamColor: typeof m?.teamColor === "string" ? m.teamColor : undefined,
  };
}
import type { StaffPanelState, AddPromptState } from "./GridView";
import { employeesForCategory } from "@/components/scheduling/hooks/useFlatRows";

export interface GridViewSidebarProps {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
  toggleSidebar: () => void;
  HOUR_HDR_H: number;
  ROLE_HDR: number;
  sortBy: "name" | "hours" | "scheduled" | null;
  sortDir: "asc" | "desc";
  toggleSort: (col: "name" | "hours" | "scheduled") => void;
  flatRows: FlatRow[];
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  totalHVirtual: number;
  ALL_EMPLOYEES: Resource[];
  baseShifts: Block[];
  isWeekView: boolean;
  isDayViewMultiDay?: boolean;
  focusedDate: Date | undefined;
  dates: Date[];
  selEmps: Set<string>;
  collapsed: Set<string>;
  toggleCollapse: (id: string) => void;
  hoveredCategoryId: string | null;
  setStaffPanel: React.Dispatch<React.SetStateAction<StaffPanelState | null>>;
  setAddPrompt: React.Dispatch<React.SetStateAction<AddPromptState | null>>;
  slots: SchedulerSlots;
  categoryHeights: Record<string, number>;
  /** Single-day overview: richer staff rail (initials tile, shift times, name). */
  dayOverviewStaffRail?: boolean;
}

export function GridViewSidebar({
  sidebarCollapsed,
  sidebarWidth,
  setSidebarWidth,
  toggleSidebar,
  HOUR_HDR_H,
  ROLE_HDR,
  sortBy,
  sortDir,
  toggleSort,
  flatRows,
  rowVirtualizer,
  totalHVirtual,
  ALL_EMPLOYEES,
  baseShifts,
  isWeekView,
  isDayViewMultiDay,
  focusedDate,
  dates,
  selEmps,
  collapsed,
  toggleCollapse,
  hoveredCategoryId,
  setStaffPanel,
  setAddPrompt,
  slots,
  categoryHeights,
  dayOverviewStaffRail = false,
}: GridViewSidebarProps): React.ReactElement {
  const { labels, getColor, timelineSidebarFlat, getTimeLabel } = useSchedulerContext();
  // Flat sidebar: active when config requests it AND we are in timeline (multiday) mode
  const flatSidebar = !!(timelineSidebarFlat && isDayViewMultiDay)
  const loggedCatsRef = React.useRef<Set<string>>(new Set())
  const loggedEmpsRef = React.useRef<Set<string>>(new Set())
  // Shifts for the visible date window
  const visibleShifts = React.useMemo(() => {
    const refDate = focusedDate ?? dates[0];
    const isEmpSelected = (empId: string): boolean => selEmps.size === 0 || selEmps.has(empId)
    const isoForShift = (sh: Block): string => {
      // IMPORTANT: use *local* day keys (toDateISO) so day view matches what users see
      // in their timezone (avoids off-by-one when Date is stored as UTC midnight).
      // Block.date isn't consistently typed across consumers, so runtime-check.
      const d = (sh as unknown as { date: unknown }).date
      if (typeof d === "string") return d.slice(0, 10)
      if (d instanceof Date) return toDateISO(d)
      return String(d).slice(0, 10)
    }
    if (!refDate) return baseShifts.filter((s) => isEmpSelected(s.employeeId));
    if (isWeekView) {
      const dow = refDate.getDay();
      const ws = new Date(refDate);
      ws.setDate(refDate.getDate() - (dow === 0 ? 6 : dow - 1));
      ws.setHours(0, 0, 0, 0);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      we.setHours(23, 59, 59, 999);
      const s = toDateISO(ws);
      const e = toDateISO(we);
      return baseShifts.filter(
        (sh) => {
          const d = isoForShift(sh)
          return isEmpSelected(sh.employeeId) && d >= s && d <= e
        },
      );
    }
    const iso = toDateISO(refDate);
    return baseShifts.filter(
      (sh) => isoForShift(sh) === iso && isEmpSelected(sh.employeeId),
    );
  }, [baseShifts, isWeekView, focusedDate, dates, selEmps]);

  // Build a map: categoryId → { vrStart, vrSize } for sticky calc
  const catVrMap = React.useMemo(() => {
    const map: Record<string, { start: number; size: number }> = {};
    rowVirtualizer.getVirtualItems().forEach((vr) => {
      const row = flatRows[vr.index];
      if (row?.kind === "category") {
        map[row.category.id] = { start: vr.start, size: vr.size };
      }
    });
    return map;
  }, [rowVirtualizer, flatRows]);

  // For each category, total height = catVr.size + sum of its employee row sizes
  const catTotalHeights = React.useMemo(() => {
    const map: Record<string, number> = {};
    // Walk flatRows: accumulate heights per category from the accurate categoryHeights map
    for (const row of flatRows) {
      const key =
        row.kind === "employee" && row.employee
          ? `emp:${row.employee.id}`
          : `cat:${row.category.id}`;
      const h =
        categoryHeights[key] ?? (row.kind === "category" ? ROLE_HDR : 50);
      map[row.category.id] = (map[row.category.id] ?? 0) + h;
    }
    return map;
  }, [flatRows, categoryHeights, ROLE_HDR]);

  return (
    <>
      {/* ── Sort header — sticky top:0, same height as grid date/hour header ── */}
      <div
        className="sticky top-[64px] z-5 flex shrink-0 flex-col justify-end gap-1 border-b-2 border-border bg-primary-foreground px-2 pb-1.5"
        style={{ height: HOUR_HDR_H }}
      >
        <div className="bg-primary-foreground pl-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          {labels.category ?? "Resources"}
        </div>
        {!flatSidebar && (
          <div className="flex items-center gap-1">
            {(["name", "hours", "scheduled"] as const).map((col) => {
              const colLabel =
                col === "name"
                  ? (labels.category ?? "Category")
                  : col === "hours"
                    ? "Hours"
                    : "Shifts";
              const isActive = sortBy === col;
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => toggleSort(col)}
                  className={cn(
                    "flex cursor-pointer items-center gap-0.5 overflow-hidden text-ellipsis whitespace-nowrap rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wide",
                    col === "name" ? "min-w-0 shrink" : "shrink-0",
                    isActive
                      ? "border-border bg-background font-bold text-foreground"
                      : "border-transparent bg-transparent font-medium text-muted-foreground hover:bg-accent",
                  )}
                >
                  {colLabel}
                  <span
                    className={cn(
                      "ml-px text-[8px]",
                      isActive ? "opacity-100" : "opacity-50",
                    )}
                  >
                    {isActive ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/*
        ── Rows container — same height as grid virtualizer ──
        position:relative + height:totalHVirtual mirrors the grid exactly.
        Each row uses position:absolute + top:vr.start — same coordinates as grid rows.
        Category headers use sticky top:HOUR_HDR_H so they stick below the sort header
        and stack as you scroll through their employee rows.
      */}
      <div className="relative shrink-0" style={{ height: totalHVirtual }}>
        {rowVirtualizer.getVirtualItems().map((vr) => {
          const row = flatRows[vr.index];
          if (!row) return null;
          const cat = row.category;
          const c = getColor(cat.colorIdx);
          const { groupName, groupColor, teamColor } = categorySidebarMeta(cat);
          const headerBodyH = ROLE_HDR + (groupName ? GROUP_SIDEBAR_STACK_H : 0);
          const teamDot = teamColor ?? c.bg;
          const groupDot = groupColor ?? c.bg;

          // ── Category header ──
          if (row.kind === "category") {
            // In timeline mode: render a simple flat list row — just the name and
            // a color accent. No group chrome (progress bar, staff button, collapse).
            if (flatSidebar) {
            const catShiftsFlat = visibleShifts.filter(
              (s) => s.categoryId === cat.id,
            )
              // Debug: log once per category per reload (browser console).
              if (!loggedCatsRef.current.has(cat.id)) {
                loggedCatsRef.current.add(cat.id)
                // eslint-disable-next-line no-console
                console.log("catShiftsFlat", cat.id, catShiftsFlat)
              }
            const catHoursFlat = catShiftsFlat.reduce(
              (sum, s) => sum + (s.endH - s.startH),
              0,
            )
              const initials = cat.name
                .split(" ")
                .map((n) => n[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase()
              return (
                <div
                  key={row.key}
                  className="absolute inset-x-0 flex items-center gap-2 overflow-hidden border-b border-border/60 bg-background transition-colors duration-75"
                  style={{
                    top: vr.start,
                    height: vr.size,
                    background:
                      hoveredCategoryId === cat.id
                        ? `${c.bg}0d`
                        : undefined,
                  }}
                >
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{
                      background: `${c.bg}20`,
                      border: `1.5px solid ${c.bg}40`,
                      color: c.bg,
                    }}
                  >
                    {cat.avatar && !cat.avatar.match(/^[A-Z]{1,2}$/) ? (
                      <img
                        src={cat.avatar}
                        alt={cat.name}
                        className="size-full rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.classList.add("hidden");
                        }}
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {groupName ? (
                      <div className="mb-0.5 flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-2 shrink-0 rounded-full border border-border/40"
                          style={{ background: groupDot }}
                          aria-hidden
                        />
                        <span className="truncate text-[10px] font-semibold text-muted-foreground">
                          {groupName}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full border border-border/40"
                        style={{ background: teamDot }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-foreground">{cat.name}</div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {catShiftsFlat.length} {labels.shift ?? "shift"}
                          {catShiftsFlat.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                  {catHoursFlat > 0 && (
                    <div
                      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ color: c.text, background: c.light }}
                    >
                      {catHoursFlat.toFixed(1)}h
                    </div>
                  )}
                </div>
              )
            }

            const catShifts = visibleShifts.filter(
              (s) => s.categoryId === cat.id,
            );
            const scheduled = catShifts.length;
            const totalHours = catShifts.reduce(
              (sum, s) => sum + (s.endH - s.startH),
              0,
            );
            const staffCount = employeesForCategory(
              cat.id,
              ALL_EMPLOYEES,
              visibleShifts,
            ).length;
            const hoursCapacity = 40;
            const hoursPercent = Math.min(
              100,
              (totalHours / hoursCapacity) * 100,
            );
            const isOverCapacity = totalHours > hoursCapacity;

            const catTotal = catTotalHeights[cat.id] ?? vr.size;

            return (
              <div
                key={row.key}
                // Keep the group background *behind* employee rows (otherwise it can cover
                // the first row when category + employee rows overlap vertically).
                className="pointer-events-none absolute inset-x-0 z-0 transition-colors duration-75"
                style={{
                  top: vr.start,
                  height: catTotal,
                  borderBottom: `1px solid ${c.bg}25`,
                  background:
                    hoveredCategoryId === cat.id ? `${c.bg}14` : `${c.bg}07`,
                }}
              >
                <div
                  className="bg-primary-foreground z-5 flex flex-col pointer-events-auto"
                  style={{
                    top: HOUR_HDR_H,
                    borderBottom: `1px solid ${c.bg}25`,
                  }}
                >
                  <div
                    className="absolute bottom-0 left-0 top-0 w-1 rounded-r-sm"
                    style={{ background: c.bg }}
                  />
                  <div
                    className="flex items-center gap-1.5 pl-3.5 pr-2"
                    style={{ height: headerBodyH }}
                  >
                    {slots.resourceHeader ? (
                      slots.resourceHeader({
                        resource: cat,
                        scheduledCount: scheduled,
                        isCollapsed: collapsed.has(cat.id),
                        onToggleCollapse: () => toggleCollapse(cat.id),
                      })
                    ) : flatSidebar ? (
                      // Timeline / event mode — just the name, no staff stats or Staff button
                      <>
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                          {groupName ? (
                            <div className="flex min-w-0 items-center gap-1.5">
                              <div
                                className="size-2 shrink-0 rounded-full border border-border/40"
                                style={{ background: groupDot }}
                              />
                              <span className="truncate text-[10px] font-semibold text-muted-foreground">
                                {groupName}
                              </span>
                            </div>
                          ) : null}
                          <div className="flex min-w-0 items-center gap-1.5">
                            <div
                              className="size-2.5 shrink-0 rounded-full border border-border/40"
                              style={{ background: teamDot }}
                            />
                            <span className="truncate text-[13px] font-bold text-foreground">
                              {cat.name}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCollapse(cat.id)}
                          aria-label={collapsed.has(cat.id) ? "Expand" : "Collapse"}
                          className={cn(
                            "flex shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-muted-foreground transition-transform duration-200",
                            collapsed.has(cat.id) && "-rotate-90",
                          )}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          {groupName ? (
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span
                                className="size-2 shrink-0 rounded-full border border-border/40"
                                style={{ background: groupDot }}
                                aria-hidden
                              />
                              <span className="truncate text-[10px] font-semibold leading-tight text-muted-foreground">
                                {groupName}
                              </span>
                            </div>
                          ) : null}
                          <div className="flex min-w-0 items-start gap-1.5">
                            <span
                              className="mt-0.5 size-2 shrink-0 rounded-full border border-border/40"
                              style={{ background: teamDot }}
                              aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  "block truncate text-[13px] font-bold leading-tight",
                                  !dayOverviewStaffRail && "text-foreground",
                                )}
                                style={dayOverviewStaffRail ? { color: teamDot } : undefined}
                              >
                                {cat.name}
                              </span>
                              <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                                {staffCount} staff
                                {scheduled > 0
                                  ? ` · ${scheduled} shift${scheduled !== 1 ? "s" : ""}`
                                  : ""}
                                {totalHours > 0 ? ` · ${totalHours.toFixed(1)}h` : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                        {totalHours > 0 && (
                          <div
                            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ color: c.text, background: c.light, border: `1px solid ${c.border}` }}
                            aria-label={`${totalHours.toFixed(1)} hours`}
                            title={`${totalHours.toFixed(1)}h`}
                          >
                            {totalHours.toFixed(1)}h
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleCollapse(cat.id)}
                          aria-label={
                            collapsed.has(cat.id) ? "Expand" : "Collapse"
                          }
                          className={cn(
                            "flex shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-muted-foreground transition-transform duration-200",
                            collapsed.has(cat.id) && "-rotate-90",
                          )}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setStaffPanel((p) =>
                              p?.categoryId === cat.id
                                ? null
                                : { categoryId: cat.id, anchorRect: rect },
                            );
                          }}
                          className="shrink-0 cursor-pointer whitespace-nowrap rounded-md border px-[7px] py-[3px] text-[10px] font-semibold"
                          style={{
                            color: c.text,
                            background: c.light,
                            borderColor: c.border,
                          }}
                        >
                          {labels.staff}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="shrink-0 px-3.5 pb-1.5">
                    <div className="h-1 overflow-hidden rounded-sm bg-border">
                      <div
                        className="h-full rounded-sm transition-[width] duration-300 ease-out"
                        style={{
                          width: `${hoursPercent}%`,
                          background: isOverCapacity
                            ? "var(--destructive)"
                            : c.bg,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // ── Employee row ──
          const emp = row.employee!;
          const empShifts = visibleShifts.filter(
            (s) => s.categoryId === cat.id && s.employeeId === emp.id,
          );
          // Debug Day view staff rail: log once per employee (browser console).
          if (dayOverviewStaffRail && !loggedEmpsRef.current.has(emp.id)) {
            loggedEmpsRef.current.add(emp.id)
            // eslint-disable-next-line no-console
            console.log("dayview-sidebar", {
              empId: emp.id,
              empName: emp.name,
              catId: cat.id,
              visibleShiftsCount: visibleShifts.length,
              empShiftsCount: empShifts.length,
              firstShift: empShifts[0],
              focusedDate,
              dates0: dates[0],
            })
          }
          const empHours = empShifts.reduce(
            (sum, s) => sum + (s.endH - s.startH),
            0,
          );
          const initials = emp.name
            .split(" ")
            .map((n) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase();
          const shiftDateIso =
            empShifts[0]?.date ?? focusedDate?.toISOString().slice(0, 10) ?? dates[0]?.toISOString().slice(0, 10) ?? "";
          const timeRange =
            empShifts.length > 0 && shiftDateIso
              ? (() => {
                  const starts = empShifts.map((s) => s.startH);
                  const ends = empShifts.map((s) => s.endH);
                  const lo = Math.min(...starts);
                  const hi = Math.max(...ends);
                  return { start: getTimeLabel(shiftDateIso, lo), end: getTimeLabel(shiftDateIso, hi) };
                })()
              : null;
          return (
            <div
              key={row.key}
              className="absolute inset-x-0 flex items-center gap-2 overflow-hidden border-b border-border/60 bg-background transition-colors duration-75"
              style={{
                top: vr.start,
                height: vr.size,
                background: dayOverviewStaffRail
                  ? hoveredCategoryId === cat.id
                    ? `${c.bg}12`
                    : `${c.bg}07`
                  : hoveredCategoryId === cat.id
                    ? `${c.bg}0d`
                    : undefined,
              }}
            >
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center text-[10px] font-bold",
                  dayOverviewStaffRail ? "size-9 rounded-md" : "size-8 rounded-full",
                )}
                style={{
                  background: `${c.bg}22`,
                  border: `1.5px solid ${c.bg}45`,
                  color: c.bg,
                }}
              >
                {emp.avatar && !emp.avatar.match(/^[A-Z]{1,2}$/) ? (
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className={cn(
                      "size-full object-cover",
                      dayOverviewStaffRail ? "rounded-md" : "rounded-full",
                    )}
                    onError={(e) => {
                      e.currentTarget.classList.add("hidden");
                    }}
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                {dayOverviewStaffRail ? (
                  <>
                    <div className="truncate text-[9px] font-medium tabular-nums leading-tight text-muted-foreground">
                      {timeRange ? `${timeRange.start} - ${timeRange.end}` : "—"}
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-1.5 shrink-0 rounded-full border border-border/40"
                        style={{ background: teamDot }}
                        aria-hidden
                      />
                      <div className="truncate text-xs font-semibold leading-tight text-foreground">
                        {emp.name}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-1.5 shrink-0 rounded-full border border-border/40"
                        style={{ background: teamDot }}
                        aria-hidden
                      />
                      <div className="truncate text-xs font-semibold text-foreground">{emp.name}</div>
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {empShifts.length} shift{empShifts.length !== 1 ? "s" : ""}
                    </div>
                  </>
                )}
              </div>
              {empHours > 0 && (
                <div
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    color: empHours > 40 ? "var(--destructive)" : c.text,
                    background:
                      empHours > 40
                        ? "color-mix(in srgb, var(--destructive) 10%, transparent)"
                        : c.light,
                  }}
                >
                  {empHours.toFixed(0)}h
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resize handle */}
      <div
        className="absolute top-0 -right-1 z-30 h-full w-2 cursor-col-resize"
        onPointerDown={(e) => {
          e.preventDefault();
          const startX = e.clientX,
            startW = sidebarWidth;
          const onMove = (mv: PointerEvent) =>
            setSidebarWidth(
              Math.max(120, Math.min(400, startW + mv.clientX - startX)),
            );
          const onUp = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
          };
          document.addEventListener("pointermove", onMove);
          document.addEventListener("pointerup", onUp);
        }}
      >
        <div className="absolute bottom-0 left-3 top-0 w-0.5 bg-border" />
      </div>

      {/* Collapse toggle — absolute to sidebar column (fixed + left: sidebarWidth was viewport-relative and misaligned) */}
      <div
        className={cn(
          "absolute top-1/2 z-50 -translate-y-1/2 transition-[left,transform] duration-150 ease-out",
          sidebarCollapsed ? "left-2" : "left-full -translate-x-1/2",
        )}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-7 w-4 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-border bg-background p-0 text-muted-foreground shadow-sm transition-colors duration-150 hover:bg-accent hover:text-foreground"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronsRight size={10} />
          ) : (
            <ChevronsLeft size={10} />
          )}
        </button>
      </div>
    </>
  );
}
