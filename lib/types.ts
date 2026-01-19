export interface ProjectConfig {
    projectStart: string
}

export interface UploadedFile {
    name: string
    type: "tsv" | "json"
    file: File
    data: TaskInput[]
    recordCount: number
}

export interface TaskInput {
    activityId1: string // Activity ID (1) - WBS Level 1
    activityId2: string // Activity ID (2) - WBS Level 2 (used for trip grouping - 2rtrack)
    activityId3: string // Activity ID (3) - WBS Level 3
    activityName: string // Activity Name
    originalDuration: number // Original Duration (days)
    plannedStart: string // Planned Start date
    plannedFinish: string // Planned Finish date
    // Computed fields
    fullActivityId: string // Combined hierarchical ID
    level: number // Hierarchy depth (1-3)
}

export interface ScheduleTask {
    id: string
    activityId1: string
    activityId2: string // Primary grouping key (2rtrack pattern)
    activityId3: string
    name: string
    duration: number
    startDay?: number
    startDate: string | Date
    endDate: string | Date
    level: number
}

export interface ScheduleSummary {
    totalTasks: number
    totalDuration: number
    scenarios: string[]
}

export interface ScheduleData {
    projectName?: string
    generatedAt?: string
    tasks: ScheduleTask[]
    scenarios?: string[]
    summary?: ScheduleSummary
}

export interface GenerationResult {
    success: boolean
    downloadUrl: string
    filename: string
    scenarioCount: number
    taskCount: number
    scheduleData: ScheduleData
}

export interface TideRecord {
    date: string
    high_tide_window: string
    max_height_m: number
    risk_level: "LOW" | "MEDIUM" | "HIGH"
}

export interface WeatherRecord {
    date: string
    wind_max_kn: number
    gust_max_kn: number
    wind_dir_deg: number
    wave_max_m: number
    visibility_km: number
    risk_level: "LOW" | "MEDIUM" | "HIGH"
    is_shamal: boolean
}

export interface ActivityRecord {
  activityId1: string
  activityId2: string // Primary grouping key (2rtrack pattern)
  activityId3: string
  name: string
  duration: number
  startDate: string
  endDate: string
}

// Document Types (p2.md schema)
export type VoyageId = string

export type MilestoneKey =
  | "mzp_arrival"
  | "mzp_departure"
  | "loadout_start"
  | "loadout_end"
  | "agi_arrival"
  | "agi_departure"
  | "doc_deadline"

export interface Voyage {
  id: VoyageId
  label: string
  cargoLabel?: string
  tripGroupKey?: string
  milestones: Partial<Record<MilestoneKey, string>>
  notes?: string
}

export type DocWorkflowState =
  | "not_started"
  | "in_progress"
  | "in_review"
  | "ready_to_submit"
  | "submitted"
  | "approved"
  | "revision_required"
  | "rejected"
  | "waived"

export type DocDueState = "on_track" | "at_risk" | "overdue" | "completed_late"

export interface DocTemplate {
  id: string
  title: string
  categoryId: string
  priority: "critical" | "important" | "standard" | "recommended"
  description?: string
  appliesTo: { scope: "voyage" | "unit" | "project" }
  anchor: {
    milestoneKey: MilestoneKey
    offsetDays: number
    offsetType: "calendar_days" | "business_days"
  }
  leadTime?: { value: number; type: "calendar_days" | "business_days" }
  dependencies: string[]
  evidence: Array<{
    id: string
    type: "file" | "url" | "text"
    label: string
    required: boolean
    minCount: number
  }>
  links: {
    scheduleTags?: string[]
    tideRequired?: boolean
  }
}

export interface DocInstance {
  templateId: string
  voyageId: VoyageId
  workflowState: DocWorkflowState
  dueAt: string
  assignee?: { name: string; org?: string }
  attachments: Array<{
    id: string
    name: string
    type: "file" | "url"
    url: string
    uploadedAt: string
  }>
  history: Array<{
    at: string
    event: string
    actor?: string
  }>
  notes?: string
}

export interface VoyageDocState {
  voyageId: VoyageId
  templateVersion: string
  milestones: Partial<Record<MilestoneKey, string>>
  documents: DocInstance[]
}
