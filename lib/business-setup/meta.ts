// Client-safe Business Setup CRM metadata: stages, priorities, activity types.

export type LeadStageValue =
  | "NEW_ENQUIRY" | "QUALIFIED" | "PROPOSAL_SENT" | "DOCUMENTS_COLLECTION"
  | "SUBMITTED_TO_AUTHORITY" | "AWAITING_APPROVAL" | "APPROVED" | "COMPLETED" | "LOST";

export const LEAD_STAGES: LeadStageValue[] = [
  "NEW_ENQUIRY", "QUALIFIED", "PROPOSAL_SENT", "DOCUMENTS_COLLECTION",
  "SUBMITTED_TO_AUTHORITY", "AWAITING_APPROVAL", "APPROVED", "COMPLETED", "LOST",
];

// Stages shown as pipeline columns (terminal stages handled separately).
export const PIPELINE_STAGES: LeadStageValue[] = [
  "NEW_ENQUIRY", "QUALIFIED", "PROPOSAL_SENT", "DOCUMENTS_COLLECTION",
  "SUBMITTED_TO_AUTHORITY", "AWAITING_APPROVAL", "APPROVED", "COMPLETED",
];

export const LEAD_STAGE_LABELS: Record<LeadStageValue, string> = {
  NEW_ENQUIRY: "New Enquiry",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  DOCUMENTS_COLLECTION: "Documents",
  SUBMITTED_TO_AUTHORITY: "Submitted",
  AWAITING_APPROVAL: "Awaiting Approval",
  APPROVED: "Approved",
  COMPLETED: "Completed",
  LOST: "Lost",
};

export const LEAD_STAGE_COLORS: Record<LeadStageValue, { dot: string; bg: string; text: string }> = {
  NEW_ENQUIRY: { dot: "#6B7280", bg: "bg-gray-50", text: "text-gray-600" },
  QUALIFIED: { dot: "#2563EB", bg: "bg-blue-50", text: "text-blue-700" },
  PROPOSAL_SENT: { dot: "#7C3AED", bg: "bg-purple-50", text: "text-purple-700" },
  DOCUMENTS_COLLECTION: { dot: "#D97706", bg: "bg-amber-50", text: "text-amber-700" },
  SUBMITTED_TO_AUTHORITY: { dot: "#0891B2", bg: "bg-cyan-50", text: "text-cyan-700" },
  AWAITING_APPROVAL: { dot: "#CA8A04", bg: "bg-yellow-50", text: "text-yellow-700" },
  APPROVED: { dot: "#16A34A", bg: "bg-green-50", text: "text-green-700" },
  COMPLETED: { dot: "#15803D", bg: "bg-emerald-50", text: "text-emerald-700" },
  LOST: { dot: "#DC2626", bg: "bg-red-50", text: "text-red-600" },
};

export type LeadPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export const LEAD_PRIORITIES: LeadPriorityValue[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const LEAD_PRIORITY_META: Record<LeadPriorityValue, { label: string; bg: string; text: string }> = {
  LOW: { label: "Low", bg: "bg-gray-100", text: "text-gray-500" },
  MEDIUM: { label: "Medium", bg: "bg-blue-50", text: "text-blue-600" },
  HIGH: { label: "High", bg: "bg-amber-50", text: "text-amber-700" },
  URGENT: { label: "Urgent", bg: "bg-red-50", text: "text-red-600" },
};

export type LeadActivityTypeValue =
  | "NOTE" | "CALL" | "WHATSAPP" | "EMAIL" | "MEETING" | "STAGE_CHANGE"
  | "DOCUMENT_RECEIVED" | "PAYMENT_RECEIVED" | "PROPOSAL_SENT" | "REMINDER_SENT";

export const ACTIVITY_TYPES: LeadActivityTypeValue[] = [
  "NOTE", "CALL", "WHATSAPP", "EMAIL", "MEETING", "DOCUMENT_RECEIVED", "PAYMENT_RECEIVED",
];

export const ACTIVITY_META: Record<LeadActivityTypeValue, { label: string; glyph: string }> = {
  NOTE: { label: "Note", glyph: "📝" },
  CALL: { label: "Call", glyph: "📞" },
  WHATSAPP: { label: "WhatsApp", glyph: "💬" },
  EMAIL: { label: "Email", glyph: "✉️" },
  MEETING: { label: "Meeting", glyph: "🤝" },
  STAGE_CHANGE: { label: "Stage change", glyph: "🔁" },
  DOCUMENT_RECEIVED: { label: "Document received", glyph: "📎" },
  PAYMENT_RECEIVED: { label: "Payment received", glyph: "💰" },
  PROPOSAL_SENT: { label: "Proposal sent", glyph: "📄" },
  REMINDER_SENT: { label: "Reminder sent", glyph: "🔔" },
};

export const LEAD_SOURCES = ["WhatsApp", "Walk-in", "Referral", "Website", "Phone", "Social Media", "Other"];

export function stageLabel(s: string): string {
  return LEAD_STAGE_LABELS[s as LeadStageValue] ?? s;
}
export function activityLabel(t: string): string {
  return ACTIVITY_META[t as LeadActivityTypeValue]?.label ?? t;
}
export function activityGlyph(t: string): string {
  return ACTIVITY_META[t as LeadActivityTypeValue]?.glyph ?? "•";
}
