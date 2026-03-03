import type { TEventColor } from "@/components/calendar/types";

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
