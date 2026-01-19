import type { DocTemplate, DocInstance, Voyage, DocDueState } from "@/lib/types"

const WEEKEND_DAYS = [0, 6]

function isWeekend(date: Date): boolean {
  return WEEKEND_DAYS.includes(date.getDay())
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let remaining = Math.abs(days)
  const direction = days > 0 ? 1 : -1

  while (remaining > 0) {
    result.setDate(result.getDate() + direction)
    if (!isWeekend(result)) {
      remaining--
    }
  }

  return result
}

function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function calculateDueDate(
  template: DocTemplate,
  voyage: Voyage,
): { dueAt: Date | null; anchorDate: Date | null } {
  const milestoneKey = template.anchor.milestoneKey
  const milestoneDateStr = voyage.milestones[milestoneKey]

  if (!milestoneDateStr) {
    return { dueAt: null, anchorDate: null }
  }

  const anchorDate = new Date(milestoneDateStr)
  const offsetDays = template.anchor.offsetDays

  const dueAt =
    template.anchor.offsetType === "business_days"
      ? addBusinessDays(anchorDate, offsetDays)
      : addCalendarDays(anchorDate, offsetDays)

  return { dueAt, anchorDate }
}

export function calculateDueState(doc: DocInstance, template: DocTemplate, voyage: Voyage): DocDueState {
  if (doc.workflowState === "approved" || doc.workflowState === "waived") {
    return "on_track"
  }

  const { dueAt } = calculateDueDate(template, voyage)
  if (!dueAt) {
    return "on_track"
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const dueDate = new Date(dueAt)
  dueDate.setHours(0, 0, 0, 0)

  const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilDue < 0) return "overdue"
  if (daysUntilDue <= 2) return "at_risk"
  return "on_track"
}
