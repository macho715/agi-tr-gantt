#!/usr/bin/env node

/**
 * Script to import AGI docs check.json and convert to DocInstances
 * Usage: node scripts/import-agi-docs.mjs [voyage-id]
 */

import { readFileSync, writeFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, "..")

// Read AGI docs check.json
const agiDocsPath = join(rootDir, "agi docs check.json")
const agiDocs = JSON.parse(readFileSync(agiDocsPath, "utf-8"))

// Read doc-templates.json
const templatesPath = join(rootDir, "data", "doc-templates.json")
const templatesData = JSON.parse(readFileSync(templatesPath, "utf-8"))

// Read types to understand structure (we'll use a simplified version)
console.log("📋 AGI Docs Import Script")
console.log("=" .repeat(50))
console.log(`Found ${agiDocs.length} documents in agi docs check.json\n`)

// Simple conversion functions (simplified version of the TypeScript functions)
function mapStatus2ToWorkflowState(status2) {
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

function parseGstDate(gstDate) {
  if (!gstDate || gstDate.trim() === "　") return null
  try {
    const match = gstDate.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})/)
    if (!match) return null
    const [, date, hour, minute] = match
    const isoString = `${date}T${hour}:${minute}:00+04:00`
    return new Date(isoString).toISOString()
  } catch {
    return null
  }
}

function extractAssignee(responsibleParty) {
  if (!responsibleParty || responsibleParty.trim() === "　") return undefined
  const parties = responsibleParty.split("+").map((p) => p.trim())
  if (parties.length === 0) return undefined
  const primary = parties[0]
  const match = primary.match(/^([^()]+)\s*\(([^)]+)\)/)
  if (match) {
    return {
      name: match[1].trim(),
      org: match[2].trim(),
    }
  }
  const firstWord = primary.split(" ")[0]
  return firstWord ? { name: firstWord } : undefined
}

function parseAttachments(evidence, lastUpdate) {
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
      type: isUrl ? "url" : "file",
      url: isUrl ? item : `#${encodeURIComponent(item)}`,
      uploadedAt: parseGstDate(lastUpdate) || new Date().toISOString(),
    }
  })
}

function findMatchingTemplate(docName, templates) {
  const normalized = docName
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/\s*—\s*/g, " ")
    .replace(/\s*-\s*/g, " ")
    .trim()

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

  for (const template of templates) {
    const templateNormalized = template.title.toLowerCase().trim()
    if (normalized.includes(templateNormalized) || templateNormalized.includes(normalized)) {
      return template
    }
  }
  return null
}

function generateTemplateId(docName, part) {
  const PART_TO_CATEGORY = {
    A: "ptw_pack",
    B: "technical_drawings",
    C: "ad_maritime_noc",
    D: "hot_work",
    E: "port_access",
  }
  const prefix = PART_TO_CATEGORY[part]?.split("_")[0] || "doc"
  const normalized = docName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30)
  return `${prefix}.${normalized}`
}

// Get voyage ID from command line or use default
const voyageId = process.argv[2] || "voyage-1"

// Create a default voyage with milestones (you may need to adjust these dates)
const defaultVoyage = {
  id: voyageId,
  label: "AGI Trip 1",
  milestones: {
    mzp_arrival: "2026-01-27",
    mzp_departure: "2026-01-31",
    loadout_start: "2026-01-29",
    loadout_end: "2026-01-30",
    agi_arrival: "2026-02-01",
  },
}

console.log(`Using voyage: ${voyageId}`)
console.log(`Milestones:`, defaultVoyage.milestones)
console.log("\n")

// Convert AGI docs to instances
const instances = []
const newTemplates = []
const matchedTemplates = []
const existingTemplates = templatesData.templates

for (const agiDoc of agiDocs) {
  const template = findMatchingTemplate(agiDoc["Document Name"], existingTemplates)
  let templateId
  let needsNewTemplate = false

  if (template) {
    templateId = template.id
    matchedTemplates.push(templateId)
  } else {
    templateId = generateTemplateId(agiDoc["Document Name"], agiDoc.Part)
    needsNewTemplate = true

    // Create new template
    const PART_TO_CATEGORY = {
      A: "ptw_pack",
      B: "technical_drawings",
      C: "ad_maritime_noc",
      D: "hot_work",
      E: "port_access",
    }
    const categoryId = PART_TO_CATEGORY[agiDoc.Part] || "ptw_pack"
    const priority = agiDoc.Mandatory === "Mandatory" ? "critical" : "important"

    const newTemplate = {
      id: templateId,
      title: agiDoc["Document Name"],
      categoryId,
      priority,
      description: agiDoc["Description / Notes"] || undefined,
      appliesTo: { scope: "voyage" },
      anchor: {
        milestoneKey: "mzp_arrival",
        offsetDays: -4,
        offsetType: "calendar_days",
      },
      dependencies: [],
      evidence: agiDoc["Evidence (File/Email)"] && agiDoc["Evidence (File/Email)"].trim() !== "　"
        ? [
            {
              id: "main_evidence",
              type: "file",
              label: "Document File",
              required: agiDoc.Mandatory === "Mandatory",
              minCount: agiDoc.Mandatory === "Mandatory" ? 1 : 0,
            },
          ]
        : [],
      links: {},
    }
    newTemplates.push(newTemplate)
  }

  // Calculate due date (simplified - using default offset)
  const dueAt = new Date(
    new Date(defaultVoyage.milestones.mzp_arrival).getTime() - 4 * 24 * 60 * 60 * 1000
  ).toISOString()

  const attachments = parseAttachments(agiDoc["Evidence (File/Email)"], agiDoc["Last Update (GST)"])
  const assignee = extractAssignee(agiDoc["Responsible Party"])

  const parsedDate = parseGstDate(agiDoc["Last Update (GST)"])
  const history = parsedDate
    ? [
        {
          at: parsedDate,
          event: mapStatus2ToWorkflowState(agiDoc.Status2) === "submitted" ? "Document submitted" : `Status updated to ${mapStatus2ToWorkflowState(agiDoc.Status2)}`,
        },
      ]
    : []

  const instance = {
    templateId,
    voyageId,
    workflowState: mapStatus2ToWorkflowState(agiDoc.Status2),
    dueAt,
    assignee,
    attachments,
    history,
    notes: agiDoc["Description / Notes"] || undefined,
  }

  instances.push(instance)
}

// Update doc-templates.json with new templates
if (newTemplates.length > 0) {
  templatesData.templates.push(...newTemplates)
  templatesData.updatedAt = new Date().toISOString().split("T")[0]
  writeFileSync(templatesPath, JSON.stringify(templatesData, null, 4), "utf-8")
  console.log(`✅ Added ${newTemplates.length} new templates to doc-templates.json`)
}

// Save instances to a JSON file for import
const instancesPath = join(rootDir, "data", `agi-docs-instances-${voyageId}.json`)
writeFileSync(
  instancesPath,
  JSON.stringify(
    {
      voyageId,
      voyage: defaultVoyage,
      instances,
      importedAt: new Date().toISOString(),
      summary: {
        total: instances.length,
        matchedTemplates: matchedTemplates.length,
        newTemplates: newTemplates.length,
      },
    },
    null,
    2
  ),
  "utf-8"
)

console.log("\n📊 Import Summary:")
console.log("=" .repeat(50))
console.log(`Total documents: ${instances.length}`)
console.log(`Matched templates: ${matchedTemplates.length}`)
console.log(`New templates created: ${newTemplates.length}`)
console.log(`\n✅ Instances saved to: ${instancesPath}`)
console.log("\n💡 Next steps:")
console.log("   1. Review the generated instances file")
console.log("   2. Import instances into VoyageContext using updateDoc()")
console.log("   3. Or load from localStorage using the voyage-docs key")
