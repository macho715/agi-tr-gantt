'use client'

import * as React from 'react'

import tideDatasetJson from '@/data/tide-data-2026Q1.json'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

type TideDay = {
  date: string // YYYY-MM-DD
  values: number[] // length 24
  min: number
  max: number
  minHour: number
  maxHour: number
}

type TideDataset = {
  meta: {
    title?: string
    location?: string
    vertical_datum?: string
    meanSeaLevelMeters?: number
    start_date?: string
    end_date?: string
    [k: string]: unknown
  }
  hours: number[]
  days: TideDay[]
}

const tideDataset = tideDatasetJson as unknown as TideDataset

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatHour(h: number) {
  return `${pad2(h)}:00`
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function pickInitialDate({
  todayIso,
  minDate,
  maxDate,
  fallback,
}: {
  todayIso: string
  minDate?: string
  maxDate?: string
  fallback: string
}) {
  if (!minDate || !maxDate) return todayIso
  if (todayIso >= minDate && todayIso <= maxDate) return todayIso
  return fallback
}

function TideSparkline({
  values,
  min,
  max,
  mean,
}: {
  values: number[]
  min: number
  max: number
  mean?: number
}) {
  // Render a simple, dependency-free sparkline using SVG.
  const safeMin = Number.isFinite(min) ? min : 0
  const safeMax = Number.isFinite(max) && max !== min ? max : min + 1

  const points = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * 100
    const y = (1 - (v - safeMin) / (safeMax - safeMin)) * 100
    return [x, clamp(y, 0, 100)] as const
  })

  const d = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ')

  const meanY =
    typeof mean === 'number' && Number.isFinite(mean)
      ? clamp((1 - (mean - safeMin) / (safeMax - safeMin)) * 100, 0, 100)
      : null

  return (
    <div className="w-full rounded-md border bg-muted/30 p-2">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-24 w-full"
        role="img"
        aria-label="Hourly tide height sparkline"
      >
        {meanY !== null ? (
          <line
            x1="0"
            y1={meanY}
            x2="100"
            y2={meanY}
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>00:00</span>
        <span>23:00</span>
      </div>
    </div>
  )
}

export function WaterTidePanel({
  compact = false,
  className,
  title = 'Water Tide',
}: {
  compact?: boolean
  className?: string
  title?: string
}) {
  const dayByDate = React.useMemo(() => {
    const map = new Map<string, TideDay>()
    for (const d of tideDataset.days) map.set(d.date, d)
    return map
  }, [])

  const minDate = tideDataset.meta.start_date
  const maxDate = tideDataset.meta.end_date

  const todayIso = React.useMemo(() => new Date().toISOString().slice(0, 10), [])
  const fallback = tideDataset.days[0]?.date ?? todayIso

  const [selectedDate, setSelectedDate] = React.useState(
    pickInitialDate({ todayIso, minDate, maxDate, fallback })
  )

  const selectedDay = dayByDate.get(selectedDate) ?? tideDataset.days[0]

  const locationLabel = (tideDataset.meta.location ?? tideDataset.meta.title ?? 'Tide dataset') as string
  const meanSeaLevel =
    typeof tideDataset.meta.meanSeaLevelMeters === 'number' ? tideDataset.meta.meanSeaLevelMeters : undefined

  return (
    <Card className={cn(className)}>
      <CardHeader className={cn(compact ? 'pb-2' : undefined)}>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>{title}</span>
          {tideDataset.meta.vertical_datum ? (
            <Badge variant="secondary" className="shrink-0">
              Datum {String(tideDataset.meta.vertical_datum)}
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription className="truncate">{locationLabel}</CardDescription>
      </CardHeader>

      <CardContent className={cn(compact ? 'pt-0' : undefined)}>
        {!selectedDay ? (
          <div className="text-sm text-muted-foreground">No tide data loaded.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={cn('h-8', compact ? 'text-xs' : undefined)}
                aria-label="Select date for tide"
              />
              <Button
                type="button"
                variant="outline"
                size={compact ? 'sm' : 'sm'}
                className={cn('h-8', compact ? 'px-2 text-xs' : undefined)}
                onClick={() => {
                  const next = pickInitialDate({ todayIso, minDate, maxDate, fallback })
                  setSelectedDate(next)
                }}
              >
                Today
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="default">
                High {selectedDay.max.toFixed(2)} m @ {formatHour(selectedDay.maxHour)}
              </Badge>
              <Badge variant="outline">
                Low {selectedDay.min.toFixed(2)} m @ {formatHour(selectedDay.minHour)}
              </Badge>
              {meanSeaLevel !== undefined ? (
                <Badge variant="secondary">MSL {meanSeaLevel.toFixed(2)} m</Badge>
              ) : null}
            </div>

            <TideSparkline
              values={selectedDay.values}
              min={Math.min(selectedDay.min, meanSeaLevel ?? selectedDay.min)}
              max={Math.max(selectedDay.max, meanSeaLevel ?? selectedDay.max)}
              mean={meanSeaLevel}
            />

            {/* Daily extremes list: scrollable so it fits as a “window/card”. */}
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Daily highs/lows</div>
              <ScrollArea className={cn('rounded-md border', compact ? 'h-32' : 'h-40')}>
                <div className="p-1">
                  {tideDataset.days.map((d) => {
                    const active = d.date === selectedDate
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setSelectedDate(d.date)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1 text-left text-xs',
                          'hover:bg-accent hover:text-accent-foreground',
                          active ? 'bg-accent text-accent-foreground' : 'text-foreground'
                        )}
                      >
                        <span className="font-medium tabular-nums">{d.date}</span>
                        <span className="truncate text-muted-foreground">
                          L {d.min.toFixed(2)}@{formatHour(d.minHour)} · H {d.max.toFixed(2)}@{formatHour(d.maxHour)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
