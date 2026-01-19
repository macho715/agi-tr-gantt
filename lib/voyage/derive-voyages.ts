import type { ScheduleData, ScheduleTask, Voyage, MilestoneKey } from "@/lib/types"
import milestoneMap from "@/data/milestone-map.json"

type MilestonePattern = {
  key: MilestoneKey
  pattern: string
  flags?: string
}

function toDate(x: string | Date): Date {
  return x instanceof Date ? x : new Date(x)
}

function pickMilestone(tasks: ScheduleTask[], pattern: RegExp): Date | null {
  const hit = tasks.find((t) => pattern.test(String(t.name)))
  if (!hit) return null
  return toDate(hit.startDate)
}

function buildMilestonePatterns(items: MilestonePattern[]): Array<[MilestoneKey, RegExp]> {
  return items.map((item) => [item.key, new RegExp(item.pattern, item.flags)])
}

export function deriveVoyagesFromScheduleData(scheduleData: ScheduleData | null): Voyage[] {
  if (!scheduleData) return []

  const byTrip = new Map<string, ScheduleTask[]>()
  const tripOrder: string[] = []

  scheduleData.tasks.forEach((task) => {
    if (!task.activityId2) return
    const existing = byTrip.get(task.activityId2)
    if (!existing) {
      tripOrder.push(task.activityId2)
      byTrip.set(task.activityId2, [task])
      return
    }
    existing.push(task)
  })

  const milestonePatterns = buildMilestonePatterns(milestoneMap.milestones as MilestonePattern[])

  return tripOrder.map((tripKey, index) => {
    const tasks = byTrip.get(tripKey) || []
    const milestones: Partial<Record<MilestoneKey, string>> = {}

    milestonePatterns.forEach(([key, pattern]) => {
      const date = pickMilestone(tasks, pattern)
      if (date) {
        milestones[key] = date.toISOString().split("T")[0]
      }
    })

    if (!milestones.doc_deadline && milestones.mzp_arrival && milestoneMap.docDeadlineOffsetDays !== undefined) {
      const arrivalDate = new Date(milestones.mzp_arrival)
      arrivalDate.setDate(arrivalDate.getDate() + milestoneMap.docDeadlineOffsetDays)
      milestones.doc_deadline = arrivalDate.toISOString().split("T")[0]
    }

    return {
      id: `V${index + 1}`,
      label: `Voyage ${index + 1}`,
      cargoLabel: tripKey,
      tripGroupKey: tripKey,
      milestones,
    }
  })
}
