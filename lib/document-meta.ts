// Client-safe document metadata: labels, grouping, and icons. No server imports.

export type DocumentTypeValue =
  | "PASSPORT" | "EMIRATES_ID" | "IQAMA" | "VISA" | "TRADE_LICENSE" | "EJARI"
  | "ESTABLISHMENT_CARD" | "SHARE_CERTIFICATE" | "MOA" | "AOA" | "BANK_STATEMENT"
  | "INSURANCE_CERTIFICATE" | "POWER_OF_ATTORNEY" | "TENANCY_CONTRACT"
  | "MEDICAL_FITNESS" | "POLICE_CLEARANCE" | "DEGREE_CERTIFICATE" | "OTHER";

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeValue, string> = {
  PASSPORT: "Passport",
  EMIRATES_ID: "Emirates ID",
  IQAMA: "Iqama",
  VISA: "Visa",
  TRADE_LICENSE: "Trade License",
  EJARI: "Ejari",
  ESTABLISHMENT_CARD: "Establishment Card",
  SHARE_CERTIFICATE: "Share Certificate",
  MOA: "Memorandum of Association",
  AOA: "Articles of Association",
  BANK_STATEMENT: "Bank Statement",
  INSURANCE_CERTIFICATE: "Insurance Certificate",
  POWER_OF_ATTORNEY: "Power of Attorney",
  TENANCY_CONTRACT: "Tenancy Contract",
  MEDICAL_FITNESS: "Medical Fitness",
  POLICE_CLEARANCE: "Police Clearance",
  DEGREE_CERTIFICATE: "Degree Certificate",
  OTHER: "Other",
};

// Grouped for the upload picker — identity docs first, then corporate, then misc.
export const DOCUMENT_TYPE_GROUPS: { label: string; types: DocumentTypeValue[] }[] = [
  { label: "Identity & Residency", types: ["PASSPORT", "EMIRATES_ID", "IQAMA", "VISA", "MEDICAL_FITNESS", "POLICE_CLEARANCE", "DEGREE_CERTIFICATE"] },
  { label: "Company & License", types: ["TRADE_LICENSE", "ESTABLISHMENT_CARD", "EJARI", "SHARE_CERTIFICATE", "MOA", "AOA", "POWER_OF_ATTORNEY", "TENANCY_CONTRACT"] },
  { label: "Financial & Other", types: ["BANK_STATEMENT", "INSURANCE_CERTIFICATE", "OTHER"] },
];

export const ALL_DOCUMENT_TYPES: DocumentTypeValue[] = DOCUMENT_TYPE_GROUPS.flatMap((g) => g.types);

export function documentTypeLabel(t: string): string {
  return DOCUMENT_TYPE_LABELS[t as DocumentTypeValue] ?? t;
}

/** A small emoji glyph per type for compact list rows. */
export function documentTypeGlyph(t: string): string {
  switch (t) {
    case "PASSPORT": return "🛂";
    case "EMIRATES_ID":
    case "IQAMA": return "🪪";
    case "VISA": return "✈️";
    case "TRADE_LICENSE":
    case "ESTABLISHMENT_CARD": return "🏢";
    case "EJARI":
    case "TENANCY_CONTRACT": return "🏠";
    case "SHARE_CERTIFICATE":
    case "MOA":
    case "AOA": return "📜";
    case "BANK_STATEMENT": return "🏦";
    case "INSURANCE_CERTIFICATE": return "🛡️";
    case "POWER_OF_ATTORNEY": return "⚖️";
    case "MEDICAL_FITNESS": return "🩺";
    case "POLICE_CLEARANCE": return "👮";
    case "DEGREE_CERTIFICATE": return "🎓";
    default: return "📄";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Expiry bucket for badges. */
export function expiryBucket(expiryDate: string | Date | null): "expired" | "soon" | "valid" | "none" {
  if (!expiryDate) return "none";
  const d = new Date(expiryDate).getTime();
  const now = Date.now();
  if (d < now) return "expired";
  if (d < now + 30 * 24 * 60 * 60 * 1000) return "soon";
  return "valid";
}
