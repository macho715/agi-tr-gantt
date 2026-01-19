"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react"
import type { DocTemplate, DocInstance, Voyage, DocDueState } from "@/lib/types"
import { calculateDueDate, calculateDueState } from "@/lib/documents/deadline-engine"
import { useVoyageContext } from "@/contexts/voyage-context"
import docTemplatesData from "@/data/doc-templates.json"

interface DocumentChecklistProps {
  voyage: Voyage
  templates: DocTemplate[]
  docs: DocInstance[]
}

export function DocumentChecklist({ voyage, templates, docs }: DocumentChecklistProps) {
  const { updateDoc } = useVoyageContext()

  const categorizedDocs = useMemo(() => {
    const categories = new Map<string, Array<{ template: DocTemplate; doc?: DocInstance; dueState: DocDueState }>>()

    templates.forEach((template) => {
      if (template.appliesTo.scope === "project" || template.appliesTo.scope === "voyage") {
        const doc = docs.find((d) => d.templateId === template.id)
        const dueState = calculateDueState(
          doc || {
            templateId: template.id,
            voyageId: voyage.id,
            workflowState: "not_started",
            dueAt: calculateDueDate(template, voyage).dueAt?.toISOString() || "",
            attachments: [],
            history: [],
          },
          template,
          voyage,
        )

        const category = template.categoryId
        if (!categories.has(category)) {
          categories.set(category, [])
        }
        categories.get(category)!.push({ template, doc, dueState })
      }
    })

    return categories
  }, [templates, docs, voyage])

  const getDueStateBadge = (state: DocDueState) => {
    switch (state) {
      case "overdue":
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Overdue
          </Badge>
        )
      case "at_risk":
        return (
          <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 dark:text-amber-400">
            <Clock className="w-3 h-3 mr-1" />
            At Risk
          </Badge>
        )
      case "on_track":
        return (
          <Badge variant="outline" className="text-xs border-green-500 text-green-700 dark:text-green-400">
            On Track
          </Badge>
        )
      default:
        return null
    }
  }

  const getPriorityBadge = (priority: DocTemplate["priority"]) => {
    const colors = {
      critical: "destructive",
      important: "default",
      standard: "secondary",
      recommended: "outline",
    } as const
    return (
      <Badge variant={colors[priority]} className="text-[10px]">
        {priority}
      </Badge>
    )
  }

  const categories = useMemo(() => {
    return (docTemplatesData.categories || []).reduce(
      (acc, cat) => {
        acc[cat.id] = cat.label
        return acc
      },
      {} as Record<string, string>,
    )
  }, [])

  return (
    <div className="space-y-6">
      {Array.from(categorizedDocs.entries()).map(([categoryId, items]) => {
        const categoryLabel = categories[categoryId] || categoryId
        const completed = items.filter((i) => i.doc?.workflowState === "approved").length
        const total = items.length
        const progress = total > 0 ? (completed / total) * 100 : 0

        return (
          <Card key={categoryId}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{categoryLabel}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {completed}/{total}
                  </span>
                  <Progress value={progress} className="w-24 h-2" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map(({ template, doc, dueState }) => {
                const isApproved = doc?.workflowState === "approved"
                const { dueAt } = calculateDueDate(template, voyage)

                return (
                  <div
                    key={template.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      dueState === "overdue" ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20" : ""
                    }`}
                  >
                    <Checkbox
                      checked={isApproved}
                      onCheckedChange={(checked) => {
                        updateDoc(voyage.id, template.id, {
                          workflowState: checked ? "approved" : "in_progress",
                        })
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{template.title}</span>
                            {getPriorityBadge(template.priority)}
                          </div>
                          {template.description && (
                            <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {dueAt && <span className="text-xs text-muted-foreground">Due: {dueAt.toLocaleDateString()}</span>}
                            {getDueStateBadge(dueState)}
                            {isApproved && (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
