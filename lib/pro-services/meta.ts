// Client-safe PRO Services metadata.

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  UAE_VISA_NEW: "New Employment Visa",
  UAE_VISA_RENEWAL: "Visa Renewal",
  UAE_VISA_CANCELLATION: "Visa Cancellation",
  UAE_EMIRATES_ID_NEW: "Emirates ID — New",
  UAE_EMIRATES_ID_RENEWAL: "Emirates ID — Renewal",
  UAE_ESTABLISHMENT_CARD: "Establishment Card",
  UAE_ECHANNEL_REGISTRATION: "eChannel Registration",
  UAE_MEDICAL_FITNESS: "Medical Fitness",
  UAE_GDRFA_SERVICE: "GDRFA Service",
  UAE_DED_TRANSACTION: "DED Transaction",
  UAE_ATTESTATION: "Attestation (UAE)",
  UAE_TYPING_SERVICE: "Typing Service",
  UAE_EJARI_REGISTRATION: "Ejari Registration",
  UAE_TRADE_LICENSE_RENEWAL: "Trade License Renewal (UAE)",
  KSA_IQAMA_NEW: "Iqama — New",
  KSA_IQAMA_RENEWAL: "Iqama — Renewal",
  KSA_QIWA_REGISTRATION: "Qiwa Registration",
  KSA_MUQEEM_REGISTRATION: "Muqeem Registration",
  KSA_GOSI_REGISTRATION: "GOSI Registration",
  KSA_LABOUR_CONTRACT: "Labour Contract",
  KSA_EXIT_REENTRY_VISA: "Exit/Re-entry Visa",
  KSA_DEPENDENT_VISA: "Dependent Visa (KSA)",
  KSA_ATTESTATION: "Attestation (KSA)",
  KSA_MINISTRY_HR_TRANSACTION: "MoHR Transaction",
  KSA_TRADE_LICENSE_RENEWAL: "Trade License Renewal (KSA)",
  DOCUMENT_ATTESTATION: "Document Attestation",
  NOTARISATION: "Notarisation",
  OTHER: "Other",
};

export const SERVICE_TYPE_GROUPS: { label: string; jurisdiction: "UAE" | "KSA" | "ALL"; types: string[] }[] = [
  {
    label: "UAE — Visa & Immigration", jurisdiction: "UAE",
    types: ["UAE_VISA_NEW", "UAE_VISA_RENEWAL", "UAE_VISA_CANCELLATION", "UAE_EMIRATES_ID_NEW", "UAE_EMIRATES_ID_RENEWAL", "UAE_MEDICAL_FITNESS", "UAE_GDRFA_SERVICE", "UAE_ESTABLISHMENT_CARD", "UAE_ECHANNEL_REGISTRATION"],
  },
  {
    label: "UAE — Other", jurisdiction: "UAE",
    types: ["UAE_DED_TRANSACTION", "UAE_ATTESTATION", "UAE_TYPING_SERVICE", "UAE_EJARI_REGISTRATION", "UAE_TRADE_LICENSE_RENEWAL"],
  },
  {
    label: "KSA", jurisdiction: "KSA",
    types: ["KSA_IQAMA_NEW", "KSA_IQAMA_RENEWAL", "KSA_QIWA_REGISTRATION", "KSA_MUQEEM_REGISTRATION", "KSA_GOSI_REGISTRATION", "KSA_LABOUR_CONTRACT", "KSA_EXIT_REENTRY_VISA", "KSA_DEPENDENT_VISA", "KSA_ATTESTATION", "KSA_MINISTRY_HR_TRANSACTION", "KSA_TRADE_LICENSE_RENEWAL"],
  },
  { label: "General", jurisdiction: "ALL", types: ["DOCUMENT_ATTESTATION", "NOTARISATION", "OTHER"] },
];

export const ALL_SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS);

export function serviceTypeLabel(t: string): string {
  return SERVICE_TYPE_LABELS[t] ?? t;
}

export type ProStageValue =
  | "SUBMITTED" | "DOCUMENTS_PENDING" | "DOCUMENTS_RECEIVED" | "IN_PROGRESS" | "AT_TYPING_CENTRE"
  | "AT_GOVERNMENT" | "AWAITING_COLLECTION" | "COMPLETED" | "ON_HOLD" | "CANCELLED";

export const PRO_STAGES: ProStageValue[] = [
  "SUBMITTED", "DOCUMENTS_PENDING", "DOCUMENTS_RECEIVED", "IN_PROGRESS", "AT_TYPING_CENTRE",
  "AT_GOVERNMENT", "AWAITING_COLLECTION", "COMPLETED", "ON_HOLD", "CANCELLED",
];

export const OPEN_STAGES: ProStageValue[] = PRO_STAGES.filter((s) => s !== "COMPLETED" && s !== "CANCELLED");

export const PRO_STAGE_LABELS: Record<ProStageValue, string> = {
  SUBMITTED: "Submitted",
  DOCUMENTS_PENDING: "Documents Pending",
  DOCUMENTS_RECEIVED: "Documents Received",
  IN_PROGRESS: "In Progress",
  AT_TYPING_CENTRE: "At Typing Centre",
  AT_GOVERNMENT: "At Government",
  AWAITING_COLLECTION: "Awaiting Collection",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
};

export const PRO_STAGE_META: Record<ProStageValue, { bg: string; text: string; dot: string }> = {
  SUBMITTED: { bg: "bg-gray-50", text: "text-gray-600", dot: "#6B7280" },
  DOCUMENTS_PENDING: { bg: "bg-amber-50", text: "text-amber-700", dot: "#D97706" },
  DOCUMENTS_RECEIVED: { bg: "bg-blue-50", text: "text-blue-700", dot: "#2563EB" },
  IN_PROGRESS: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "#4F46E5" },
  AT_TYPING_CENTRE: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "#0891B2" },
  AT_GOVERNMENT: { bg: "bg-purple-50", text: "text-purple-700", dot: "#7C3AED" },
  AWAITING_COLLECTION: { bg: "bg-teal-50", text: "text-teal-700", dot: "#0D9488" },
  COMPLETED: { bg: "bg-green-50", text: "text-green-700", dot: "#16A34A" },
  ON_HOLD: { bg: "bg-orange-50", text: "text-orange-700", dot: "#EA580C" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-600", dot: "#DC2626" },
};

export type UrgencyValue = "STANDARD" | "EXPRESS" | "URGENT";
export const URGENCIES: UrgencyValue[] = ["STANDARD", "EXPRESS", "URGENT"];
export const URGENCY_META: Record<UrgencyValue, { label: string; bg: string; text: string; slaDays: number }> = {
  STANDARD: { label: "Standard", bg: "bg-gray-100", text: "text-gray-500", slaDays: 7 },
  EXPRESS: { label: "Express", bg: "bg-amber-50", text: "text-amber-700", slaDays: 3 },
  URGENT: { label: "Urgent", bg: "bg-red-50", text: "text-red-600", slaDays: 1 },
};

export const GOVERNING_BODIES = [
  "GDRFA", "ICA", "MoHRE", "DED", "DHA", "MOFA (UAE)", "Amer", "Tasheel", "Typing Centre",
  "MISA", "MoHR (KSA)", "Absher", "Muqeem", "Qiwa", "GOSI", "Chamber of Commerce", "Other",
];

export function proStageLabel(s: string): string {
  return PRO_STAGE_LABELS[s as ProStageValue] ?? s;
}

/** SLA status for a request given its dueDate + stage. */
export function slaStatus(dueDate: string | Date | null, stage: string): "none" | "overdue" | "soon" | "ok" {
  if (stage === "COMPLETED" || stage === "CANCELLED") return "none";
  if (!dueDate) return "none";
  const d = new Date(dueDate).getTime();
  const now = Date.now();
  if (d < now) return "overdue";
  if (d < now + 2 * 24 * 60 * 60 * 1000) return "soon";
  return "ok";
}
