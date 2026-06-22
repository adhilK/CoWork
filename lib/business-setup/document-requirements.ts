/**
 * Required document checklists per license type.
 * Used to drive the Document Completeness Check on BS lead detail pages.
 * documentType must match the DOCUMENT_TYPES enum in prisma/schema.prisma.
 */

export type DocRequirement = {
  label: string;
  documentType: string;
  optional?: boolean;
};

const DOCUMENT_REQUIREMENTS: Record<string, DocRequirement[]> = {
  UAE_MAINLAND_DED: [
    { label: "Passport copies — all shareholders & directors", documentType: "PASSPORT" },
    { label: "UAE residence visa (resident shareholders)", documentType: "VISA", optional: true },
    { label: "Emirates ID (resident shareholders)", documentType: "EMIRATES_ID", optional: true },
    { label: "Memorandum of Association (MOA) — draft", documentType: "MOA" },
    { label: "Office tenancy contract / Ejari", documentType: "EJARI" },
    { label: "DED initial approval certificate", documentType: "OTHER" },
    { label: "Trade name reservation certificate", documentType: "OTHER" },
    { label: "No Objection Certificate (for sponsored visa holders)", documentType: "OTHER", optional: true },
    { label: "Bank reference letter (specific regulated activities)", documentType: "BANK_STATEMENT", optional: true },
  ],

  UAE_FREEZONE: [
    { label: "Passport copies — all shareholders & directors", documentType: "PASSPORT" },
    { label: "UAE residence visa (if applicable)", documentType: "VISA", optional: true },
    { label: "Emirates ID (if applicable)", documentType: "EMIRATES_ID", optional: true },
    { label: "Memorandum of Association / shareholder agreement", documentType: "MOA" },
    { label: "Business plan (required by most freezones)", documentType: "OTHER" },
    { label: "Bank reference letter", documentType: "BANK_STATEMENT" },
    { label: "Freezone lease agreement (flexi-desk or office)", documentType: "TENANCY_CONTRACT" },
  ],

  UAE_OFFSHORE_RAKICC: [
    { label: "Passport copies — all shareholders & directors", documentType: "PASSPORT" },
    { label: "Proof of residential address (utility bill or bank statement)", documentType: "OTHER" },
    { label: "Source of funds declaration", documentType: "OTHER" },
    { label: "Bank reference letter (from shareholder's home bank)", documentType: "BANK_STATEMENT" },
    { label: "Memorandum and Articles of Association", documentType: "MOA" },
    { label: "Police clearance certificate (required by some agents)", documentType: "POLICE_CLEARANCE", optional: true },
  ],

  UAE_OFFSHORE_JAFZA: [
    { label: "Passport copies — all shareholders & directors", documentType: "PASSPORT" },
    { label: "Proof of residential address (utility bill or bank statement)", documentType: "OTHER" },
    { label: "Source of funds declaration", documentType: "OTHER" },
    { label: "Bank reference letter", documentType: "BANK_STATEMENT" },
    { label: "Memorandum and Articles of Association", documentType: "MOA" },
    { label: "Evidence of UAE property (if using for property holding)", documentType: "OTHER", optional: true },
  ],

  UAE_BRANCH_OFFICE: [
    { label: "Parent company certificate of incorporation (attested)", documentType: "OTHER" },
    { label: "Parent company Memorandum of Association (attested)", documentType: "MOA" },
    { label: "Board resolution authorising UAE branch & branch manager", documentType: "OTHER" },
    { label: "Parent company audited financial statements (last 2 years)", documentType: "BANK_STATEMENT" },
    { label: "Power of attorney — UAE branch manager", documentType: "POWER_OF_ATTORNEY" },
    { label: "Branch manager's passport copy", documentType: "PASSPORT" },
    { label: "Branch manager's UAE residence visa", documentType: "VISA", optional: true },
    { label: "UAE MOFA attestation of parent company documents", documentType: "OTHER" },
    { label: "Office lease / Ejari for the UAE branch", documentType: "EJARI" },
  ],

  KSA_MAINLAND_MISA: [
    { label: "Passport copies — all shareholders & directors", documentType: "PASSPORT" },
    { label: "Parent company certificate of incorporation (if foreign)", documentType: "OTHER" },
    { label: "Parent company MOA / Articles of Association (Arabic)", documentType: "AOA" },
    { label: "Board resolution authorising KSA investment", documentType: "OTHER" },
    { label: "MISA Foreign Investment License (FIL) application", documentType: "OTHER" },
    { label: "Bank confirmation letter (for share capital deposit)", documentType: "BANK_STATEMENT" },
    { label: "MOFA attestation of parent company documents (if foreign)", documentType: "OTHER" },
    { label: "Saudi notarised Articles of Association", documentType: "MOA" },
  ],

  KSA_SEZ_KAFD: [
    { label: "Passport copies — all shareholders & directors", documentType: "PASSPORT" },
    { label: "Business plan and investment rationale", documentType: "OTHER" },
    { label: "Parent company certificate of incorporation (if foreign)", documentType: "OTHER" },
    { label: "Board resolution authorising KSA SEZ entity", documentType: "OTHER" },
    { label: "KAFD lease agreement", documentType: "TENANCY_CONTRACT" },
    { label: "Bank confirmation letter (for capital deposit)", documentType: "BANK_STATEMENT" },
    { label: "Articles of Association (Arabic)", documentType: "AOA" },
  ],

  KSA_SEZ_NEOM: [
    { label: "Passport copies — all shareholders & directors", documentType: "PASSPORT" },
    { label: "Business plan and NEOM project rationale", documentType: "OTHER" },
    { label: "Parent company certificate of incorporation (if foreign)", documentType: "OTHER" },
    { label: "Board resolution authorising NEOM entity", documentType: "OTHER" },
    { label: "NEOM space / land allocation agreement", documentType: "TENANCY_CONTRACT" },
    { label: "Bank confirmation letter (for capital deposit)", documentType: "BANK_STATEMENT" },
    { label: "Articles of Association (Arabic)", documentType: "AOA" },
  ],

  KSA_SEZ_JAZAN: [
    { label: "Passport copies — all shareholders & directors", documentType: "PASSPORT" },
    { label: "Business plan and project description", documentType: "OTHER" },
    { label: "Parent company certificate of incorporation (if foreign)", documentType: "OTHER" },
    { label: "Board resolution authorising Jazan entity", documentType: "OTHER" },
    { label: "JCEC facility/land lease agreement", documentType: "TENANCY_CONTRACT" },
    { label: "Bank confirmation letter (for capital deposit)", documentType: "BANK_STATEMENT" },
    { label: "Articles of Association (Arabic)", documentType: "AOA" },
  ],

  KSA_BRANCH_OFFICE: [
    { label: "MISA Foreign Investment License (FIL) application", documentType: "OTHER" },
    { label: "Parent company certificate of incorporation (attested)", documentType: "OTHER" },
    { label: "Parent company MOA / Articles of Association (attested)", documentType: "MOA" },
    { label: "Board resolution authorising KSA branch & branch manager", documentType: "OTHER" },
    { label: "Parent company audited financial statements (last 2 years)", documentType: "BANK_STATEMENT" },
    { label: "Power of attorney — KSA branch manager", documentType: "POWER_OF_ATTORNEY" },
    { label: "Branch manager's passport copy", documentType: "PASSPORT" },
    { label: "Saudi embassy attestation of parent company documents", documentType: "OTHER" },
    { label: "KSA MOFA attestation of parent company documents", documentType: "OTHER" },
    { label: "Office lease agreement for KSA branch", documentType: "TENANCY_CONTRACT" },
  ],

  KSA_REPRESENTATIVE_OFFICE: [
    { label: "MISA approval for representative office (prior clearance)", documentType: "OTHER" },
    { label: "Parent company certificate of incorporation (attested)", documentType: "OTHER" },
    { label: "Parent company MOA / Articles of Association (attested)", documentType: "MOA" },
    { label: "Board resolution authorising KSA representative office", documentType: "OTHER" },
    { label: "Power of attorney — KSA office representative", documentType: "POWER_OF_ATTORNEY" },
    { label: "Representative's passport copy", documentType: "PASSPORT" },
    { label: "Saudi embassy attestation of parent company documents", documentType: "OTHER" },
    { label: "KSA MOFA attestation of parent company documents", documentType: "OTHER" },
    { label: "Office lease agreement", documentType: "TENANCY_CONTRACT" },
    { label: "Bank confirmation letter (for operating expenses account)", documentType: "BANK_STATEMENT" },
  ],
};

/** Returns the required document checklist for a given license type. */
export function getBsDocumentRequirements(licenseType: string): DocRequirement[] {
  return DOCUMENT_REQUIREMENTS[licenseType] ?? [];
}

/** Returns { required, optional, total } counts for a license type. */
export function getRequirementCounts(licenseType: string) {
  const reqs = getBsDocumentRequirements(licenseType);
  return {
    total: reqs.length,
    required: reqs.filter((r) => !r.optional).length,
    optional: reqs.filter((r) => r.optional).length,
  };
}
