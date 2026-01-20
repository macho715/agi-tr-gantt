"use client"

import React, { useMemo, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { useVoyageContext } from "@/contexts/voyage-context"
import type { DocTemplate } from "@/lib/types"
import docTemplatesData from "@/data/doc-templates.json"

interface DocsProgressOverlayProps {
  voyageId: string
  startDate: Date
  endDate: Date
  timelineStart: Date
  cellWidth: number
  excludeGlobal?: boolean
  onNavigateToDocs?: (voyageId: string) => void
}

export function DocsProgressOverlay({
  voyageId,
  startDate,
  endDate,
  timelineStart,
  cellWidth,
  excludeGlobal = true,
  onNavigateToDocs,
}: DocsProgressOverlayProps) {
  const { docsByVoyage, setSelectedVoyageId } = useVoyageContext()
  const templates = docTemplatesData.templates as DocTemplate[]
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const stats = useMemo(() => {
    if (!mounted) {
      return { total: 0, approved: 0, pct: 0 }
    }

    const docs = docsByVoyage[voyageId] || []
    let total = 0
    let approved = 0

    for (const template of templates) {
      if (excludeGlobal && template.appliesTo.scope === "project") continue
      if (template.appliesTo.scope !== "voyage") continue

      const doc = docs.find((d) => d.templateId === template.id)
      total += 1
      if (doc?.workflowState === "approved") {
        approved += 1
      }
    }

    return {
      total,
      approved,
      pct: total > 0 ? Math.round((approved / total) * 100) : 0,
    }
  }, [voyageId, docsByVoyage, templates, excludeGlobal, mounted])

  const startOffset = Math.floor((startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24))
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  const left = Math.max(0, startOffset * cellWidth)
  const width = Math.max(cellWidth, duration * cellWidth)

  if (!mounted || stats.total === 0) return null

  const handleClick = () => {
    setSelectedVoyageId(voyageId)
    onNavigateToDocs?.(voyageId)
  }

  return (
    <div
      className={`absolute z-10 transition-opacity outline-none ${
        onNavigateToDocs
          ? "pointer-events-auto cursor-pointer hover:opacity-90 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2"
          : "pointer-events-none"
      }`}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        top: 4,
        height: 14,
      }}
      onClick={onNavigateToDocs ? handleClick : undefined}
      role={onNavigateToDocs ? "button" : undefined}
      tabIndex={onNavigateToDocs ? 0 : undefined}
      onKeyDown={
        onNavigateToDocs
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                handleClick()
              }
            }
          : undefined
      }
      aria-label={
        onNavigateToDocs ? `View documents for ${voyageId} (${stats.approved}/${stats.total} approved)` : undefined
      }
    >
      <div className="h-2 rounded bg-muted/40 overflow-hidden border border-muted-foreground/20">
        <div className="h-full bg-emerald-500/80 transition-all duration-300" style={{ width: `${stats.pct}%` }} />
      </div>
      <div className="mt-0.5 flex justify-end">
        <Badge
          variant="outline"
          className="pointer-events-none text-[9px] px-1 py-0 h-4 bg-background/90 backdrop-blur-sm"
        >
          Docs {stats.approved}/{stats.total}
        </Badge>
      </div>
    </div>
  )
}
