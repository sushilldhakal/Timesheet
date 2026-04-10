import React from "react"
import { Scheduler } from "../Scheduler"
import { createSchedulerConfig } from "../config"
import type { Block, Resource } from "../core/types-scheduler"
import type { SchedulerConfig } from "../core/types-scheduler"

export interface SchedulerConferenceProps extends Omit<React.ComponentProps<typeof Scheduler>, "config"> {
  config?: Partial<SchedulerConfig>
}

/**
 * Conference schedule — single-day timeline, no view tabs.
 */
export function SchedulerConference({
  config: configOverrides,
  ...props
}: SchedulerConferenceProps): React.ReactElement {
  const config = createSchedulerConfig({ preset: "conference", ...configOverrides })
  return (
    <Scheduler
      {...props}
      config={{ ...config, views: { timeline: true } }}
      initialView="timeline"
      showViewTabs={false}
      showAddShiftButton={false}
      
    />
  )
}

export type { Block, Resource }
