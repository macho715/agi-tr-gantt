import { calculateDueDate } from "@/lib/documents/deadline-engine"
import type { DocInstance, DocTemplate, DocWorkflowState, Voyage, VoyageId } from "@/lib/types"
import docTemplatesData from "@/data/doc-templates.json"

/**
 * AGI Document Checklist Item (from agi docs check.json)
 */
export interface AgiDocItem {
  No: string
  Part: "A" | "B" | "C" | "D" | "E"
  "Document Name": string
  Name: string
  STATUS: string
  "Description / Notes": string
  "Responsible Party": string
  Mandatory: "Mandatory" | "Conditional"
  Status2: "Submitted" | "Pending" | "Partial" | "Conditional - Pending" | string
  "Evidence (File/Email)": string
  "Last Update (GST)": string
}

/**
 * Part to categoryId mapping
 */
const PART_TO_CATEGORY: Record<string, string> = {
  A: "ptw_pack",
  B: "technical_drawings", // 새 카테고리 (추가 필요)
  C: "ad_maritime_noc",
  D: "hot_work", // 새 카테고리 (추가 필요)
  E: "port_access", // 새 카테고리 (추가 필요)
}

/**
 * Status2 to DocWorkflowState mapping
 */
function mapStatus2ToWorkflowState(status2: string): DocWorkflowState {
  const normalized = status2.trim().toLowerCase()
  switch (normalized) {
    case "submitted":
      return "submitted"
    case "pending":
    case "conditional - pending":
      return "not_started"
    case "partial":
      return "in_progress"
    default:
      return "not_started"
  }
}

/**
 * Extract assignee from Responsible Party field
 */
function extractAssignee(responsibleParty: string): { name: string; org?: string } | undefined {
  if (!responsibleParty || responsibleParty.trim() === "　") return undefined

  // Try to extract primary party (usually first mentioned)
  const parties = responsibleParty.split("+").map((p) => p.trim())
  if (parties.length === 0) return undefined

  const primary = parties[0]
  // Extract name and org from patterns like "Mammoet (prepare)" or "Samsung (submit)"
  const match = primary.match(/^([^()]+)\s*\(([^)]+)\)/)
  if (match) {
    return {
      name: match[1].trim(),
      org: match[2].trim(),
    }
  }

  // Fallback: use first word as name
  const firstWord = primary.split(" ")[0]
  return firstWord ? { name: firstWord } : undefined
}

/**
 * Parse Evidence field into attachments array
 */
function parseAttachments(evidence: string, lastUpdate: string): DocInstance["attachments"] {
  if (!evidence || evidence.trim() === "　" || evidence.trim() === "") return []

  const items = evidence
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return items.map((item, index) => {
    const isUrl = item.startsWith("http://") || item.startsWith("https://")
    return {
      id: `att_${Date.now()}_${index}`,
      name: item,
      type: isUrl ? ("url" as const) : ("file" as const),
      url: isUrl ? item : `#${encodeURIComponent(item)}`, // Placeholder for file path
      uploadedAt: parseGstDate(lastUpdate) || new Date().toISOString(),
    }
  })
}

/**
 * Parse GST date string to ISO format
 * Format: "2026-01-22 10:51 GST"
 */
function parseGstDate(gstDate: string): string | null {
  if (!gstDate || gstDate.trim() === "　") return null

  try {
    // Extract date and time parts
    const match = gstDate.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})/)
    if (!match) return null

    const [, date, hour, minute] = match
    // Convert to ISO format (assume UTC+4 for GST)
    const isoString = `${date}T${hour}:${minute}:00+04:00`
    return new Date(isoString).toISOString()
  } catch {
    return null
  }
}

/**
 * Convert Last Update to history entry
 */
function createHistoryEntry(lastUpdate: string, status2: string): DocInstance["history"][0] | null {
  const parsedDate = parseGstDate(lastUpdate)
  if (!parsedDate) return null

  const statusLabel = mapStatus2ToWorkflowState(status2)
  const eventLabel = statusLabel === "submitted" ? "Document submitted" : `Status updated to ${statusLabel}`

  return {
    at: parsedDate,
    event: eventLabel,
    actor: undefined, // Could extract from Responsible Party if needed
  }
}

/**
 * Find matching template by document name
 */
function findMatchingTemplate(docName: string): DocTemplate | null {
  const templates = docTemplatesData.templates as DocTemplate[]
  
  // Normalize document name for comparison
  const normalized = docName
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, "") // Remove parenthesized parts
    .replace(/\s*—\s*/g, " ") // Replace em dash
    .replace(/\s*-\s*/g, " ") // Replace dash
    .trim()

  // Try exact match first
  for (const template of templates) {
    const templateNormalized = template.title
      .toLowerCase()
      .replace(/\s*\([^)]*\)\s*/g, "")
      .replace(/\s*—\s*/g, " ")
      .replace(/\s*-\s*/g, " ")
      .trim()

    if (templateNormalized === normalized) {
      return template
    }
  }

  // Try partial match (contains)
  for (const template of templates) {
    const templateNormalized = template.title.toLowerCase().trim()
    if (normalized.includes(templateNormalized) || templateNormalized.includes(normalized)) {
      return template
    }
  }

  return null
}

/**
 * Generate template ID from document name
 */
function generateTemplateId(docName: string, part: string): string {
  const prefix = PART_TO_CATEGORY[part]?.split("_")[0] || "doc"
  const normalized = docName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30)
  return `${prefix}.${normalized}`
}

/**
 * Convert AGI doc item to DocInstance
 */
export function convertAgiDocToInstance(
  agiDoc: AgiDocItem,
  voyageId: VoyageId,
  voyage: Voyage,
  existingTemplates: DocTemplate[]
): { instance: DocInstance; templateId: string; needsNewTemplate: boolean } {
  // Find or generate template ID
  let template: DocTemplate | null = findMatchingTemplate(agiDoc["Document Name"])
  let templateId: string
  let needsNewTemplate = false

  if (template) {
    templateId = template.id
  } else {
    // Generate new template ID
    templateId = generateTemplateId(agiDoc["Document Name"], agiDoc.Part)
    needsNewTemplate = true
  }

  // Calculate due date if we have a template
  let dueAt = new Date().toISOString()
  if (template) {
    const { dueAt: calculated } = calculateDueDate(template, voyage)
    if (calculated) {
      dueAt = calculated.toISOString()
    }
  }

  // Parse attachments
  const attachments = parseAttachments(agiDoc["Evidence (File/Email)"], agiDoc["Last Update (GST)"])

  // Create history entry
  const historyEntry = createHistoryEntry(agiDoc["Last Update (GST)"], agiDoc.Status2)
  const history = historyEntry ? [historyEntry] : []

  // Extract assignee
  const assignee = extractAssignee(agiDoc["Responsible Party"])

  const instance: DocInstance = {
    templateId,
    voyageId,
    workflowState: mapStatus2ToWorkflowState(agiDoc.Status2),
    dueAt,
    assignee,
    attachments,
    history,
    notes: agiDoc["Description / Notes"] || undefined,
  }

  return { instance, templateId, needsNewTemplate }
}

/**
 * Convert AGI doc item to DocTemplate (for new templates)
 */
export function convertAgiDocToTemplate(agiDoc: AgiDocItem): DocTemplate {
  const categoryId = PART_TO_CATEGORY[agiDoc.Part] || "ptw_pack"
  const templateId = generateTemplateId(agiDoc["Document Name"], agiDoc.Part)
  const priority = agiDoc.Mandatory === "Mandatory" ? "critical" : "important"

  // Default anchor - most documents are anchored to mzp_arrival
  const anchor = {
    milestoneKey: "mzp_arrival" as const,
    offsetDays: -4,
    offsetType: "calendar_days" as const,
  }

  // Parse evidence requirements
  const evidenceStr = agiDoc["Evidence (File/Email)"]
  const hasEvidence = evidenceStr && evidenceStr.trim() !== "　" && evidenceStr.trim() !== ""
  const evidence = hasEvidence
    ? [
        {
          id: "main_evidence",
          type: "file" as const,
          label: "Document File",
          required: agiDoc.Mandatory === "Mandatory",
          minCount: agiDoc.Mandatory === "Mandatory" ? 1 : 0,
        },
      ]
    : []

  return {
    id: templateId,
    title: agiDoc["Document Name"],
    categoryId,
    priority,
    description: agiDoc["Description / Notes"] || undefined,
    appliesTo: { scope: "voyage" },
    anchor,
    dependencies: [],
    evidence,
    links: {},
  }
}

/**
 * Import AGI docs and convert to DocInstances
 */
export function importAgiDocs(
  agiDocs: AgiDocItem[],
  voyageId: VoyageId,
  voyage: Voyage
): {
  instances: DocInstance[]
  newTemplates: DocTemplate[]
  matchedTemplates: string[]
} {
  const instances: DocInstance[] = []
  const newTemplates: DocTemplate[] = []
  const matchedTemplates: string[] = []
  const existingTemplates = docTemplatesData.templates as DocTemplate[]

  for (const agiDoc of agiDocs) {
    const { instance, templateId, needsNewTemplate } = convertAgiDocToInstance(
      agiDoc,
      voyageId,
      voyage,
      existingTemplates
    )

    instances.push(instance)

    if (needsNewTemplate) {
      const template = convertAgiDocToTemplate(agiDoc)
      newTemplates.push(template)
    } else {
      matchedTemplates.push(templateId)
    }
  }

  return { instances, newTemplates, matchedTemplates }
}
