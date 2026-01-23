"use client"

import React from "react"

import { useState } from "react"
import { Calendar } from "lucide-react"
import {
  ganttData,
  legendItems,
  milestones,
  PROJECT_START,
  TOTAL_DAYS,
  type Activity,
  type ActivityType,
  activityTypeNames,
} from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

const activityColors: Record<ActivityType, string> = {
  mobilization: "bg-gradient-to-r from-violet-400 to-violet-500 shadow-violet-500/40",
  loadout: "bg-gradient-to-r from-cyan-300 to-cyan-500 shadow-cyan-500/40",
  transport: "bg-gradient-to-r from-amber-300 to-amber-500 shadow-amber-500/40",
  loadin: "bg-gradient-to-r from-emerald-300 to-emerald-500 shadow-emerald-500/40",
  turning: "bg-gradient-to-r from-pink-400 to-pink-500 shadow-pink-500/40",
  jackdown: "bg-gradient-to-r from-blue-400 to-blue-500 shadow-blue-500/40",
}

const legendColors: Record<string, string> = {
  mobilization: "bg-gradient-to-r from-violet-400 to-violet-500",
  loadout: "bg-gradient-to-r from-cyan-300 to-cyan-500",
  transport: "bg-gradient-to-r from-amber-300 to-amber-500",
  loadin: "bg-gradient-to-r from-emerald-300 to-emerald-500",
  turning: "bg-gradient-to-r from-pink-400 to-pink-500",
  jackdown: "bg-gradient-to-r from-blue-400 to-blue-500",
}

function calcPosition(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const startDays = Math.ceil(
    (start.getTime() - PROJECT_START.getTime()) / (1000 * 60 * 60 * 24)
  )
  const duration =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return {
    left: (startDays / TOTAL_DAYS) * 100,
    width: Math.max((duration / TOTAL_DAYS) * 100, 1.8),
  }
}

const dateMarks = [
  "01-26",
  "02-01",
  "02-08",
  "02-15",
  "02-22",
  "03-01",
  "03-08",
  "03-15",
  "03-22",
]

interface TooltipState {
  visible: boolean
  x: number
  y: number
  activity: Activity | null
}

export function GanttChart() {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    activity: null,
  })

  const handleMouseEnter = (e: React.MouseEvent, activity: Activity) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      activity,
    })
  }

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, activity: null })
  }

  return (
    <section className="bg-card/85 backdrop-blur-lg rounded-2xl p-6 border border-accent/15 mb-6">
      <h2 className="text-foreground text-base font-bold mb-5 flex items-center gap-2 tracking-tight">
        <Calendar className="w-5 h-5 text-cyan-400" />
        Gantt Chart (Jan 26 - Mar 22, 2026)
        <span className="flex-1 h-px bg-gradient-to-r from-accent/40 to-transparent ml-3" />
      </h2>

      {/* Legend */}
      <div className="flex flex-wrap gap-5 p-4 bg-glass rounded-xl mb-5 border border-accent/15">
        {legendItems.map((item) => (
          <div
            key={item.type}
            className="flex items-center gap-2.5 text-xs font-medium text-slate-400"
          >
            <div
              className={cn("w-7 h-3.5 rounded shadow-md", legendColors[item.type])}
            />
            {item.label}
          </div>
        ))}
      </div>

      {/* Gantt Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Date Header */}
          <div className="flex ml-[200px] lg:ml-[220px] mb-3 border-b border-accent/15 pb-3">
            {dateMarks.map((date) => (
              <div
                key={date}
                className="flex-1 text-center font-mono text-xs text-cyan-400 font-semibold tracking-wide"
              >
                {date}
              </div>
            ))}
          </div>

          {/* Gantt Rows */}
          {ganttData.map((row, index) => (
            <div key={index} className="flex items-center mb-2">
              <div
                className={cn(
                  "w-[200px] lg:w-[220px] text-xs pr-4 flex-shrink-0",
                  row.isHeader
                    ? "font-bold text-amber-400 pt-4 tracking-wide"
                    : "font-medium text-slate-400"
                )}
              >
                {row.name}
              </div>
              <div className="flex-1 h-8 relative bg-cyan-500/[0.03] rounded border border-cyan-500/[0.08]">
                {row.activities?.map((activity, actIndex) => {
                  const pos = calcPosition(activity.start, activity.end)
                  return (
                    <div
                      key={actIndex}
                      className={cn(
                        "absolute h-6.5 top-[3px] rounded font-mono text-[9px] flex items-center justify-center text-slate-900 font-bold cursor-pointer transition-transform hover:scale-y-110 hover:scale-x-[1.02] hover:z-10 shadow-md",
                        activityColors[activity.type]
                      )}
                      style={{
                        left: `${pos.left}%`,
                        width: `${pos.width}%`,
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, activity)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <span className="truncate px-1">{activity.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="flex justify-between items-start px-6 py-7 bg-glass rounded-xl mt-6 relative border border-accent/15">
        <div className="absolute top-12 left-[70px] right-[70px] h-0.5 bg-gradient-to-r from-cyan-500 via-amber-400 via-emerald-500 to-blue-500 rounded" />
        {milestones.map((milestone, index) => (
          <div key={index} className="text-center relative z-10">
            <div className="w-4.5 h-4.5 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full mx-auto mb-3 border-[3px] border-slate-800 shadow-[0_0_0_3px_rgba(6,182,212,0.3)]" />
            <div className="font-mono text-sm font-bold text-cyan-400 mb-1">
              {milestone.date}
            </div>
            <div className="text-[10px] font-medium text-slate-500 max-w-[80px]">
              {milestone.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.activity && (
        <div
          className="fixed z-50 bg-slate-800 border border-cyan-500/40 rounded-lg px-4 py-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-bold text-foreground text-sm mb-1">
            {tooltip.activity.label}
          </div>
          <div className="text-xs text-slate-400 space-y-0.5">
            <p>
              <strong className="text-slate-300">Period:</strong>{" "}
              {tooltip.activity.start} ~ {tooltip.activity.end}
            </p>
            <p>
              <strong className="text-slate-300">Type:</strong>{" "}
              {activityTypeNames[tooltip.activity.type]}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
