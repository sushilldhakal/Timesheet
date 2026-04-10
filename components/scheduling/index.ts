// @shadcn-scheduler — unified flat export
// This is the main entry point for the scheduling component library

// ─── Core Scheduler Component ─────────────────────────────────────────────────
export { Scheduler } from './Scheduler'
export type { SchedulerProps, SchedulerHeaderActions } from './Scheduler'

// ─── Context & Provider ───────────────────────────────────────────────────────
export { SchedulerProvider, useSchedulerContext, SchedulerContext, nextUid } from './context'
export type { SchedulerProviderProps, SchedulerContextValue } from './context'

// ─── Configuration ────────────────────────────────────────────────────────────
export {
  createSchedulerConfig,
  extendConfig,
  createRosterConfig,
  createTvConfig,
  createConferenceConfig,
  createFestivalConfig,
  createHealthcareConfig,
  createGanttConfig,
  createVenueConfig,
} from './config'
export type { SchedulerPresetName } from './config'

// ─── Core Types & Constants ───────────────────────────────────────────────────
export type {
  Block,
  Resource,
  ResourceKind,
  ViewKey,
  Settings,
  WorkingHours,
  BadgeVariant,
  CategoryColor,
  SchedulerConfig,
  SchedulerLabels,
  SchedulerSettingsContext,
  SchedulerSlots,
  BlockSlotProps,
  ResourceHeaderSlotProps,
  TimeSlotLabelSlotProps,
  EmptyCellSlotProps,
  EmptyStateSlotProps,
  SchedulerToolbarContext,
  RecurrenceRule,
  RecurrenceFreq,
  ShiftDependency,
  DependencyType,
  EmployeeAvailability,
  AvailabilityWindow,
  HistogramConfig,
  HistogramCapacity,
  SchedulerMarker,
  FlatRow,
  RowMode,
} from './core/types-scheduler'

export {
  DEFAULT_SETTINGS,
  DEFAULT_CATEGORY_COLORS,
  getCategoryColor,
  toDateISO,
  parseBlockDate,
  sameDay,
  snapToInterval,
} from './core/constants-scheduler'

// ─── Core Utilities ───────────────────────────────────────────────────────────
export { findConflicts } from './core/packing'
export { expandRecurrence, expandAllRecurring } from './core/recurrence'
export { formatInTimezone, formatTimeInTimezone } from './core/timezone'
export { exportToCSV, exportToImage, exportToPDF, exportToICS } from './core/export'

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useFlatRows, buildFlatRowTops, employeesForCategory } from './hooks/useFlatRows'
export { useLongPress } from './hooks/useLongPress'
export type { LongPressOptions } from './hooks/useLongPress'
export { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from './hooks/useMediaQuery'
export { useAuditTrail } from './hooks/useAuditTrail'
export type { AuditEntry, AuditAction, UseAuditTrailReturn } from './hooks/useAuditTrail'
export { useDragEngine } from './hooks/useDragEngine'
export { useScrollToNow } from './hooks/useScrollToNow'

// ─── Grid Engine ──────────────────────────────────────────────────────────────
export { GridView } from './grid/GridView'
export type { GridViewProps } from './grid/GridView'
export { GridViewSidebar } from './grid/GridViewSidebar'
export { StaffPanel } from './grid/StaffPanel'
export { UserSelect } from './grid/UserSelect'
export { DragEngine } from './grid/dragEngine'
export type { DragCommit, DragEngineOptions } from './grid/dragEngine'
export {
  makeGridConfig,
  blockRect,
  ghostRect,
  xToHour,
  xToDateIndex,
} from './grid/geometry'
export type { GridConfig, BlockRect } from './grid/geometry'

// ─── Views ────────────────────────────────────────────────────────────────────
export { DayView, WeekView } from './views/DayWeekViews'
export type { DayViewProps, WeekViewProps } from './views/DayWeekViews'
export { MonthView } from './views/MonthView'
export { YearView } from './views/YearView'
export { ListView } from './views/ListView'
export { TimelineView } from './views/TimelineView'
export type { TimelineViewProps } from './views/TimelineView'
export { KanbanView } from './views/KanbanView'
export { DayViewPanelChrome } from './views/DayViewPanelChrome'

// ─── Modals ───────────────────────────────────────────────────────────────────
export { AddShiftModal } from './modals/AddShiftModal'
export { DayShiftsDialog } from './modals/DayShiftsDialog'
export { RoleWarningModal } from './modals/RoleWarningModal'
export { ShiftModal } from './modals/ShiftModal'

// ─── Settings ─────────────────────────────────────────────────────────────────
export { SchedulerSettings } from './settings/SchedulerSettings'
export { ChangeBadgeVariantInput } from './settings/ChangeBadgeVariantInput'
export { ChangeRowModeInput } from './settings/ChangeRowModeInput'
export { ChangeVisibleHoursInput } from './settings/ChangeVisibleHoursInput'
export { ChangeWorkingHoursInput } from './settings/ChangeWorkingHoursInput'

// ─── UI Components ────────────────────────────────────────────────────────────
export { BottomSheet } from './ui/BottomSheet'
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from './ui/context-menu'

// ─── Shell / Plugin System ────────────────────────────────────────────────────
export { PluginManager } from './shell/PluginManager'
export { SchedulerShell } from './shell/SchedulerShell'
export { SlotRenderer } from './shell/SlotRenderer'
export * from './shell/types'
export * from './shell/hooks'

// ─── Top-level Components ─────────────────────────────────────────────────────
export { RosterActions } from './RosterActions'
export { ResourceHistogram } from './ResourceHistogram'
export { DateNavigator } from './DateNavigator'
export { ViewTabs } from './ViewTabs'

// ─── Domain Presets ───────────────────────────────────────────────────────────
export { SchedulerDefault } from './domains/default'
export type { SchedulerDefaultProps } from './domains/default'
export { SchedulerTV } from './domains/tv'
export type { SchedulerTVProps } from './domains/tv'
export { SchedulerConference } from './domains/conference'
export type { SchedulerConferenceProps } from './domains/conference'
export { SchedulerFestival } from './domains/festival'
export type { SchedulerFestivalProps } from './domains/festival'
export { SchedulerHealthcare } from './domains/healthcare'
export type { SchedulerHealthcareProps } from './domains/healthcare'
export { SchedulerGantt } from './domains/gantt'
export type { SchedulerGanttProps } from './domains/gantt'
export { SchedulerVenue } from './domains/venue'
export type { SchedulerVenueProps } from './domains/venue'

// ─── Weather Components (already flat) ────────────────────────────────────────
export { AmChartsWeatherIcon } from './weather/AmChartsWeatherIcon'
export { SchedulingWeatherDayBadge } from './weather/SchedulingWeatherDayBadge'
