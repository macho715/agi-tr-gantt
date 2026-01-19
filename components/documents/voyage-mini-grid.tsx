"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
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
              {voyage.milestones.mzp_arrival && (
                <div className="text-xs text-muted-foreground">
                  Arrival: {new Date(voyage.milestones.mzp_arrival).toLocaleDateString()}
                </div>
              )}
              {voyage.milestones.doc_deadline && (
                <div className="text-xs text-muted-foreground mt-1">
                  Doc Deadline: {new Date(voyage.milestones.doc_deadline).toLocaleDateString()}
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
