import type { TaskInput, UploadedFile } from "./types"

export function validateFileType(file: File): { valid: boolean; error?: string } {
  const validExtensions = [".tsv", ".json", ".txt", ".csv"]
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))

  if (!validExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file type. Supported: ${validExtensions.join(", ")}`,
    }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: "File too large. Maximum size: 10MB" }
  }

  return { valid: true }
}

export async function parseUploadedFile(file: File): Promise<UploadedFile> {
  const content = await file.text()
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))

  let data: TaskInput[]
  let type: "tsv" | "json"

  if (extension === ".json") {
    type = "json"
    data = parseJSON(content, file.name)
  } else {
    type = "tsv"
    data = parseTSV(content, file.name)
  }

  return {
    name: file.name,
    type,
    file,
    data,
    recordCount: data.length,
  }
}

function parseJSON(content: string, filename: string): TaskInput[] {
  try {
    const parsed = JSON.parse(content)
    const tasks = Array.isArray(parsed) ? parsed : parsed.tasks

    if (!Array.isArray(tasks)) {
      throw new Error("JSON must contain an array of tasks or an object with a 'tasks' array")
    }

    return tasks.map((task, index) => validateAndTransformTask(task, index, filename))
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON syntax: ${err.message}`)
    }
    throw err
  }
}

const COLUMN_MAPPINGS: Record<string, keyof TaskInput | null> = {
  // Activity ID (1) variations
  "activity id (1)": "activityId1",
  "activity id(1)": "activityId1",
  activityid1: "activityId1",
  activity_id_1: "activityId1",
  wbs1: "activityId1",
  "wbs level 1": "activityId1",

  // Activity ID (2) variations
  "activity id (2)": "activityId2",
  "activity id(2)": "activityId2",
  activityid2: "activityId2",
  activity_id_2: "activityId2",
  wbs2: "activityId2",
  "wbs level 2": "activityId2",

  // Activity ID (3) variations
  "activity id (3)": "activityId3",
  "activity id(3)": "activityId3",
  activityid3: "activityId3",
  activity_id_3: "activityId3",
  wbs3: "activityId3",
  "wbs level 3": "activityId3",

  // Activity Name variations
  "activity name": "activityName",
  activityname: "activityName",
  activity_name: "activityName",
  "task name": "activityName",
  name: "activityName",
  description: "activityName",

  // Original Duration variations
  "original duration": "originalDuration",
  originalduration: "originalDuration",
  original_duration: "originalDuration",
  duration: "originalDuration",
  dur: "originalDuration",
  days: "originalDuration",

  // Planned Start variations
  "planned start": "plannedStart",
  plannedstart: "plannedStart",
  planned_start: "plannedStart",
  "start date": "plannedStart",
  start: "plannedStart",
  begin: "plannedStart",

  // Planned Finish variations
  "planned finish": "plannedFinish",
  plannedfinish: "plannedFinish",
  planned_finish: "plannedFinish",
  "finish date": "plannedFinish",
  finish: "plannedFinish",
  end: "plannedFinish",
  "end date": "plannedFinish",
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, " ")
}

function parseTSV(content: string, filename: string): TaskInput[] {
  const lines = content.trim().split("\n")

  if (lines.length < 2) {
    throw new Error("File must have a header row and at least one data row")
  }

  // Detect delimiter (tab or comma)
  const firstLine = lines[0]
  const delimiter = firstLine.includes("\t") ? "\t" : ","

  const rawHeaders = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""))
  const headers = rawHeaders.map(normalizeHeader)

  // Map headers to our field names
  const headerMapping: (keyof TaskInput | null)[] = headers.map((h) => {
    const mapped = COLUMN_MAPPINGS[h]
    return mapped || null
  })

  // Check for required columns
  const requiredFields: (keyof TaskInput)[] = ["activityName", "originalDuration", "plannedStart", "plannedFinish"]
  const foundFields = headerMapping.filter(Boolean) as (keyof TaskInput)[]
  const missingFields = requiredFields.filter((f) => !foundFields.includes(f))

  if (missingFields.length > 0) {
    const missingDescriptions = missingFields.map((f) => {
      switch (f) {
        case "activityName":
          return "Activity Name"
        case "originalDuration":
          return "Original Duration"
        case "plannedStart":
          return "Planned Start"
        case "plannedFinish":
          return "Planned Finish"
        default:
          return f
      }
    })
    throw new Error(
      `Missing required columns: ${missingDescriptions.join(", ")}. Found columns: ${rawHeaders.join(", ")}`,
    )
  }

  const tasks: TaskInput[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    const values = line.split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""))

    const row: Partial<TaskInput> = {}
    headerMapping.forEach((field, idx) => {
      if (field && values[idx] !== undefined) {
        const value = values[idx]
        if (field === "originalDuration") {
          row[field] = parseDuration(value)
        } else {
          ;(row as Record<string, string>)[field] = value
        }
      }
    })

    // Build task with defaults
    const task = buildTask(row, i)
    if (task.activityName || task.activityId1 || task.activityId2 || task.activityId3) {
      tasks.push(task)
    }
  }

  if (tasks.length === 0) {
    throw new Error("No valid task records found in file")
  }

  return tasks
}

function parseDuration(value: string): number {
  if (!value) return 0
  // Handle formats like "5", "5d", "5 days", "5.0"
  const num = Number.parseFloat(value.replace(/[^\d.]/g, ""))
  return isNaN(num) ? 0 : Math.round(num)
}

function parseDate(value: string): string {
  if (!value) return ""

  // Try to parse and normalize date format
  const date = new Date(value)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0]
  }

  // Return as-is if can't parse (might be in a valid format already)
  return value
}

function buildTask(row: Partial<TaskInput>, rowIndex: number): TaskInput {
  const activityId1 = row.activityId1 || ""
  const activityId2 = row.activityId2 || ""
  const activityId3 = row.activityId3 || ""

  // Determine hierarchy level based on which IDs are filled
  let level = 1
  if (activityId3) level = 3
  else if (activityId2) level = 2

  // Build full activity ID
  const idParts = [activityId1, activityId2, activityId3].filter(Boolean)
  const fullActivityId = idParts.join(".") || `TASK-${rowIndex}`

  return {
    activityId1,
    activityId2,
    activityId3,
    activityName: row.activityName || `Unnamed Activity ${rowIndex}`,
    originalDuration: row.originalDuration || 0,
    plannedStart: parseDate(row.plannedStart || ""),
    plannedFinish: parseDate(row.plannedFinish || ""),
    fullActivityId,
    level,
  }
}

function validateAndTransformTask(task: unknown, index: number, filename: string): TaskInput {
  const t = task as Record<string, unknown>

  return buildTask(
    {
      activityId1: (t.activityId1 || t["Activity ID (1)"] || "") as string,
      activityId2: (t.activityId2 || t["Activity ID (2)"] || "") as string,
      activityId3: (t.activityId3 || t["Activity ID (3)"] || "") as string,
      activityName: (t.activityName || t["Activity Name"] || t.name || "") as string,
      originalDuration:
        typeof t.originalDuration === "number"
          ? t.originalDuration
          : parseDuration(String(t.originalDuration || t["Original Duration"] || t.duration || 0)),
      plannedStart: (t.plannedStart || t["Planned Start"] || "") as string,
      plannedFinish: (t.plannedFinish || t["Planned Finish"] || "") as string,
    },
    index,
  )
}
