"use client"

import * as React from "react"
import { differenceInCalendarDays, startOfDay } from "date-fns"

export type DeadlineRisk = "ON_TRACK" | "AT_RISK" | "OVERDUE" | "UNKNOWN"

export type DeadlineMarker = {
  id: string
  date: Date // dueAt
  label: string // 문서명/패키지명
  risk?: DeadlineRisk // 색/스타일용
  category?: string // PTW/NOC 등
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function xOfDate(opts: { timelineStart: Date; date: Date; cellWidth: number; totalDays: number }) {
  const start = startOfDay(opts.timelineStart)
  const d = startOfDay(opts.date)
  const diff = differenceInCalendarDays(d, start)
  const idx = clamp(diff, 0, Math.max(0, opts.totalDays - 1))
  return idx * opts.cellWidth
}

function lineClass(risk: DeadlineRisk) {
  // 기존 Risk Badge 톤을 따르되, 오버레이가 과하게 튀지 않게 투명도 적용
  // 색상은 Tailwind token 기반(다크모드 포함)
  switch (risk) {
    case "OVERDUE":
      return "bg-destructive/70"
    case "AT_RISK":
      return "bg-amber-500/60"
    case "ON_TRACK":
      return "bg-emerald-500/40"
    default:
      return "bg-muted-foreground/30"
  }
}

export function DeadlineLadderOverlay(props: {
  timelineStart: Date
  totalDays: number
  cellWidth: number

  // 오버레이가 깔릴 영역 높이(헤더=64px, 바영역=scrollHeight 등)
  heightPx: number

  markers: DeadlineMarker[]

  // 헤더에서 라벨 "핀"을 보여줄지 여부(기본 true)
  showPins?: boolean

  className?: string
}) {
  const { timelineStart, totalDays, cellWidth, heightPx, markers, showPins = true, className } = props

  if (!markers || markers.length === 0 || totalDays <= 0 || cellWidth <= 0) return null

  return (
    <div
      className={["pointer-events-none absolute inset-0 z-20", className ?? ""].join(" ")}
      style={{ height: `${heightPx}px` }}
    >
      {markers.map((m) => {
        const x = xOfDate({ timelineStart, date: m.date, cellWidth, totalDays })
        const risk = m.risk ?? "UNKNOWN"

        return (
          <div key={m.id} className="absolute top-0" style={{ left: `${x}px`, height: "100%" }}>
            {/* 세로선 */}
            <div className={["w-px h-full", lineClass(risk)].join(" ")} />

            {/* 헤더 핀(선택) */}
            {showPins && (
              <div
                className="absolute -top-0.5 left-0 translate-x-[-50%] rounded-sm px-1 py-0.5 text-[9px] leading-none"
                style={{ background: "rgba(0,0,0,0.00)" }}
                title={`${m.label} | ${m.date.toISOString().slice(0, 10)} | ${risk}`}
              >
                {/* 핀은 텍스트 대신 아주 작은 마커로만(혼잡 방지) */}
                <div className={["h-2 w-2 rounded-full", lineClass(risk)].join(" ")} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
