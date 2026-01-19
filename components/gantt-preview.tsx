"use client"

import type React from "react"

import { useMemo, useState, useRef, useCallback, useLayoutEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ProjectConfig, ScheduleData, DocTemplate, Voyage } from "@/lib/types"
import {
  BarChart3,
  Table,
  Calendar,
  ZoomIn,
  ZoomOut,
  Ship,
  Waves,
  Wind,
  AlertTriangle,
  Database,
  FileText,
} from "lucide-react"
import { VoyageProvider, useVoyageContext } from "@/contexts/voyage-context"
import { deriveVoyagesFromScheduleData } from "@/lib/voyage/derive-voyages"
import { DocumentChecklist } from "@/components/documents/document-checklist"
import { VoyageMiniGrid } from "@/components/documents/voyage-mini-grid"
import docTemplatesData from "@/data/doc-templates.json"
import { DeadlineLadderOverlay, type DeadlineMarker } from "@/components/overlays/deadline-ladder-overlay"
import { computeDeadlineMarkers } from "@/lib/documents/to-deadline-markers"
import { DocsProgressOverlay } from "@/components/overlays/docs-progress-overlay"

import tideData from "@/data/tide-data.json"
import weatherData from "@/data/weather-data.json"
import activityData from "@/data/activity-data.json"

interface GanttPreviewProps {
  scheduleData: ScheduleData | null
  config: ProjectConfig
  isGenerating: boolean

  // (추가) 오버레이 입력
  deadlineMarkers?: DeadlineMarker[]
  defaultShowDeadlines?: boolean
}

interface TideRecord {
  date: string
  high_tide_window: string
  max_height_m: number
  risk_level: "LOW" | "MEDIUM" | "HIGH"
}

interface WeatherRecord {
  date: string
  wind_max_kn: number
  gust_max_kn: number
  wind_dir_deg: number
  wave_max_m: number
  visibility_km: number
  risk_level: "LOW" | "MEDIUM" | "HIGH"
  is_shamal: boolean
}

interface ActivityRecord {
  activityId1: string
  activityId2: string
  activityId3: string
  name: string
  duration: number
  startDate: string
  endDate: string
}

const CELL_WIDTH_OPTIONS = [24, 32, 48, 64]
const DEFAULT_ZOOM = 1

const formatDateKey = (date: Date): string => {
  return date.toISOString().split("T")[0]
}

const getTideInfo = (date: Date): TideRecord | null => {
  const dateKey = formatDateKey(date)
  return (tideData.tide_records as TideRecord[]).find((t) => t.date === dateKey) || null
}

const getWeatherInfo = (date: Date): WeatherRecord | null => {
  const dateKey = formatDateKey(date)
  return (weatherData.weather_records as WeatherRecord[]).find((w) => w.date === dateKey) || null
}

const getRiskBadgeColor = (risk: string) => {
  switch (risk) {
    case "LOW":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
    case "HIGH":
      return "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  }
}

const TRIP_GROUPS_BY_ACTIVITY_ID2 = [
  { id: "tr12", activityId2: "AGI TR Units 1-2", label: "AGI TR Units 1-2", color: "sky" },
  { id: "tr34", activityId2: "AGI TR Units 3-4", label: "AGI TR Units 3-4", color: "emerald" },
  { id: "tr56", activityId2: "AGLI TR Units 5-6", label: "AGI TR Units 5-6", color: "amber" },
  { id: "tr7", activityId2: "AGL TR Unit 7", label: "AGI TR Unit 7", color: "violet" },
]

const getTripGroupColors = (color: string) => {
  const colorMap: Record<string, { header: string; headerText: string; row: string; bar: string; barBorder: string }> =
    {
      sky: {
        header: "bg-sky-600 dark:bg-sky-700",
        headerText: "text-white",
        row: "bg-sky-50/50 dark:bg-sky-950/20",
        bar: "bg-sky-500",
        barBorder: "border-sky-600",
      },
      emerald: {
        header: "bg-emerald-600 dark:bg-emerald-700",
        headerText: "text-white",
        row: "bg-emerald-50/50 dark:bg-emerald-950/20",
        bar: "bg-emerald-500",
        barBorder: "border-emerald-600",
      },
      amber: {
        header: "bg-amber-600 dark:bg-amber-700",
        headerText: "text-white",
        row: "bg-amber-50/50 dark:bg-amber-950/20",
        bar: "bg-amber-500",
        barBorder: "border-amber-600",
      },
      violet: {
        header: "bg-violet-600 dark:bg-violet-700",
        headerText: "text-white",
        row: "bg-violet-50/50 dark:bg-violet-950/20",
        bar: "bg-violet-500",
        barBorder: "border-violet-600",
      },
    }
  return colorMap[color] || colorMap.sky
}

export function GanttPreview({
  scheduleData,
  config,
  isGenerating,
  deadlineMarkers,
  defaultShowDeadlines = true,
}: GanttPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM)
  const [useFixedData, setUseFixedData] = useState(true)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [showDeadlines, setShowDeadlines] = useState<boolean>(defaultShowDeadlines)
  const [activeTab, setActiveTab] = useState<string>("gantt")

  const leftPanelRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const timelineHeaderRef = useRef<HTMLDivElement>(null)
  const barsContentRef = useRef<HTMLDivElement>(null)
  const [barsHeight, setBarsHeight] = useState<number>(0)

  const cellWidth = CELL_WIDTH_OPTIONS[zoomLevel]

  const toggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }, [])

  const effectiveScheduleData = useMemo(() => {
    if (useFixedData || !scheduleData) {
      const tasks = (activityData.activities as ActivityRecord[]).map((a, index) => ({
        id: `task-${index}`,
        activityId1: a.activityId1,
        activityId2: a.activityId2,
        activityId3: a.activityId3,
        name: a.name,
        duration: a.duration,
        startDate: a.startDate,
        endDate: a.endDate,
        level: a.activityId3 ? 3 : a.activityId2 ? 2 : 1,
      }))
      return {
        projectName: "AGI TR Schedule",
        generatedAt: activityData.generated_at,
        tasks,
        summary: {
          totalTasks: tasks.length,
          totalDuration: 65,
          scenarios: ["Default"],
        },
      } as ScheduleData
    }
    return scheduleData
  }, [scheduleData, useFixedData])

  const voyages = useMemo(() => deriveVoyagesFromScheduleData(effectiveScheduleData), [effectiveScheduleData])
  const templates = useMemo(() => docTemplatesData.templates as DocTemplate[], [])

  const chartData = useMemo(() => {
    if (!effectiveScheduleData) return null

    const originalTasks = effectiveScheduleData.tasks.map((t) => ({
      ...t,
      startDate: new Date(t.startDate),
      endDate: new Date(t.endDate),
    }))

    if (originalTasks.length === 0) return null

    const originalProjectStart = new Date(Math.min(...originalTasks.map((t) => t.startDate.getTime())))
    const configuredProjectStart = new Date(config.projectStart)
    const dateOffsetMs = configuredProjectStart.getTime() - originalProjectStart.getTime()

    const tasks = originalTasks.map((t) => ({
      ...t,
      startDate: new Date(t.startDate.getTime() + dateOffsetMs),
      endDate: new Date(t.endDate.getTime() + dateOffsetMs),
    }))

    const minDate = new Date(Math.min(...tasks.map((t) => t.startDate.getTime())))
    const maxDate = new Date(Math.max(...tasks.map((t) => t.endDate.getTime())))
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) || 1

    const months: { name: string; days: number; startDay: number }[] = []
    const tempDate = new Date(minDate)
    let dayCounter = 0
    while (tempDate <= maxDate) {
      const monthStart = dayCounter
      const monthName = tempDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      const daysInMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate()
      const remainingDaysInMonth = daysInMonth - tempDate.getDate() + 1
      const actualDays = Math.min(remainingDaysInMonth, totalDays - dayCounter)

      months.push({ name: monthName, days: actualDays, startDay: monthStart })
      dayCounter += actualDays
      tempDate.setMonth(tempDate.getMonth() + 1)
      tempDate.setDate(1)
    }

    const days: { date: Date; dayOfWeek: number; isWeekend: boolean }[] = []
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(minDate)
      d.setDate(d.getDate() + i)
      days.push({
        date: d,
        dayOfWeek: d.getDay(),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      })
    }

    return { tasks, minDate, maxDate, totalDays, months, days, dateOffsetMs }
  }, [effectiveScheduleData, config.projectStart])

  const groupedTasks = useMemo(() => {
    if (!chartData) return null

    const groups = TRIP_GROUPS_BY_ACTIVITY_ID2.map((group) => {
      const tasks = chartData.tasks.filter((task) => task.activityId2 === group.activityId2)
      tasks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

      const startDate = tasks.length > 0 ? new Date(Math.min(...tasks.map((t) => t.startDate.getTime()))) : null
      const endDate = tasks.length > 0 ? new Date(Math.max(...tasks.map((t) => t.endDate.getTime()))) : null
      const totalDuration =
        startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0

      return {
        ...group,
        tasks,
        startDate,
        endDate,
        totalDuration,
        colors: getTripGroupColors(group.color),
      }
    })

    return groups.filter((g) => g.tasks.length > 0)
  }, [chartData])

  const voyageData = useMemo(() => {
    if (!chartData) return null

    const trips = TRIP_GROUPS_BY_ACTIVITY_ID2.map((group, index) => {
      const activities = chartData.tasks.filter((task) => task.activityId2 === group.activityId2)

      const startDate =
        activities.length > 0 ? new Date(Math.min(...activities.map((a) => a.startDate.getTime()))) : null
      const endDate = activities.length > 0 ? new Date(Math.max(...activities.map((a) => a.endDate.getTime()))) : null
      const totalDuration =
        startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0

      return {
        id: `${index + 1}`,
        label: `${index + 1}${index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"} Trip`,
        units: group.label,
        activityId2: group.activityId2,
        activities,
        startDate,
        endDate,
        totalDuration,
        activityCount: activities.length,
        color: group.color,
      }
    })

    return trips.filter((t) => t.activities.length > 0)
  }, [chartData])

  const VOYAGE_MILESTONES = [
    { key: "arrives", label: "LCT Arrives to MZP", pattern: /LCT Arrives|Deck Preparations/i },
    { key: "loadout", label: "Load-out", pattern: /Load-out|stool down/i },
    { key: "sailaway_agi", label: "Sail-away to AGI", pattern: /Sail-away.*LCT to Al Ghallan|Marine Transportation/i },
    { key: "sailaway_mzp", label: "Return to MZP", pattern: /Sail-away back to Mina Zayed/i },
  ]

  const handleLeftScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const rightPanel = rightPanelRef.current
    if (rightPanel) {
      rightPanel.scrollTop = event.currentTarget.scrollTop
    }
  }, [])

  const handleRightScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const leftPanel = leftPanelRef.current
    const timelineHeader = timelineHeaderRef.current
    if (leftPanel) {
      leftPanel.scrollTop = event.currentTarget.scrollTop
    }
    // Sync horizontal scroll with timeline header
    if (timelineHeader) {
      timelineHeader.scrollLeft = event.currentTarget.scrollLeft
    }
  }, [])

  // Update bars height for overlay
  useLayoutEffect(() => {
    const el = barsContentRef.current
    if (!el) return

    const update = () => setBarsHeight(el.scrollHeight || el.clientHeight || 0)
    update()

    const ro = new ResizeObserver(() => update())
    ro.observe(el)

    return () => ro.disconnect()
  }, [effectiveScheduleData, zoomLevel])

  if (isGenerating) {
    return (
      <Card className="bg-card border-border h-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Generating schedule...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!effectiveScheduleData || !chartData) {
    return (
      <Card className="bg-card border-border h-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No Preview Available</p>
              <p className="text-xs text-muted-foreground">Upload files and generate to see the schedule preview</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <VoyageProvider voyages={voyages}>
      <Card className="bg-card border-border overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Schedule Preview
          </CardTitle>
          <div className="flex items-center gap-3">
            <Button
              variant={useFixedData ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setUseFixedData(!useFixedData)}
            >
              <Database className="w-3 h-3" />
              {useFixedData ? "Fixed Data" : "Uploaded Data"}
            </Button>
            <DeadlineToggleButton
              deadlineMarkers={deadlineMarkers}
              voyages={voyages}
              templates={templates}
              showDeadlines={showDeadlines}
              onToggle={() => setShowDeadlines((v) => !v)}
            />
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 bg-transparent"
                onClick={() => setZoomLevel((z) => Math.max(0, z - 1))}
                disabled={zoomLevel === 0}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 bg-transparent"
                onClick={() => setZoomLevel((z) => Math.min(CELL_WIDTH_OPTIONS.length - 1, z + 1))}
                disabled={zoomLevel === CELL_WIDTH_OPTIONS.length - 1}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
            <Badge variant="secondary" className="text-xs font-medium">
              {effectiveScheduleData.tasks.length} Activities
            </Badge>
            <Badge variant="outline" className="text-xs font-medium">
              {chartData.totalDays} Days
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-3 border-b border-border bg-muted/30 flex-shrink-0">
            <TabsList className="h-8 p-0.5 bg-muted">
              <TabsTrigger value="gantt" className="text-xs h-7 px-3 data-[state=active]:bg-background">
                <BarChart3 className="w-3 h-3 mr-1.5" />
                Gantt Chart
              </TabsTrigger>
              <TabsTrigger value="table" className="text-xs h-7 px-3 data-[state=active]:bg-background">
                <Table className="w-3 h-3 mr-1.5" />
                Table View
              </TabsTrigger>
              <TabsTrigger value="voyage" className="text-xs h-7 px-3 data-[state=active]:bg-background">
                <Ship className="w-3 h-3 mr-1.5" />
                Voyage Summary
              </TabsTrigger>
              <TabsTrigger value="docs" className="text-xs h-7 px-3 data-[state=active]:bg-background">
                <FileText className="w-3 h-3 mr-1.5" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="summary" className="text-xs h-7 px-3 data-[state=active]:bg-background">
                <Calendar className="w-3 h-3 mr-1.5" />
                Summary
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="gantt" className="mt-0 flex-1 min-h-0 flex flex-col" key={`gantt-${config.projectStart}`}>
            <TooltipProvider>
              <div className="flex flex-col flex-1 min-h-0">
                {/* Timeline Header - FIXED at top, never scrolls vertically */}
                <div
                  className="flex border-b border-border flex-shrink-0"
                  style={{
                    position: "relative",
                    zIndex: 100,
                    backgroundColor: "hsl(var(--background))",
                  }}
                >
                  {/* Left header - Activity Name column */}
                  <div
                    className="flex-shrink-0 w-80 border-r border-border h-16 flex items-end"
                    style={{ backgroundColor: "hsl(var(--muted))" }}
                  >
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Trip / Activity Name
                    </div>
                  </div>
                  {/* Right header - Timeline dates */}
                  <div
                    ref={timelineHeaderRef}
                    className="flex-1 overflow-hidden"
                    style={{ backgroundColor: "hsl(var(--background))" }}
                  >
                    <div
                      className="relative"
                      style={{ width: `${chartData.totalDays * cellWidth}px`, minWidth: "100%" }}
                    >
                      {/* Month row */}
                      <div className="h-8 border-b border-border flex">
                        {chartData.months.map((month, i) => (
                          <div
                            key={i}
                            className="border-r border-border/50 flex items-center justify-center text-xs font-semibold text-foreground"
                            style={{
                              width: `${month.days * cellWidth}px`,
                              backgroundColor: "hsl(var(--muted))",
                            }}
                          >
                            {month.name}
                          </div>
                        ))}
                      </div>
                      {/* Day row */}
                      <div className="h-8 flex">
                        {chartData.days.map((day, i) => (
                          <div
                            key={i}
                            className={`border-r border-border/30 flex items-center justify-center text-[10px] ${
                              day.isWeekend ? "text-muted-foreground" : "text-foreground"
                            }`}
                            style={{
                              width: `${cellWidth}px`,
                              backgroundColor: day.isWeekend ? "hsl(var(--muted))" : "hsl(var(--background))",
                            }}
                          >
                            {day.date.getDate()}
                          </div>
                        ))}
                      </div>

                      {/* Header overlay */}
                      <DeadlineHeaderOverlay
                        deadlineMarkers={deadlineMarkers}
                        voyages={voyages}
                        templates={templates}
                        showDeadlines={showDeadlines}
                        timelineStart={chartData.minDate}
                        totalDays={chartData.totalDays}
                        cellWidth={cellWidth}
                      />
                    </div>
                  </div>
                </div>

                {/* Gantt Body - ONLY this area scrolls vertically */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                  {/* Left panel - Activity names (scrolls vertically only) */}
                  <div
                    ref={leftPanelRef}
                    onScroll={handleLeftScroll}
                    className="flex-shrink-0 w-80 border-r border-border overflow-y-auto overflow-x-hidden"
                    style={{ backgroundColor: "hsl(var(--background))" }}
                  >
                    {groupedTasks?.map((group) => {
                      const isCollapsed = collapsedGroups.has(group.id)

                      return (
                        <div key={group.id}>
                          <div
                            className={`flex items-center h-10 border-b border-border ${group.colors.header} ${group.colors.headerText} cursor-pointer hover:opacity-90 transition-opacity`}
                            onClick={() => toggleGroupCollapse(group.id)}
                          >
                            <div className="px-3 flex items-center gap-2 w-full">
                              <span className="text-xs">{isCollapsed ? "▶" : "▼"}</span>
                              <Ship className="w-4 h-4" />
                              <span className="font-bold text-sm">{group.label}</span>
                              <Badge
                                variant="secondary"
                                className="ml-auto text-[10px] bg-white/20 text-white border-0"
                              >
                                {group.tasks.length} activities
                              </Badge>
                              {isCollapsed && (
                                <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0">
                                  {group.totalDuration} days
                                </Badge>
                              )}
                            </div>
                          </div>
                          {!isCollapsed && (
                            <>
                              {group.tasks.map((task, index) => (
                                <div
                                  key={`${group.id}-${index}`}
                                  className={`flex items-center h-9 border-b border-border/50 ${group.colors.row}`}
                                  style={{ paddingLeft: "12px" }}
                                >
                                  <span className="truncate text-xs text-foreground/80">{task.name}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Right panel - Gantt bars (scrolls both directions) */}
                  <div ref={rightPanelRef} onScroll={handleRightScroll} className="flex-1 overflow-auto">
                    <div
                      ref={barsContentRef}
                      className="relative"
                      style={{ width: `${chartData.totalDays * cellWidth}px`, minWidth: "100%" }}
                    >
                      {/* Body overlay */}
                      <DeadlineBodyOverlay
                        deadlineMarkers={deadlineMarkers}
                        voyages={voyages}
                        templates={templates}
                        showDeadlines={showDeadlines}
                        timelineStart={chartData.minDate}
                        totalDays={chartData.totalDays}
                        cellWidth={cellWidth}
                        heightPx={barsHeight}
                      />

                      {groupedTasks?.map((group) => {
                        const isCollapsed = collapsedGroups.has(group.id)

                        return (
                          <div key={group.id}>
                            <div className={`h-10 border-b border-border relative ${group.colors.header}`}>
                              {group.startDate && group.endDate && (
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 h-6 bg-white/30 rounded-sm flex items-center px-2"
                                  style={{
                                    left: `${Math.max(0, Math.floor((group.startDate.getTime() - chartData.minDate.getTime()) / (1000 * 60 * 60 * 24))) * cellWidth}px`,
                                    width: `${Math.max(1, group.totalDuration) * cellWidth}px`,
                                  }}
                                >
                                  <span className="text-[10px] text-white font-medium truncate">
                                    {group.totalDuration} days
                                  </span>
                                </div>
                              )}
                              {group.startDate && group.endDate && (() => {
                                const voyage = voyages.find((v) => v.tripGroupKey === group.activityId2)
                                if (!voyage) return null

                                return (
                                  <DocsProgressOverlay
                                    voyageId={voyage.id}
                                    startDate={group.startDate}
                                    endDate={group.endDate}
                                    timelineStart={chartData.minDate}
                                    cellWidth={cellWidth}
                                    excludeGlobal={true}
                                    onNavigateToDocs={() => setActiveTab("docs")}
                                  />
                                )
                              })()}
                            </div>
                            {!isCollapsed && (
                              <>
                                {group.tasks.map((task, index) => {
                                  const startOffset = Math.floor(
                                    (task.startDate.getTime() - chartData.minDate.getTime()) / (1000 * 60 * 60 * 24),
                                  )
                                  const duration = Math.max(
                                    1,
                                    Math.ceil(
                                      (task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24),
                                    ) + 1,
                                  )

                                  return (
                                    <div
                                      key={`bar-${group.id}-${index}`}
                                      className={`h-9 border-b border-border/50 relative ${group.colors.row}`}
                                    >
                                      {chartData.days.map(
                                        (day, dayIndex) =>
                                          day.isWeekend && (
                                            <div
                                              key={`weekend-${dayIndex}`}
                                              className="absolute top-0 bottom-0 bg-muted/30"
                                              style={{ left: `${dayIndex * cellWidth}px`, width: `${cellWidth}px` }}
                                            />
                                          ),
                                      )}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div
                                            className={`absolute top-1/2 -translate-y-1/2 h-5 ${group.colors.bar} rounded-sm border ${group.colors.barBorder} cursor-pointer hover:opacity-80 transition-opacity flex items-center px-1.5 overflow-hidden`}
                                            style={{
                                              left: `${startOffset * cellWidth}px`,
                                              width: `${duration * cellWidth}px`,
                                            }}
                                          >
                                            <span className="text-[9px] text-white font-medium truncate">
                                              {duration > 2 ? task.name : ""}
                                            </span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs">
                                          <div className="space-y-1">
                                            <p className="font-medium text-xs">{task.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{group.label}</p>
                                            <p className="text-[10px]">
                                              {task.startDate.toLocaleDateString()} -{" "}
                                              {task.endDate.toLocaleDateString()}
                                            </p>
                                            <p className="text-[10px]">{duration} days</p>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  )
                                })}
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </TooltipProvider>
          </TabsContent>

          <TabsContent value="table" className="mt-0 flex-1 min-h-0 overflow-auto" key={`table-${config.projectStart}`}>
            <div className="p-4">
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 border-b border-border font-semibold">Trip</th>
                      <th className="text-left p-2 border-b border-border font-semibold">Activity Name</th>
                      <th className="text-left p-2 border-b border-border font-semibold">Start Date</th>
                      <th className="text-left p-2 border-b border-border font-semibold">End Date</th>
                      <th className="text-right p-2 border-b border-border font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedTasks?.flatMap((group) =>
                      group.tasks.map((task, index) => (
                        <tr key={`${group.id}-${index}`} className={`${group.colors.row} hover:bg-muted/30`}>
                          <td className="p-2 border-b border-border/50">
                            <Badge className={`text-[10px] ${group.colors.header} ${group.colors.headerText} border-0`}>
                              {group.label}
                            </Badge>
                          </td>
                          <td className="p-2 border-b border-border/50">{task.name}</td>
                          <td className="p-2 border-b border-border/50 text-muted-foreground">
                            {task.startDate.toLocaleDateString()}
                          </td>
                          <td className="p-2 border-b border-border/50 text-muted-foreground">
                            {task.endDate.toLocaleDateString()}
                          </td>
                          <td className="p-2 border-b border-border/50 text-right">{task.duration} days</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="voyage"
            className="mt-0 flex-1 min-h-0 overflow-auto"
            key={`voyage-${config.projectStart}`}
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Waves className="w-3 h-3 text-blue-500" />
                  <span>Tide info for Load-out</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="w-3 h-3 text-cyan-500" />
                  <span>Weather info for Sail-away</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span>SHAMAL warning</span>
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 border-b border-border font-semibold w-24">Trip</th>
                      <th className="text-left p-2 border-b border-border font-semibold w-8">#</th>
                      <th className="text-left p-2 border-b border-border font-semibold">Milestone</th>
                      <th className="text-left p-2 border-b border-border font-semibold w-28">Date</th>
                      <th className="text-left p-2 border-b border-border font-semibold w-48">Tide / Weather</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voyageData?.map((trip) => {
                      const colors = getTripGroupColors(trip.color)
                      return VOYAGE_MILESTONES.map((milestone, mIndex) => {
                        const activity = trip.activities.find((a) => milestone.pattern.test(a.name))
                        const activityDate = activity ? activity.startDate : null
                        const tideInfo = activityDate && milestone.key === "loadout" ? getTideInfo(activityDate) : null
                        const weatherInfo =
                          activityDate && (milestone.key === "sailaway_agi" || milestone.key === "sailaway_mzp")
                            ? getWeatherInfo(activityDate)
                            : null

                        return (
                          <tr key={`${trip.id}-${milestone.key}`} className={`${colors.row}`}>
                            {mIndex === 0 && (
                              <td
                                rowSpan={VOYAGE_MILESTONES.length}
                                className={`p-2 border-b border-r border-border ${colors.header} ${colors.headerText} align-top`}
                              >
                                <div className="font-bold">{trip.label}</div>
                                <div className="text-[10px] opacity-80">{trip.units}</div>
                              </td>
                            )}
                            <td className="p-2 border-b border-border/50">
                              <span
                                className={`w-5 h-5 rounded-full ${colors.bar} text-white text-[10px] inline-flex items-center justify-center font-bold`}
                              >
                                {mIndex + 1}
                              </span>
                            </td>
                            <td className="p-2 border-b border-border/50">{milestone.label}</td>
                            <td className="p-2 border-b border-border/50 text-muted-foreground">
                              {activityDate ? activityDate.toLocaleDateString() : "—"}
                            </td>
                            <td className="p-2 border-b border-border/50">
                              {tideInfo && (
                                <div className="flex items-center gap-2">
                                  <Waves className="w-3 h-3 text-blue-500" />
                                  <span>{tideInfo.max_height_m}m</span>
                                  <Badge className={`text-[9px] ${getRiskBadgeColor(tideInfo.risk_level)}`}>
                                    {tideInfo.risk_level}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">{tideInfo.high_tide_window}</span>
                                </div>
                              )}
                              {weatherInfo && (
                                <div className="flex items-center gap-2">
                                  <Wind className="w-3 h-3 text-cyan-500" />
                                  <span>{weatherInfo.wind_max_kn}kn</span>
                                  <span className="text-muted-foreground">{weatherInfo.wave_max_m}m</span>
                                  <Badge className={`text-[9px] ${getRiskBadgeColor(weatherInfo.risk_level)}`}>
                                    {weatherInfo.risk_level}
                                  </Badge>
                                  {weatherInfo.is_shamal && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                                </div>
                              )}
                              {!tideInfo && !weatherInfo && <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        )
                      })
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="docs" className="mt-0 flex-1 min-h-0 overflow-auto">
            <DocsTabContent voyages={voyages} templates={templates} />
          </TabsContent>

          <TabsContent
            value="summary"
            className="mt-0 flex-1 min-h-0 overflow-auto"
            key={`summary-${config.projectStart}`}
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {voyageData?.map((trip) => {
                  const colors = getTripGroupColors(trip.color)
                  return (
                    <Card key={trip.id} className="overflow-hidden">
                      <div className={`h-2 ${colors.header}`} />
                      <CardContent className="pt-3 pb-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{trip.activityCount}</p>
                          <p className="text-xs text-muted-foreground">{trip.units}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{trip.totalDuration} days</p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Project Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-muted-foreground">Start</p>
                      <p className="font-medium">{chartData.minDate.toLocaleDateString()}</p>
                    </div>
                    <div className="flex-1 mx-4 h-2 bg-muted rounded-full overflow-hidden relative">
                      {voyageData?.map((trip, index) => {
                        const colors = getTripGroupColors(trip.color)
                        if (!trip.startDate || !trip.endDate) return null
                        const startOffset =
                          ((trip.startDate.getTime() - chartData.minDate.getTime()) /
                            (chartData.maxDate.getTime() - chartData.minDate.getTime())) *
                          100
                        const width =
                          ((trip.endDate.getTime() - trip.startDate.getTime()) /
                            (chartData.maxDate.getTime() - chartData.minDate.getTime())) *
                          100
                        return (
                          <div
                            key={trip.id}
                            className={`h-full ${colors.bar} absolute`}
                            style={{ left: `${startOffset}%`, width: `${width}%` }}
                          />
                        )
                      })}
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">End</p>
                      <p className="font-medium">{chartData.maxDate.toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      </Card>
    </VoyageProvider>
  )
}

function DocsTabContent({ voyages, templates }: { voyages: Voyage[]; templates: DocTemplate[] }) {
  const { selectedVoyageId, docsByVoyage } = useVoyageContext()
  const selectedVoyage = voyages.find((v) => v.id === selectedVoyageId) || voyages[0]

  if (!selectedVoyage) {
    return <div className="p-4 text-center text-muted-foreground">No voyages available. Please generate a schedule first.</div>
  }

  const docs = docsByVoyage[selectedVoyage.id] || []

  return (
    <div className="p-4 space-y-4">
      <VoyageMiniGrid voyages={voyages} />
      <DocumentChecklist voyage={selectedVoyage} templates={templates} docs={docs} />
    </div>
  )
}

function useResolvedDeadlineMarkers({
  deadlineMarkers,
  voyages,
  templates,
}: {
  deadlineMarkers?: DeadlineMarker[]
  voyages: Voyage[]
  templates: DocTemplate[]
}) {
  const { selectedVoyageId, docsByVoyage } = useVoyageContext()

  return useMemo(() => {
    if (deadlineMarkers !== undefined) {
      return deadlineMarkers
    }

    const selectedVoyage = voyages.find((v) => v.id === selectedVoyageId) || voyages[0]
    if (!selectedVoyage) return []

    const docs = docsByVoyage[selectedVoyage.id] || []
    return computeDeadlineMarkers(selectedVoyage, templates, docs)
  }, [deadlineMarkers, voyages, selectedVoyageId, docsByVoyage, templates])
}

function DeadlineToggleButton({
  deadlineMarkers,
  voyages,
  templates,
  showDeadlines,
  onToggle,
}: {
  deadlineMarkers?: DeadlineMarker[]
  voyages: Voyage[]
  templates: DocTemplate[]
  showDeadlines: boolean
  onToggle: () => void
}) {
  const markers = useResolvedDeadlineMarkers({ deadlineMarkers, voyages, templates })

  if (markers.length === 0) return null

  return (
    <Button variant={showDeadlines ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1.5" onClick={onToggle}>
      <FileText className="w-3 h-3" />
      Deadlines
    </Button>
  )
}

function DeadlineHeaderOverlay({
  deadlineMarkers,
  voyages,
  templates,
  showDeadlines,
  timelineStart,
  totalDays,
  cellWidth,
}: {
  deadlineMarkers?: DeadlineMarker[]
  voyages: Voyage[]
  templates: DocTemplate[]
  showDeadlines: boolean
  timelineStart: Date
  totalDays: number
  cellWidth: number
}) {
  const markers = useResolvedDeadlineMarkers({ deadlineMarkers, voyages, templates })

  if (!showDeadlines || markers.length === 0) return null

  return (
    <DeadlineLadderOverlay
      timelineStart={timelineStart}
      totalDays={totalDays}
      cellWidth={cellWidth}
      heightPx={64}
      markers={markers}
      showPins={true}
    />
  )
}

function DeadlineBodyOverlay({
  deadlineMarkers,
  voyages,
  templates,
  showDeadlines,
  timelineStart,
  totalDays,
  cellWidth,
  heightPx,
}: {
  deadlineMarkers?: DeadlineMarker[]
  voyages: Voyage[]
  templates: DocTemplate[]
  showDeadlines: boolean
  timelineStart: Date
  totalDays: number
  cellWidth: number
  heightPx: number
}) {
  const markers = useResolvedDeadlineMarkers({ deadlineMarkers, voyages, templates })

  if (!showDeadlines || markers.length === 0 || heightPx <= 0) return null

  return (
    <DeadlineLadderOverlay
      timelineStart={timelineStart}
      totalDays={totalDays}
      cellWidth={cellWidth}
      heightPx={heightPx}
      markers={markers}
      showPins={false}
    />
  )
}
