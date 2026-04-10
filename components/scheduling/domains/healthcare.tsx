import React from "react"
import { Scheduler } from "../Scheduler"
import { createSchedulerConfig } from "../config"
import type { Block, Resource } from "../core/types-scheduler"
import type { SchedulerConfig } from "../core/types-scheduler"

export interface SchedulerHealthcareProps extends Omit<React.ComponentProps<typeof Scheduler>, "config"> {
  config?: Partial<SchedulerConfig>
}

/**
 * Healthcare-domain scheduler: Ward/Rota vocabulary.
 * Applies preset "healthcare"; pass config to override.
 */
export function SchedulerHealthcare({
  config: configOverrides,
  ...props
}: SchedulerHealthcareProps): React.ReactElement {
  const config = createSchedulerConfig({ preset: "healthcare", ...configOverrides })
  return <Scheduler {...props} config={config} />
}

export type { Block, Resource }
