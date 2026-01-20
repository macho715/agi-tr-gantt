'use client'

import * as React from 'react'

import tideDatasetJson from '@/data/tide-data-2026Q1.json'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

type TideDay = {
  date: string
  values: number[]
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

function TideLineChart({ values, min, max }: { values: number[]; min: number; max: number }) {
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

  return (
    <div className="w-full rounded-md border bg-muted/30 p-2">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-44 w-full" role="img" aria-label="Hourly tide height">
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

export function WaterTideTab({ className }: { className?: string }) {
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

  if (!selectedDay) {
    return <div className={cn('text-sm text-muted-foreground', className)}>No tide data loaded.</div>
  }

  return (
    <div className={cn('grid gap-4 lg:grid-cols-2', className)}>
      <Card>
        <CardHeader>
          <CardTitle>Water Tide</CardTitle>
          <CardDescription className="truncate">{locationLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8"
              aria-label="Select date for tide"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setSelectedDate(pickInitialDate({ todayIso, minDate, maxDate, fallback }))}
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
          </div>

          <TideLineChart values={selectedDay.values} min={selectedDay.min} max={selectedDay.max} />

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Hour</TableHead>
                  <TableHead>Tide (m)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDay.values.map((v, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium tabular-nums">{formatHour(i)}</TableCell>
                    <TableCell className="tabular-nums">{v.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily highs/lows</CardTitle>
          <CardDescription>Click a day to inspect hourly values</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[520px] rounded-md border">
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
        </CardContent>
      </Card>
    </div>
  )
}
