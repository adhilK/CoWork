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
  // UAE
  "GDRFA", "ICA", "MoHRE", "DED", "DHA", "MOFA (UAE)", "Amer", "Tasheel", "Typing Centre",
  // KSA
  "MISA", "MoHR (KSA)", "Absher", "Muqeem", "Qiwa", "GOSI", "ZATCA", "Jawazat", "MOFA (KSA)", "MOI (KSA)",
  // General
  "Chamber of Commerce", "Other",
];

/** Default governing body for each service type — used to auto-fill the create dialog. */
export const SERVICE_DEFAULT_GOVERNING_BODY: Record<string, string> = {
  UAE_VISA_NEW: "GDRFA",
  UAE_VISA_RENEWAL: "GDRFA",
  UAE_VISA_CANCELLATION: "GDRFA",
  UAE_EMIRATES_ID_NEW: "ICA",
  UAE_EMIRATES_ID_RENEWAL: "ICA",
  UAE_ESTABLISHMENT_CARD: "GDRFA",
  UAE_ECHANNEL_REGISTRATION: "ICA",
  UAE_MEDICAL_FITNESS: "DHA",
  UAE_GDRFA_SERVICE: "GDRFA",
  UAE_DED_TRANSACTION: "DED",
  UAE_ATTESTATION: "MOFA (UAE)",
  UAE_TYPING_SERVICE: "Typing Centre",
  UAE_EJARI_REGISTRATION: "Tasheel",
  UAE_TRADE_LICENSE_RENEWAL: "DED",
  KSA_IQAMA_NEW: "Muqeem",
  KSA_IQAMA_RENEWAL: "Muqeem",
  KSA_QIWA_REGISTRATION: "Qiwa",
  KSA_MUQEEM_REGISTRATION: "Muqeem",
  KSA_GOSI_REGISTRATION: "GOSI",
  KSA_LABOUR_CONTRACT: "MoHR (KSA)",
  KSA_EXIT_REENTRY_VISA: "Absher",
  KSA_DEPENDENT_VISA: "Absher",
  KSA_ATTESTATION: "MOFA (KSA)",
  KSA_MINISTRY_HR_TRANSACTION: "MoHR (KSA)",
  KSA_TRADE_LICENSE_RENEWAL: "MISA",
  DOCUMENT_ATTESTATION: "MOFA (UAE)",
  NOTARISATION: "Other",
  OTHER: "",
};

type Step = { step: string; status: "pending" };
const p = (step: string): Step => ({ step, status: "pending" });

/** Accurate per-service-type step checklists — seeded on request creation. */
export const SERVICE_STEP_TEMPLATES: Record<string, Step[]> = {
  UAE_VISA_NEW: [
    p("Collect employee documents: passport copy, 2 passport photos, qualification certificates"),
    p("Apply for work permit / labour card on MoHRE portal"),
    p("Issue entry permit via eChannel / ICA"),
    p("Employee enters UAE on entry permit (if currently outside UAE)"),
    p("Medical fitness test at DHA/HAAD-approved centre"),
    p("Emirates ID biometrics appointment at ICA / Amer centre"),
    p("Residence visa stamping in passport (GDRFA)"),
    p("Labour contract registration on MoHRE"),
    p("Deliver stamped passport and Emirates ID to employee"),
  ],

  UAE_VISA_RENEWAL: [
    p("Check visa and Emirates ID expiry dates"),
    p("Collect documents: passport, current visa copy, Emirates ID, 2 passport photos"),
    p("Medical fitness renewal (required for domestic workers and certain visa categories)"),
    p("Submit work permit renewal on MoHRE"),
    p("Apply for visa renewal via eChannel / Amer centre"),
    p("Pay government renewal fees"),
    p("Emirates ID renewal (if expiring concurrently)"),
    p("Collect stamped passport and renewed Emirates ID"),
  ],

  UAE_VISA_CANCELLATION: [
    p("Collect employee's original documents (passport, Emirates ID)"),
    p("Confirm end-of-service settlement and gratuity calculation is complete"),
    p("Cancel labour card / work permit on MoHRE portal"),
    p("Cancel residence visa via eChannel / GDRFA"),
    p("Cancel Emirates ID (ICA)"),
    p("Confirm 30-day visa grace period commences or employee exits UAE"),
    p("Issue cancellation certificate to employee"),
  ],

  UAE_EMIRATES_ID_NEW: [
    p("Collect passport copy and current UAE entry stamp or residence visa"),
    p("Book biometrics appointment at ICA / Amer centre"),
    p("Attend biometrics session (fingerprints and photo capture)"),
    p("Submit application and pay ICA fee"),
    p("Track application status via ICA portal or SMS"),
    p("Collect Emirates ID card or arrange authorised collection / delivery"),
  ],

  UAE_EMIRATES_ID_RENEWAL: [
    p("Confirm Emirates ID expiry date (renewal window opens 180 days before expiry)"),
    p("Collect expiring Emirates ID and valid passport"),
    p("Submit renewal online via ICA portal or at Amer / typing centre"),
    p("Pay ICA renewal fee"),
    p("Collect renewed Emirates ID card"),
  ],

  UAE_ESTABLISHMENT_CARD: [
    p("Collect trade license, MOA, and authorised signatory's passport and visa copies"),
    p("Complete application form at approved typing centre (Amer / Tasheel)"),
    p("Submit to GDRFA / ICA"),
    p("Pay establishment card fees"),
    p("Collect establishment card (enables visa quota allocation for the company)"),
  ],

  UAE_ECHANNEL_REGISTRATION: [
    p("Collect trade license, MOA, and authorised signatory Emirates ID / passport"),
    p("Create company account on ICA eChannel portal"),
    p("Link establishment card to company profile"),
    p("Configure and activate visa quota allocation"),
    p("Test portal access and confirm activation with ICA"),
  ],

  UAE_MEDICAL_FITNESS: [
    p("Book appointment at DHA/HAAD-approved medical centre"),
    p("Collect passport copy and passport photo for the centre"),
    p("Attend medical: blood test, chest X-ray, and physical examination"),
    p("Receive medical fitness certificate (fit / unfit result)"),
    p("Submit certificate to relevant authority (ICA, MoHRE, or embassy)"),
  ],

  UAE_GDRFA_SERVICE: [
    p("Confirm specific GDRFA service type required"),
    p("Collect all required supporting documents"),
    p("Complete application at Amer / Tasheel typing centre"),
    p("Submit to GDRFA office or online portal"),
    p("Pay applicable government fees"),
    p("Collect stamped documents / confirmation reference"),
  ],

  UAE_DED_TRANSACTION: [
    p("Confirm transaction type (renewal, amendment, initial approval, liquidation, etc.)"),
    p("Collect required documents (trade license, MOA, NOC, activity list as applicable)"),
    p("Clear any DED violations or outstanding fines"),
    p("Submit application via Basher (DED online portal) or DED customer happiness centre"),
    p("Pay applicable fees"),
    p("Collect updated trade license or confirmation document"),
  ],

  UAE_ATTESTATION: [
    p("Receive original document to be attested"),
    p("Notarisation at UAE courts-registered notary public (required for private/commercial documents)"),
    p("Ministry of Justice (MoJ) attestation (for UAE-issued official documents)"),
    p("Ministry of Foreign Affairs (MOFA UAE) attestation"),
    p("Target country embassy or consulate attestation (required if document is for overseas use)"),
    p("Certified English/Arabic translation (if required for the target country)"),
    p("Deliver fully attested document to client"),
  ],

  UAE_TYPING_SERVICE: [
    p("Receive client documents and details of the required transaction"),
    p("Complete government forms at approved typing centre (Amer / Tasheel / Barq)"),
    p("Review completed forms with client and confirm accuracy"),
    p("Submit to relevant authority online or in person"),
    p("Provide client with receipt and application reference number"),
  ],

  UAE_EJARI_REGISTRATION: [
    p("Collect signed tenancy contract, title deed, landlord ID, and tenant passport / Emirates ID copies"),
    p("Register tenancy on Ejari system via Tasheel / RERA portal"),
    p("Pay Ejari registration fee (AED 160–220)"),
    p("Generate and download Ejari certificate"),
    p("Deliver Ejari certificate to tenant"),
  ],

  UAE_TRADE_LICENSE_RENEWAL: [
    p("Confirm trade license expiry date and applicable grace period (21 days post-expiry for DED)"),
    p("Collect current trade license, MOA, and Ejari / tenancy contract if renewal is required"),
    p("Clear any outstanding DED fines or municipality violations"),
    p("Renew Ejari or obtain NOC from relevant government authority if required"),
    p("Submit renewal application via Basher (DED) or freezone authority portal"),
    p("Pay renewal fees (license fee + municipality fee + PRO fee)"),
    p("Receive renewed trade license"),
  ],

  KSA_IQAMA_NEW: [
    p("Collect employee documents: passport, 2 passport photos, educational certificates"),
    p("Arrange work visa issuance from Saudi embassy in employee's home country"),
    p("Employee travels to KSA on the issued work visa"),
    p("Medical examination at Saudi Ministry of Health-approved centre"),
    p("Fingerprinting at Jawazat (Saudi Directorate of Passports)"),
    p("Register work permit on Qiwa platform"),
    p("Register employee residency on Muqeem platform"),
    p("Process Iqama issuance via Absher (employer / sponsor)"),
    p("Pay Iqama issuance fees"),
    p("Deliver Iqama card to employee"),
  ],

  KSA_IQAMA_RENEWAL: [
    p("Confirm Iqama expiry date (renew before expiry to avoid overstay fines)"),
    p("Verify Nitaqat (Saudization) compliance status — company must be Green or Platinum band"),
    p("Collect documents: current Iqama, valid passport, updated labour contract"),
    p("Pay Muqeem levy (if applicable to the employee's category)"),
    p("Clear any outstanding government fines (traffic violations, MoI penalties)"),
    p("Renew work permit on Qiwa"),
    p("Submit Iqama renewal via Absher / Muqeem portal"),
    p("Pay Iqama renewal government fees"),
    p("Collect renewed Iqama card"),
  ],

  KSA_QIWA_REGISTRATION: [
    p("Log in to Qiwa platform with company Commercial Registration (CR) and authorised user ID"),
    p("Add employee record using national ID or Iqama number"),
    p("Upload signed Arabic labour contract"),
    p("Confirm salary, job title, and employment type"),
    p("Verify Nitaqat compliance percentage (Saudization ratio)"),
    p("Receive Qiwa work permit confirmation"),
  ],

  KSA_MUQEEM_REGISTRATION: [
    p("Collect employee Iqama, passport, and employer Commercial Registration details"),
    p("Log in to Muqeem (هجرة) portal"),
    p("Register employee residential address and residency details"),
    p("Pay Muqeem levy if applicable to the employee category"),
    p("Confirm registration and save reference number"),
  ],

  KSA_GOSI_REGISTRATION: [
    p("Confirm company is registered on GOSI portal (gosi.gov.sa)"),
    p("Add employee: national ID / Iqama number, employment start date, salary, and job grade"),
    p("Confirm contribution rates (employer 2% + employee 1% for non-Saudis; higher rates for Saudi nationals)"),
    p("Configure monthly payroll deduction and payment schedule"),
    p("Receive GOSI registration certificate"),
  ],

  KSA_LABOUR_CONTRACT: [
    p("Draft labour contract in Arabic in accordance with Saudi Labour Law (Royal Decree M/51)"),
    p("Include all mandatory clauses: salary, working hours (48h/week), annual leave (21 days), notice period, and termination conditions"),
    p("Upload contract to Qiwa authentication platform"),
    p("Employee authenticates contract via Qiwa (digital signature)"),
    p("Employer counter-signs via Qiwa"),
    p("Receive Qiwa-authenticated labour contract (legally binding)"),
  ],

  KSA_EXIT_REENTRY_VISA: [
    p("Verify Iqama is valid for the full duration of the planned trip"),
    p("Check Muqeem status and confirm no exit restrictions are in place"),
    p("Apply for single or multiple exit/re-entry visa on Absher (أبشر)"),
    p("Pay applicable government fees"),
    p("Receive digital exit/re-entry visa authorisation via Absher"),
    p("Confirm travel details with employee and provide Absher authorisation printout"),
  ],

  KSA_DEPENDENT_VISA: [
    p("Confirm sponsor's Iqama is valid and salary meets minimum threshold (SAR 3,000+)"),
    p("Collect sponsor documents: Iqama copy, salary certificate, proof of accommodation"),
    p("Collect dependent documents: passport, marriage certificate (spouse), birth certificates (children), family record"),
    p("Apply for family/dependent visa via Absher or Saudi embassy in the home country"),
    p("Dependent enters KSA on the issued family visa"),
    p("Medical examination at Ministry of Health-approved centre"),
    p("Fingerprinting at Jawazat"),
    p("Process dependent Iqama issuance via Absher"),
    p("Deliver Iqama card to dependent"),
  ],

  KSA_ATTESTATION: [
    p("Receive original document and confirm intended purpose and target country"),
    p("Notarisation at Saudi court-registered notary public (for KSA-issued documents) or local notary (for foreign documents)"),
    p("Chamber of Commerce attestation (required for commercial and trade documents)"),
    p("Ministry of Foreign Affairs (MOFA KSA) attestation"),
    p("Target country embassy or consulate attestation in KSA (if document is for overseas use)"),
    p("Certified Arabic translation of foreign-language documents (if required)"),
    p("Deliver fully attested documents to client"),
  ],

  KSA_MINISTRY_HR_TRANSACTION: [
    p("Identify specific MoHR transaction type (wage protection, labour complaint, work permit, inspection clearance, etc.)"),
    p("Collect required supporting documents"),
    p("Register or log in on Qiwa / Musaned / MoHR portal as applicable to the transaction"),
    p("Submit transaction request with all required attachments"),
    p("Pay applicable government fees"),
    p("Follow up on processing status and respond to authority queries"),
    p("Receive resolution, clearance certificate, or confirmation from MoHR"),
  ],

  KSA_TRADE_LICENSE_RENEWAL: [
    p("Confirm Commercial Registration (CR) expiry date"),
    p("Verify Saudization / Nitaqat compliance — company must be in Green or Platinum band"),
    p("Clear any outstanding municipal fees, government fines, or violations"),
    p("Renew municipal business license on Balady portal (for activities requiring municipal approval)"),
    p("Renew Commercial Registration on Ministry of Commerce portal"),
    p("Renew Foreign Investment License on MISA portal (for MISA-registered entities)"),
    p("Update Chamber of Commerce membership if applicable"),
    p("Pay all applicable renewal fees"),
    p("Receive renewed Commercial Registration (CR)"),
  ],

  DOCUMENT_ATTESTATION: [
    p("Receive original document and clarify intended use and target country requirements"),
    p("Identify the required attestation chain specific to the destination country"),
    p("Notarisation at registered notary public (for private documents)"),
    p("Relevant ministry or authority attestation (Ministry of Education, Justice, Health, etc. as applicable)"),
    p("Ministry of Foreign Affairs (MOFA) attestation in the issuing country"),
    p("UAE or KSA MOFA counter-attestation"),
    p("Target country embassy or consulate attestation in UAE or KSA"),
    p("Certified translation into the target language (if required)"),
    p("Deliver fully attested and translated document to client"),
  ],

  NOTARISATION: [
    p("Confirm document type and notarisation requirement"),
    p("Verify identity of all signatories (passport, Emirates ID, or Iqama)"),
    p("Attend registered notary public or courts"),
    p("Witness execution of signatures by all parties"),
    p("Notary affixes seal and issues notarisation certificate"),
    p("Deliver notarised document to client"),
  ],

  OTHER: [],
};

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
