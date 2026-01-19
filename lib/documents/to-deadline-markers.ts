import type { DeadlineMarker } from "@/components/overlays/deadline-ladder-overlay"
import type { DocTemplate, DocInstance, Voyage, DocDueState } from "@/lib/types"
import { calculateDueDate, calculateDueState } from "@/lib/documents/deadline-engine"

type ComputedLike = {
  items: Array<{
    rule: { id: string; title: string; category?: string }
    dueAt: Date | null
    risk: "ON_TRACK" | "AT_RISK" | "OVERDUE" | "UNKNOWN"
  }>
  voyage?: { id: string }
}

export function toDeadlineMarkers(computed: ComputedLike | null): DeadlineMarker[] {
  if (!computed) return []
  const voyageId = computed.voyage?.id ?? "V?"

  return computed.items
    .filter((x) => Boolean(x.dueAt))
    .map((x) => ({
      id: `${voyageId}::${x.rule.id}`,
      date: x.dueAt as Date,
      label: x.rule.title,
      risk: x.risk,
      category: x.rule.category ?? "DOC",
    }))
}

function toDeadlineRisk(dueState: DocDueState): DeadlineMarker["risk"] {
  switch (dueState) {
    case "overdue":
      return "OVERDUE"
    case "at_risk":
      return "AT_RISK"
    case "on_track":
      return "ON_TRACK"
    default:
      return "UNKNOWN"
  }
}

export function computeDeadlineMarkers(
  voyage: Voyage | null,
  templates: DocTemplate[],
  docs: DocInstance[],
): DeadlineMarker[] {
  if (!voyage) return []

  return templates
    .filter((t) => t.appliesTo.scope === "voyage" || t.appliesTo.scope === "project")
    .map((template) => {
      const doc = docs.find((d) => d.templateId === template.id)
      const { dueAt } = calculateDueDate(template, voyage)
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

      if (!dueAt) return null

      return {
        id: `${voyage.id}::${template.id}`,
        date: dueAt,
        label: template.title,
        risk: toDeadlineRisk(dueState),
        category: template.categoryId,
      }
    })
    .filter((marker): marker is DeadlineMarker => marker !== null)
}
