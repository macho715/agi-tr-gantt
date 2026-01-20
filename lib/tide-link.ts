import { format } from 'date-fns'

/**
 * Normalize strings so matching is robust across different apostrophes and spacing.
 */
export function normalizeTideText(input: string) {
  return input
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * True if this activity name implies a tide-dependent/gated step.
 *
 * Examples matched:
 * - "if tide allows"
 * - "... tide allows ..."
 */
export function isTideAllowsActivityName(activityName: string) {
  const n = normalizeTideText(activityName)
  return n.includes('if tide allows') || n.includes('tide allows')
}

/**
 * Convert a ScheduleTask date value into YYYY-MM-DD.
 */
export function toIsoDate(value: string | Date) {
  if (value instanceof Date) {
    // date-fns format uses local time (avoids timezone shifts compared to toISOString()).
    return format(value, 'yyyy-MM-dd')
  }
  return String(value).slice(0, 10)
}
