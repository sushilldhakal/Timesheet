'use client'

import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, MapPinOff } from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { cn } from '@/lib/utils/cn'
import type { WeatherDayPayload, WeatherForecastApiResponse } from '@/lib/weather/types'
import { wmoCodeIconKind } from '@/lib/weather/wmo-weather'
import { AmChartsWeatherIcon } from './AmChartsWeatherIcon'

function toDateISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function WeatherDetailBody({ d, forDate }: { d: WeatherDayPayload; forDate: Date }) {
  const kind = wmoCodeIconKind(d.weatherCode)
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[13px] leading-snug text-foreground">{d.summary}</p>

      <div className="flex items-start gap-3">
        <AmChartsWeatherIcon kind={kind} forDate={forDate} size="lg" />
        <div className="flex min-w-0 flex-col gap-0.5 text-[13px] leading-tight">
          <div>
            High{' '}
            <span className="font-semibold tabular-nums text-foreground">{d.high}°</span>
          </div>
          <div>
            Low{' '}
            <span className="font-semibold tabular-nums text-foreground">{d.low}°</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 text-[11px] leading-snug text-muted-foreground">
        <span>
          Precip chance{' '}
          <span className="tabular-nums text-foreground/90">{d.maxPrecipProb}%</span>
        </span>
        <span>
          Feels like{' '}
          <span className="tabular-nums text-foreground/90">{d.feelsHigh}°</span>
        </span>
      </div>

      <p className="border-t border-border pt-2 text-[10px] leading-tight text-muted-foreground/70">
        Forecast ·{' '}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-muted-foreground"
        >
          Open-Meteo
        </a>
        <br />
        Icons ·{' '}
        <a
          href="https://www.amcharts.com/free-animated-svg-weather-icons/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-muted-foreground"
        >
          amCharts
        </a>{' '}
        (CC BY 4.0)
      </p>
    </div>
  )
}

export interface SchedulingWeatherDayBadgeProps {
  date: Date
  coords: { lat: number; lng: number } | null | undefined
  /** Batch range (e.g. Mon–Sun) so one request backs all week headers */
  rangeStart?: Date
  rangeEnd?: Date
  className?: string
  iconClassName?: string
}

async function fetchForecast(
  lat: number,
  lng: number,
  start: string,
  end: string,
): Promise<WeatherForecastApiResponse> {
  const u = new URL('/api/weather/forecast', window.location.origin)
  u.searchParams.set('lat', String(lat))
  u.searchParams.set('lng', String(lng))
  u.searchParams.set('start', start)
  u.searchParams.set('end', end)
  const res = await fetch(u.toString(), { credentials: 'include' })
  const json = (await res.json().catch(() => ({}))) as
    | WeatherForecastApiResponse
    | { error?: string }
  if (!res.ok) {
    const msg =
      typeof json === 'object' &&
      json &&
      'error' in json &&
      typeof (json as { error?: string }).error === 'string'
        ? (json as { error: string }).error
        : res.status === 401
          ? 'Sign in to load weather'
          : `Weather request failed (${res.status})`
    throw new Error(msg)
  }
  return json as WeatherForecastApiResponse
}

export function SchedulingWeatherDayBadge({
  date,
  coords,
  rangeStart,
  rangeEnd,
  className,
  iconClassName,
}: SchedulingWeatherDayBadgeProps): ReactElement | null {
  const startIso = toDateISO(rangeStart ?? date)
  const endIso = toDateISO(rangeEnd ?? date)
  const dayIso = toDateISO(date)

  const lat = coords?.lat
  const lng = coords?.lng
  const enabled =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['weather-forecast', lat, lng, startIso, endIso],
    queryFn: () => fetchForecast(lat!, lng!, startIso, endIso),
    enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

  const errorHint =
    error instanceof Error ? error.message : 'Could not load weather.'

  if (!enabled) {
    return (
      <span
        className={cn('inline-flex text-muted-foreground/50', className)}
        title="Add latitude and longitude to this location to show weather"
      >
        <MapPinOff className={cn('size-5', iconClassName)} aria-hidden />
      </span>
    )
  }

  const day: WeatherDayPayload | undefined = data?.days[dayIso]
  const code = day?.weatherCode ?? 0
  const kind = wmoCodeIconKind(code)

  return (
    <HoverCard openDelay={280} closeDelay={120}>
      <HoverCardTrigger asChild>
        {/* span — not <button>, so this can sit inside day-strip <button> without invalid HTML */}
        <span
          role="button"
          tabIndex={0}
          className={cn(
            'inline-flex cursor-pointer items-center justify-center rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
          aria-label={`Weather for ${dayIso}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
          }}
        >
          {isLoading ? (
            <Loader2 className={cn('size-5 animate-spin', iconClassName)} />
          ) : isError || !day ? (
            <AmChartsWeatherIcon
              kind="cloud"
              forDate={date}
              size="sm"
              className={cn('opacity-45', iconClassName)}
            />
          ) : (
            <AmChartsWeatherIcon
              kind={kind}
              forDate={date}
              size="sm"
              className={iconClassName}
            />
          )}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        align="center"
        side="bottom"
        className="w-[min(100vw-1.5rem,240px)] rounded-md border-border bg-popover p-3.5 shadow-md"
      >
        {day ? (
          <WeatherDetailBody d={day} forDate={date} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {isError ? errorHint : 'No forecast for this day at this location.'}
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}
