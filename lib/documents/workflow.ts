import type { DocWorkflowState } from "@/lib/types"

export type DocAction = "submit" | "approve" | "reset" | "reopen"

export function canTransition(status: DocWorkflowState, action: DocAction): boolean {
  if (status === "not_started") return action === "submit"
  if (status === "submitted") return action === "approve" || action === "reset"
  if (status === "approved") return action === "reopen"
  return false
}

export function transitionStatus(status: DocWorkflowState, action: DocAction): DocWorkflowState {
  if (!canTransition(status, action)) return status
  if (status === "not_started" && action === "submit") return "submitted"
  if (status === "submitted" && action === "approve") return "approved"
  if (status === "submitted" && action === "reset") return "not_started"
  if (status === "approved" && action === "reopen") return "submitted"
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
