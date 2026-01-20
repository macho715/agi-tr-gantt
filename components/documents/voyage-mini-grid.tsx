"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import { format, isValid, parseISO } from "date-fns"
import type { Voyage } from "@/lib/types"
import { useVoyageContext } from "@/contexts/voyage-context"

interface VoyageMiniGridProps {
  voyages: Voyage[]
}

export function VoyageMiniGrid({ voyages }: VoyageMiniGridProps) {
  const { selectedVoyageId, setSelectedVoyageId, docsByVoyage } = useVoyageContext()

  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      {voyages.map((voyage) => {
        const docs = docsByVoyage[voyage.id] || []
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const overdueCount = docs.filter((d) => {
          if (d.workflowState === "approved" || !d.dueAt) return false
          const dueDate = new Date(d.dueAt)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate < now
        }).length
        const isSelected = selectedVoyageId === voyage.id
        const isDev = process.env.NODE_ENV === "development"
        const parseMilestoneDate = (dateStr: string | undefined): Date | null => {
          if (!dateStr) return null
          const date = parseISO(dateStr)
          if (!isValid(date)) {
            if (isDev) {
              console.warn(`Invalid milestone date: ${dateStr}`)
            }
            return null
          }
          return date
        }
        const mzpArrival = parseMilestoneDate(voyage.milestones.mzp_arrival)
        const docDeadline = parseMilestoneDate(voyage.milestones.doc_deadline)

        if (isDev) {
          console.log(`\n📅 Voyage ${voyage.id} milestones:`)
          console.log("  mzp_arrival_raw:", voyage.milestones?.mzp_arrival || "(undefined)")
          console.log("  doc_deadline_raw:", voyage.milestones?.doc_deadline || "(undefined)")
          console.log("  mzpArrival_parsed:", mzpArrival ? format(mzpArrival, "yyyy-MM-dd") : "(null)")
          console.log("  docDeadline_parsed:", docDeadline ? format(docDeadline, "yyyy-MM-dd") : "(null)")
          console.log("  Will display arrival?", !!mzpArrival)
          console.log("  Will display deadline?", !!docDeadline)
        }

        return (
          <Card
            key={voyage.id}
            className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
            onClick={() => setSelectedVoyageId(voyage.id)}
          >
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{voyage.label}</span>
                {overdueCount > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {overdueCount}
                  </Badge>
                )}
              </div>
              {mzpArrival ? (
                <div className="text-xs text-muted-foreground">
                  Arrival: {format(mzpArrival, "M/d/yyyy")}
                </div>
              ) : (
                isDev &&
                voyage.milestones.mzp_arrival && (
                  <div className="text-xs text-muted-foreground text-amber-600 dark:text-amber-400">
                    Arrival: {voyage.milestones.mzp_arrival} (parse failed)
                  </div>
                )
              )}
              {docDeadline ? (
                <div className="text-xs text-muted-foreground mt-1">
                  Doc Deadline: {format(docDeadline, "M/d/yyyy")}
                </div>
              ) : (
                isDev &&
                voyage.milestones.doc_deadline && (
                  <div className="text-xs text-muted-foreground mt-1 text-amber-600 dark:text-amber-400">
                    Doc Deadline: {voyage.milestones.doc_deadline} (parse failed)
                  </div>
                )
              )}
              {isDev && !mzpArrival && !docDeadline && Object.keys(voyage.milestones).length === 0 && (
                <div className="text-xs text-muted-foreground mt-1 text-gray-400">No milestones data</div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
