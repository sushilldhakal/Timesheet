// Minimal shared types used by calendar-context.tsx

export type TEventColor = "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray"
export type TBadgeVariant = "dot" | "colored" | "mixed"
export type TWorkingHours = { [key: number]: { from: number; to: number } }
export type TVisibleHours = { from: number; to: number }

/** Base view without the "list" prefix */
export type BaseView = "day" | "week" | "month" | "year"

/** Full view string including list variants */
export type ViewString =
  | "day"
  | "week"
  | "month"
  | "year"
  | "listday"
  | "listweek"
  | "listmonth"
  | "listyear"

export interface IUser {
  id: string
  name: string
  picturePath: string | null
  location?: string[]
  role?: string[]
  employer?: string[]
}

export interface IEvent {
  id: number | string
  startDate: string
  endDate: string
  title: string
  color: TEventColor
  description: string
  user: IUser
}

