import type { DocWorkflowState } from "@/lib/types"

export type DocAction = "submit" | "approve"

export function canTransition(status: DocWorkflowState, action: DocAction): boolean {
  if (status === "not_started") return action === "submit"
  if (status === "submitted") return action === "approve"
  return false
}

export function transitionStatus(status: DocWorkflowState, action: DocAction): DocWorkflowState {
  if (!canTransition(status, action)) return status
  if (status === "not_started" && action === "submit") return "submitted"
  if (status === "submitted" && action === "approve") return "approved"
  return status
}

export function statusLabel(status: DocWorkflowState): string {
  switch (status) {
    case "not_started":
      return "Not started"
    case "in_progress":
      return "In progress"
    case "submitted":
      return "Submitted"
    case "approved":
      return "Approved"
    case "in_review":
      return "In review"
    case "ready_to_submit":
      return "Ready to submit"
    case "revision_required":
      return "Revision required"
    case "rejected":
      return "Rejected"
    case "waived":
      return "Waived"
    default:
      return "Unknown"
  }
}
