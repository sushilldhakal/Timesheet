'use client'

import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import type { WeatherIconKind } from '@/lib/weather/wmo-weather'

const BASE = '/weather/amcharts'

/** For “today”, use local clock for day vs night assets; other days use daytime variants for roster context */
function nightForScheduleDate(forDate: Date): boolean {
  const cal = new Date(forDate.getFullYear(), forDate.getMonth(), forDate.getDate())
  const now = new Date()
  const todayCal = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (cal.getTime() !== todayCal.getTime()) return false
  const h = now.getHours()
  return h < 6 || h >= 20
}

function fileForKind(kind: WeatherIconKind, isNight: boolean): string {
  switch (kind) {
    case 'clear':
      return isNight ? 'night.svg' : 'day.svg'
    case 'partly':
      return isNight ? 'cloudy-night-2.svg' : 'cloudy-day-2.svg'
    case 'cloud':
      return 'cloudy.svg'
    case 'fog':
      return isNight ? 'cloudy-night-1.svg' : 'cloudy-day-1.svg'
    case 'drizzle':
      return 'rainy-2.svg'
    case 'rain':
      return 'rainy-5.svg'
    case 'snow':
      return 'snowy-4.svg'
    case 'storm':
      return 'thunder.svg'
    default:
      return 'cloudy.svg'
  }
}

export type AmChartsWeatherIconSize = 'sm' | 'lg'

const px: Record<AmChartsWeatherIconSize, number> = {
  sm: 22,
  lg: 48,
}

/**
 * amCharts animated SVGs (CSS inside file). Use <img> — <object> is blank when static SVG
 * responses carry X-Frame-Options: DENY from a global Next header rule.
 * @see https://www.amcharts.com/free-animated-svg-weather-icons/
 */
export function AmChartsWeatherIcon({
  kind,
  forDate,
  size = 'sm',
  className,
}: {
  kind: WeatherIconKind
  forDate: Date
  size?: AmChartsWeatherIconSize
  className?: string
}): ReactElement {
  const isNight = useMemo(() => nightForScheduleDate(forDate), [forDate])
  const file = fileForKind(kind, isNight)
  const src = `${BASE}/${file}`
  const s = px[size]

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden', className)}
      style={{ width: s, height: s, minWidth: s, minHeight: s }}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        width={s}
        height={s}
        decoding="async"
        draggable={false}
        className="block h-full w-full select-none object-contain"
      />
    </span>
  )
}
