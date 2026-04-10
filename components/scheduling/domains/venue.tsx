import React from "react"
import { Scheduler } from "../Scheduler"
import { createSchedulerConfig } from "../config"
import type { Block, Resource } from "../core/types-scheduler"
import type { SchedulerConfig } from "../core/types-scheduler"

export interface SchedulerVenueProps extends Omit<React.ComponentProps<typeof Scheduler>, "config"> {
  config?: Partial<SchedulerConfig>
}

/**
 * Venue bookings — single-day timeline, no view tabs.
 */
export function SchedulerVenue({
  config: configOverrides,
  ...props
}: SchedulerVenueProps): React.ReactElement {
  const config = createSchedulerConfig({ preset: "venue", ...configOverrides })
  return (
    <Scheduler
      {...props}
      config={{ ...config, views: { timeline: true } }}
      initialView="timeline"
      showViewTabs={false}
      showAddShiftButton={true}
      addShiftLabel="Add Booking"
    />
  )
}

export type { Block, Resource }
