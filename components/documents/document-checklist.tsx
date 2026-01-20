"use client"

import React, { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, CheckCircle2, Clock, FileText, Info, LayoutGrid, Table2 } from "lucide-react"
import { differenceInCalendarDays, format } from "date-fns"
import type { DocTemplate, DocInstance, Voyage, DocDueState, DocWorkflowState } from "@/lib/types"
import { calculateDueDate, calculateDueState } from "@/lib/documents/deadline-engine"
import { canTransition, transitionStatus, statusLabel } from "@/lib/documents/workflow"
import { useVoyageContext } from "@/contexts/voyage-context"
import docTemplatesData from "@/data/doc-templates.json"

interface DocumentChecklistProps {
  voyage: Voyage
  templates: DocTemplate[]
  docs: DocInstance[]
}

type LayoutMode = "card" | "table"

export function DocumentChecklist({ voyage, templates, docs }: DocumentChecklistProps) {
  const { updateDoc } = useVoyageContext()
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("card")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")

  const categories = useMemo(() => {
    return (docTemplatesData.categories || []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0))
  }, [])

  useEffect(() => {
    if (layoutMode === "table" && !selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [layoutMode, selectedCategoryId, categories])

  const categorizedDocs = useMemo(() => {
    const grouped = new Map<string, Array<{ template: DocTemplate; doc?: DocInstance; dueState: DocDueState }>>()

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
        if (!grouped.has(category)) {
          grouped.set(category, [])
        }
        grouped.get(category)!.push({ template, doc, dueState })
      }
    })

    return grouped
  }, [templates, docs, voyage])

  const templatesInCategory = useMemo(() => {
    if (!selectedCategoryId) return []
    return templates.filter((t) => t.categoryId === selectedCategoryId)
  }, [templates, selectedCategoryId])

  const categoryProgress = useMemo(() => {
    const result: Record<string, { total: number; approved: number; submitted: number }> = {}
    categories.forEach((cat) => {
      const catTemplates = templates.filter((t) => t.categoryId === cat.id)
      const catDocs = catTemplates.map((t) => docs.find((d) => d.templateId === t.id))
      result[cat.id] = {
        total: catTemplates.length,
        approved: catDocs.filter((d) => d?.workflowState === "approved").length,
        submitted: catDocs.filter((d) => d?.workflowState === "submitted").length,
      }
    })
    return result
  }, [categories, templates, docs])

  const handleAction = (templateId: string, action: "submit" | "approve" | "reset" | "reopen") => {
    const doc = docs.find((d) => d.templateId === templateId)
    const currentStatus = (doc?.workflowState || "not_started") as DocWorkflowState

    if (!canTransition(currentStatus, action)) return

    const newStatus = transitionStatus(currentStatus, action)
    updateDoc(voyage.id, templateId, {
      workflowState: newStatus,
    })
  }

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

  const getStatusBadge = (status: DocWorkflowState) => {
    if (status === "approved") {
      return (
        <Badge className="text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      )
    }
    if (status === "submitted") {
      return (
        <Badge variant="secondary" className="text-xs">
          Submitted
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs">
        Not started
      </Badge>
    )
  }

  const categoryLabels = useMemo(() => {
    return (docTemplatesData.categories || []).reduce((acc, cat) => {
      acc[cat.id] = cat.label
      return acc
    }, {} as Record<string, string>)
  }, [])

  const KeyNotesContent = () => (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-medium mb-2">PTW (Permit to Work)</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
          <li>PTW (Hot Work/Working Over Water 등)은 일반적으로 항차(voyage) 단위로 운용되며, 작업/입항 기간에 종속됩니다.</li>
          <li>(Land permit는 월단위 가능 케이스 존재)</li>
        </ul>
      </div>

      <div>
        <p className="font-medium mb-2">Marine PTW</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
          <li>Marine PTW는 통상 작업 시작 ≥24h 전 신청이 요구될 수 있으므로, D-4 기준으로 패키지 완비 권고.</li>
        </ul>
      </div>

      <div>
        <p className="font-medium mb-2">Land Permit (SPMT operations)</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
          <li>Approval takes 2-3 business days; allow additional time if weekends are included</li>
        </ul>
      </div>

      <div>
        <p className="font-medium mb-2">Pre-arrival Meeting</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
          <li>Mandatory operations planning meeting with Port Authority prior to vessel arrival</li>
        </ul>
      </div>

      <div>
        <p className="font-medium mb-2">AD Maritime NOC</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
          <li>Must be obtained prior to AGI transit</li>
        </ul>
      </div>
    </div>
  )

  const KeyNotesDialog = () => {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Info className="w-3 h-3" />
            View Full Notes
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Key Notes (OFCO Agency Guidance)</DialogTitle>
          </DialogHeader>
          <KeyNotesContent />
        </DialogContent>
      </Dialog>
    )
  }

  const renderCardView = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-sm font-semibold">Key Notes (OFCO Agency Guidance)</CardTitle>
              <KeyNotesDialog />
            </div>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            <KeyNotesContent />
          </CardContent>
        </Card>

        {Array.from(categorizedDocs.entries()).map(([categoryId, items]) => {
          const categoryLabel = categoryLabels[categoryId] || categoryId
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

                  const today = new Date()
                  const dueDiff = dueAt ? differenceInCalendarDays(dueAt, today) : null
                  const dueBadge =
                    dueDiff === null
                      ? ""
                      : dueDiff > 0
                        ? `D-${dueDiff}`
                        : dueDiff === 0
                          ? "Due today"
                          : `Overdue ${Math.abs(dueDiff)}d`

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
                              {dueAt && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground">
                                    Due: {dueAt.toLocaleDateString()}
                                  </span>
                                  {dueBadge && (
                                    <Badge
                                      variant={
                                        dueDiff !== null && dueDiff < 0
                                          ? "destructive"
                                          : dueDiff === 0
                                            ? "default"
                                            : dueDiff !== null && dueDiff <= 2
                                              ? "outline"
                                              : "secondary"
                                      }
                                      className={`text-[10px] font-medium ${
                                        dueDiff !== null && dueDiff < 0
                                          ? "animate-pulse"
                                          : dueDiff === 0
                                            ? "ring-2 ring-amber-500"
                                            : ""
                                      }`}
                                    >
                                      {dueDiff !== null && dueDiff < 0 && <AlertTriangle className="w-2.5 h-2.5 mr-1" />}
                                      {dueBadge}
                                    </Badge>
                                  )}
                                </div>
                              )}
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

  const renderTableView = () => {
    const voyageMilestones = {
      tripGroup: voyage.tripGroupKey || voyage.cargoLabel || voyage.label,
      mzpArrival: voyage.milestones.mzp_arrival,
      docDeadline: voyage.milestones.doc_deadline,
      allMilestones: voyage.milestones,
    }

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-sm font-semibold">Key Notes (OFCO Agency Guidance)</CardTitle>
              <KeyNotesDialog />
            </div>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            <KeyNotesContent />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <Card className="p-2 md:col-span-4">
            <div className="px-2 py-2 text-sm font-semibold">Categories</div>
            <Tabs value={selectedCategoryId} onValueChange={setSelectedCategoryId} className="flex-1">
              <TabsList className="flex-col items-stretch h-auto w-full">
                {categories.map((cat) => {
                  const progress = categoryProgress[cat.id] || { total: 0, approved: 0, submitted: 0 }
                  const active = cat.id === selectedCategoryId

                  return (
                    <TabsTrigger key={cat.id} value={cat.id} className={`justify-between w-full ${active ? "bg-accent" : ""}`}>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="truncate text-sm font-medium">{cat.label}</div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground ml-2">
                        {progress.approved}/{progress.total}
                      </div>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          </Card>

          <Card className="p-4 md:col-span-8">
          <div className="mb-3 space-y-2">
            <div className="text-sm text-muted-foreground">Documents</div>
            <div className="text-base font-semibold">
              {categories.find((c) => c.id === selectedCategoryId)?.label || "—"}
            </div>
            <div className="pt-2 mt-2 border-t border-border">
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Voyage:</span>
                  <span className="text-muted-foreground">{voyage.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Trip Group:</span>
                  <span className="text-muted-foreground">{voyageMilestones.tripGroup}</span>
                </div>
                {voyageMilestones.mzpArrival ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">MZP Arrival:</span>
                    <span className="text-muted-foreground">{voyageMilestones.mzpArrival}</span>
                    <span className="text-muted-foreground italic">(LCT Arrives to MZP; Deck Preparations)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>MZP Arrival milestone not found - deadline calculation may fail</span>
                  </div>
                )}
                {voyageMilestones.docDeadline && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Doc Deadline:</span>
                    <span className="text-muted-foreground">{voyageMilestones.docDeadline}</span>
                  </div>
                )}
                {Object.keys(voyageMilestones.allMilestones).length === 0 && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>No milestones available - deadline calculations will fail</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead className="w-[160px]">Due</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[160px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templatesInCategory.map((template) => {
                const doc = docs.find((d) => d.templateId === template.id)
                const status = (doc?.workflowState || "not_started") as DocWorkflowState
                const { dueAt, anchorDate } = calculateDueDate(template, voyage)
                const dueState = calculateDueState(
                  doc || {
                    templateId: template.id,
                    voyageId: voyage.id,
                    workflowState: "not_started",
                    dueAt: dueAt?.toISOString() || "",
                    attachments: [],
                    history: [],
                  },
                  template,
                  voyage,
                )

                const today = new Date()
                const dueDiff = dueAt ? differenceInCalendarDays(dueAt, today) : null
                const dueText = dueAt ? format(dueAt, "yyyy-MM-dd") : "—"
                const dueBadge =
                  dueDiff === null
                    ? ""
                    : dueDiff > 0
                      ? `D-${dueDiff}`
                      : dueDiff === 0
                        ? "Due today"
                        : `Overdue ${Math.abs(dueDiff)}d`

                // 마일스톤 계산 실패 원인 분석
                const anchorKey = template.anchor.milestoneKey
                const anchorValue = voyage.milestones[anchorKey]
                const hasAnchor = !!anchorValue
                const hasAnchorDate = !!anchorDate
                const hasDueAt = !!dueAt

                // 실패 원인 메시지
                let failureReason: string | null = null
                if (!hasDueAt) {
                  if (!hasAnchor) {
                    failureReason = `Missing anchor: ${anchorKey}`
                  } else if (!hasAnchorDate) {
                    failureReason = `Invalid anchor date: ${anchorValue}`
                  } else {
                    failureReason = "Calculation error"
                  }
                }

                const canSubmit = canTransition(status, "submit")
                const canApprove = canTransition(status, "approve")
                const canReset = canTransition(status, "reset")
                const canReopen = canTransition(status, "reopen")

                return (
                  <TableRow
                    key={template.id}
                    className={dueState === "overdue" ? "bg-red-50/50 dark:bg-red-950/20" : ""}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{template.title}</div>
                          {getPriorityBadge(template.priority)}
                        </div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground">{template.description}</div>
                        )}
                        {/* Anchor milestone 정보 표시 */}
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Anchor:</span> {anchorKey}
                          {anchorValue && (
                            <>
                              {" "}→ {anchorValue}
                              {anchorDate && (
                                <>
                                  {" "}({format(anchorDate, "M/d/yyyy")})
                                  {template.anchor.offsetDays !== 0 && (
                                    <span className="ml-1">
                                      {template.anchor.offsetDays > 0 ? "+" : ""}{template.anchor.offsetDays}
                                      {template.anchor.offsetType === "business_days" ? " biz days" : " days"}
                                    </span>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                        {failureReason && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{failureReason}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{dueText}</div>
                        {dueBadge && <div className="text-xs text-muted-foreground">{dueBadge}</div>}
                        {!hasDueAt && failureReason && (
                          <div className="text-xs text-amber-600 dark:text-amber-400">
                            {failureReason}
                          </div>
                        )}
                        {hasDueAt && anchorDate && (
                          <div className="text-xs text-muted-foreground">
                            from {format(anchorDate, "M/d/yyyy")}
                          </div>
                        )}
                        {getDueStateBadge(dueState)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(status)}
                        <div className="text-xs text-muted-foreground">{statusLabel(status)}</div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!canSubmit}
                            onClick={() => handleAction(template.id, "submit")}
                          >
                            Submit
                          </Button>
                          <Button size="sm" disabled={!canApprove} onClick={() => handleAction(template.id, "approve")}>
                            Approve
                          </Button>
                        </div>
                        {(canReset || canReopen) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7"
                            onClick={() => handleAction(template.id, canReopen ? "reopen" : "reset")}
                          >
                            {canReopen ? "Reopen" : "Reset"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}

              {templatesInCategory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground text-center">
                    No templates in this category.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant={layoutMode === "card" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setLayoutMode("card")}
        >
          <LayoutGrid className="w-3 h-3 mr-1.5" />
          Card View
        </Button>
        <Button
          variant={layoutMode === "table" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setLayoutMode("table")}
        >
          <Table2 className="w-3 h-3 mr-1.5" />
          Table View
        </Button>
      </div>

      {layoutMode === "card" ? renderCardView() : renderTableView()}
    </div>
  )
}
