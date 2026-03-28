import { create } from "zustand"
import type { IUserSchedulingSettings } from "@/lib/db/schemas/user"

type State = {
  schedulingSettings: IUserSchedulingSettings | null
  setSchedulingSettings: (s: IUserSchedulingSettings | null) => void
}

export const useSchedulingSettingsStore = create<State>((set) => ({
  schedulingSettings: null,
  setSchedulingSettings: (schedulingSettings) => set({ schedulingSettings }),
}))
