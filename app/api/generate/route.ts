import { type NextRequest, NextResponse } from "next/server"
import type { ProjectConfig, ScheduleData, ScheduleTask, TaskInput } from "@/lib/types"

/**
 * PRODUCTION DEPLOYMENT NOTES
 * ============================
 *
 * This API route demonstrates the structure for integrating your Python Gantt generator.
 * For production deployment, you have several options:
 *
 * 1. SUBPROCESS APPROACH (Simple, same server):
 *    - Install Python and your script on the server
 *    - Use child_process.spawn to execute the Python script
 *    - Pass input via temp files or stdin, receive output via stdout/files
 *
 *    Example:
 *    ```
 *    import { spawn } from 'child_process';
 *    const python = spawn('python3', ['scripts/gantt_generator.py', inputPath, outputPath]);
 *    ```
 *
 * 2. DOCKER CONTAINER (Isolated, recommended):
 *    - Create a Docker container with Python + your script
 *    - Call it via HTTP or run as a sidecar
 *    - Best for security isolation and dependency management
 *
 * 3. SERVERLESS FUNCTION (AWS Lambda, Google Cloud Functions):
 *    - Deploy Python script as a separate serverless function
 *    - Call via HTTP from this route
 *    - Good for scalability and cost efficiency
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const configStr = formData.get("config") as string

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
    }

    let config: ProjectConfig
    try {
      config = JSON.parse(configStr)
    } catch {
      return NextResponse.json({ error: "Invalid configuration format" }, { status: 400 })
    }

    // Parse uploaded files using the new Activity ID format
    const allTasks: TaskInput[] = []
    for (const file of files) {
      const content = await file.text()
      try {
        const tasks = parseFileContent(content, file.name)
        allTasks.push(...tasks)
      } catch (err) {
        return NextResponse.json(
          { error: `Failed to parse ${file.name}: ${err instanceof Error ? err.message : "Unknown error"}` },
          { status: 400 },
        )
      }
    }

    if (allTasks.length === 0) {
      return NextResponse.json({ error: "No valid tasks found in uploaded files" }, { status: 400 })
    }

    // Generate schedule data (this would call your Python script in production)
    const scheduleData = generateScheduleFromTasks(allTasks, config)

    const downloadUrl = `/api/download?id=${Date.now()}`

    return NextResponse.json({
      success: true,
      downloadUrl,
      filename: `gantt_schedule_${new Date().toISOString().split("T")[0]}.xlsx`,
      scenarioCount: config.scenarios.length,
      taskCount: allTasks.length,
      scheduleData,
    })
  } catch (err) {
    console.error("Generation error:", err)
    return NextResponse.json({ error: "Internal server error during generation" }, { status: 500 })
  }
}

function parseFileContent(content: string, filename: string): TaskInput[] {
  const isJson = filename.toLowerCase().endsWith(".json")

  if (isJson) {
    const parsed = JSON.parse(content)
    const tasks = Array.isArray(parsed) ? parsed : parsed.tasks
    return tasks.map((t: Record<string, unknown>, i: number) => transformToTaskInput(t, i))
  }

  // Parse TSV/CSV with Activity ID columns
  const lines = content.trim().split("\n")
  if (lines.length < 2) {
    throw new Error("File must have a header row and at least one data row")
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ","
  const rawHeaders = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""))
  const headers = rawHeaders.map((h) => normalizeHeader(h))

  const tasks: TaskInput[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""))

    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ""
    })

    const task = buildTaskFromRow(row, i)
    if (task.activityName) {
      tasks.push(task)
    }
  }

  return tasks
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, " ")
}

const HEADER_MAP: Record<string, string> = {
  "activity id (1)": "activityId1",
  "activity id(1)": "activityId1",
  "activity id (2)": "activityId2",
  "activity id(2)": "activityId2",
  "activity id (3)": "activityId3",
  "activity id(3)": "activityId3",
  "activity name": "activityName",
  "original duration": "originalDuration",
  duration: "originalDuration",
  "planned start": "plannedStart",
  start: "plannedStart",
  "planned finish": "plannedFinish",
  finish: "plannedFinish",
  end: "plannedFinish",
}

function buildTaskFromRow(row: Record<string, string>, index: number): TaskInput {
  // Map normalized headers to our fields
  const mapped: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    const fieldName = HEADER_MAP[key] || key
    mapped[fieldName] = value
  }

  const activityId1 = mapped.activityId1 || ""
  const activityId2 = mapped.activityId2 || ""
  const activityId3 = mapped.activityId3 || ""

  let level = 1
  if (activityId3) level = 3
  else if (activityId2) level = 2

  const idParts = [activityId1, activityId2, activityId3].filter(Boolean)
  const fullActivityId = idParts.join(".") || `TASK-${index}`

  return {
    activityId1,
    activityId2,
    activityId3,
    activityName: mapped.activityName || `Activity ${index}`,
    originalDuration: parseDuration(mapped.originalDuration),
    plannedStart: parseDate(mapped.plannedStart),
    plannedFinish: parseDate(mapped.plannedFinish),
    fullActivityId,
    level,
  }
}

function transformToTaskInput(t: Record<string, unknown>, index: number): TaskInput {
  const activityId1 = String(t.activityId1 || t["Activity ID (1)"] || "")
  const activityId2 = String(t.activityId2 || t["Activity ID (2)"] || "")
  const activityId3 = String(t.activityId3 || t["Activity ID (3)"] || "")

  let level = 1
  if (activityId3) level = 3
  else if (activityId2) level = 2

  const idParts = [activityId1, activityId2, activityId3].filter(Boolean)

  return {
    activityId1,
    activityId2,
    activityId3,
    activityName: String(t.activityName || t["Activity Name"] || `Activity ${index}`),
    originalDuration: parseDuration(String(t.originalDuration || t["Original Duration"] || 0)),
    plannedStart: parseDate(String(t.plannedStart || t["Planned Start"] || "")),
    plannedFinish: parseDate(String(t.plannedFinish || t["Planned Finish"] || "")),
    fullActivityId: idParts.join(".") || `TASK-${index}`,
    level,
  }
}

function parseDuration(value: string | number): number {
  if (typeof value === "number") return Math.round(value)
  if (!value) return 0
  const num = Number.parseFloat(String(value).replace(/[^\d.]/g, ""))
  return isNaN(num) ? 0 : Math.round(num)
}

function parseDate(value: string): string {
  if (!value) return ""
  const date = new Date(value)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0]
  }
  return value
}

function generateScheduleFromTasks(tasks: TaskInput[], config: ProjectConfig): ScheduleData {
  const projectStart = new Date(config.projectStart)

  const scheduledTasks: ScheduleTask[] = tasks.map((task, index) => {
    // Use planned dates if available, otherwise calculate from project start
    let startDate: Date
    let endDate: Date

    if (task.plannedStart) {
      startDate = new Date(task.plannedStart)
    } else {
      startDate = new Date(projectStart)
      startDate.setDate(startDate.getDate() + index * 2) // Stagger for visualization
    }

    if (task.plannedFinish) {
      endDate = new Date(task.plannedFinish)
    } else {
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + (task.originalDuration || 1))
    }

    const startDay = Math.floor((startDate.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))

    return {
      id: task.fullActivityId,
      activityId1: task.activityId1,
      activityId2: task.activityId2,
      activityId3: task.activityId3,
      name: task.activityName,
      duration: task.originalDuration || Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      startDay: Math.max(0, startDay),
      startDate,
      endDate,
      level: task.level,
    }
  })

  // Sort by hierarchy: Level 1 first, then Level 2, then Level 3
  scheduledTasks.sort((a, b) => {
    if (a.activityId1 !== b.activityId1) return a.activityId1.localeCompare(b.activityId1)
    if (a.activityId2 !== b.activityId2) return a.activityId2.localeCompare(b.activityId2)
    return a.activityId3.localeCompare(b.activityId3)
  })

  return {
    tasks: scheduledTasks,
    scenarios: config.scenarios,
  }
}
