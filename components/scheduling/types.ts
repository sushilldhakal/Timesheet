// Calendar Context Types - specific to the timesheet application
export type TEventColor = "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray";
export type TBadgeVariant = "dot" | "colored" | "mixed";
export type TWorkingHours = { [key: number]: { from: number; to: number } };
export type TVisibleHours = { from: number; to: number };

/** Base view without the "list" prefix */
export type BaseView = "day" | "week" | "month" | "year"

/** Full view string including list variants */
export type ViewString =
  | "day" | "week" | "month" | "year"
  | "listday" | "listweek" | "listmonth" | "listyear"

export interface IUser {
  id: string;
  name: string;
  picturePath: string | null;
  location?: string[]; // Array of location names assigned to the user
  role?: string[]; // Array of role names assigned to the user
  employer?: string[]; // Array of employer names assigned to the user
}

export interface IEvent {
  id: number | string;
  startDate: string;
  endDate: string;
  title: string;
  color: TEventColor;
  description: string;
  user: IUser;
}

export interface ICalendarCell {
  day: number;
  currentMonth: boolean;
  date: Date;
}

// Legacy types for backward compatibility (use core types for new code)
export type ShiftStatus = "draft" | "published"

export interface RoleColor {
  bg: string
  light: string
  text: string
  border: string
}

export interface Employee {
  id: string
  name: string
  /** role id this employee primarily belongs to */
  role: string
  avatar: string
  colorIdx: number
}

export interface Role {
  id: string
  name: string
  colorIdx: number
}

export interface Shift {
  id: string
  roleId: string
  employeeId: string
  date: Date
  startH: number
  endH: number
  /** Display name — denormalised copy of Employee.name */
  employee: string
  status: ShiftStatus
}