import type { ScheduleData, ScheduleTask, Voyage, MilestoneKey } from "@/lib/types"
import { parseISO } from "date-fns"
import milestoneMap from "@/data/milestone-map.json"
import { VALID_TRIP_ACTIVITY_ID2 } from "@/lib/voyage/trip-groups"

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

export function deriveVoyagesFromScheduleData(
  scheduleData: ScheduleData | null,
  dateOffsetMs: number = 0,
): Voyage[] {
  if (!scheduleData) return []

  const byTrip = new Map<string, ScheduleTask[]>()

  scheduleData.tasks.forEach((task) => {
    if (!task.activityId2) return
    const tripKey = task.activityId2.trim()
    if (!VALID_TRIP_ACTIVITY_ID2.includes(tripKey)) return

    const existing = byTrip.get(tripKey)
    if (!existing) {
      byTrip.set(tripKey, [task])
      return
    }
    existing.push(task)
  })

  const milestonePatterns = buildMilestonePatterns(milestoneMap.milestones as MilestonePattern[])

  const sortedTripOrder = VALID_TRIP_ACTIVITY_ID2.filter((tripKey) => byTrip.has(tripKey))

  return sortedTripOrder.map((tripKey, index) => {
    const tasks = byTrip.get(tripKey) || []
    const milestones: Partial<Record<MilestoneKey, string>> = {}

    milestonePatterns.forEach(([key, pattern]) => {
      const date = pickMilestone(tasks, pattern)
      if (date) {
        const adjustedDate = dateOffsetMs !== 0 ? new Date(date.getTime() + dateOffsetMs) : date
        milestones[key] = adjustedDate.toISOString().split("T")[0]
      }
    })

    // 개발 환경에서 디버깅 로그 추가 (첫 번째 voyage만)
    if (process.env.NODE_ENV === "development" && index === 0) {
      console.log(`\n🔍 Milestone Extraction for ${tripKey} ===`)
      console.log("Tasks count:", tasks.length)
      console.log("Task names sample:", tasks.slice(0, 5).map((t) => t.name))
      console.log(
        "Milestone patterns:",
        milestonePatterns.map(([k, p]) => [k, p.toString()]),
      )
      console.log("Extracted milestones:", JSON.stringify(milestones, null, 2))
      console.log("=== End Milestone Extraction ===\n")
    }

    if (!milestones.doc_deadline && milestones.mzp_arrival && milestoneMap.docDeadlineOffsetDays !== undefined) {
      const arrivalDate = parseISO(milestones.mzp_arrival)
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
