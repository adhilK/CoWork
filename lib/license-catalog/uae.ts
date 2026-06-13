/**
 * Built-in UAE license catalog template.
 *
 * Operators import this into their org's catalog, then customise pricing and
 * which products they offer. Prices are indicative AED (VAT-exclusive) starting
 * points — real packages vary by activity, visa count, and office; the operator
 * edits them. `templateKey` is stable so re-importing is idempotent.
 *
 * Sources: public freezone/mainland package information. Treat costs as starting
 * estimates, not quotes.
 */

export type LicenseTypeValue =
  | "UAE_MAINLAND_DED" | "UAE_FREEZONE" | "UAE_OFFSHORE_RAKICC" | "UAE_OFFSHORE_JAFZA" | "UAE_BRANCH_OFFICE"
  | "KSA_MAINLAND_MISA" | "KSA_SEZ_KAFD" | "KSA_SEZ_JAZAN" | "KSA_SEZ_NEOM" | "KSA_BRANCH_OFFICE" | "KSA_REPRESENTATIVE_OFFICE";

export const LICENSE_TYPE_LABELS: Record<LicenseTypeValue, string> = {
  UAE_MAINLAND_DED: "UAE Mainland (DED)",
  UAE_FREEZONE: "UAE Freezone",
  UAE_OFFSHORE_RAKICC: "UAE Offshore (RAK ICC)",
  UAE_OFFSHORE_JAFZA: "UAE Offshore (JAFZA)",
  UAE_BRANCH_OFFICE: "UAE Branch Office",
  KSA_MAINLAND_MISA: "KSA Mainland (MISA)",
  KSA_SEZ_KAFD: "KSA SEZ — KAFD",
  KSA_SEZ_JAZAN: "KSA SEZ — Jazan",
  KSA_SEZ_NEOM: "KSA SEZ — NEOM",
  KSA_BRANCH_OFFICE: "KSA Branch Office",
  KSA_REPRESENTATIVE_OFFICE: "KSA Representative Office",
};

export function licenseTypeLabel(t: string): string {
  return LICENSE_TYPE_LABELS[t as LicenseTypeValue] ?? t;
}

export type LicenseCatalogSeed = {
  templateKey: string;
  licenseType: LicenseTypeValue;
  authority: string;
  emirate: string;
  name: string;
  activityCategory: string;
  description: string;
  baseCost: number;
  govFees: number;
  visaQuota: number;
  officeType: string;
  minShareCapital?: number;
  tenureYears: number;
  processingDays: number;
  features: string[];
  isPopular?: boolean;
};

export const UAE_LICENSE_CATALOG: LicenseCatalogSeed[] = [
  // ── Freezones ──────────────────────────────────────────────────────────────
  {
    templateKey: "ifza-commercial", licenseType: "UAE_FREEZONE", authority: "IFZA", emirate: "Dubai",
    name: "IFZA Commercial License", activityCategory: "Commercial",
    description: "Cost-effective Dubai freezone trading licence with flexible visa packages.",
    baseCost: 12900, govFees: 0, visaQuota: 1, officeType: "Flexi-desk", tenureYears: 1, processingDays: 5,
    features: ["100% foreign ownership", "No office lease required", "Dual-license option", "Up to 3 activities"],
    isPopular: true,
  },
  {
    templateKey: "ifza-professional", licenseType: "UAE_FREEZONE", authority: "IFZA", emirate: "Dubai",
    name: "IFZA Professional License", activityCategory: "Professional",
    description: "Service/consultancy licence for professionals in IFZA.",
    baseCost: 12900, govFees: 0, visaQuota: 1, officeType: "Flexi-desk", tenureYears: 1, processingDays: 5,
    features: ["100% foreign ownership", "Consultancy & services", "Remote setup"],
  },
  {
    templateKey: "dmcc-commercial", licenseType: "UAE_FREEZONE", authority: "DMCC", emirate: "Dubai",
    name: "DMCC Commercial License", activityCategory: "Commercial",
    description: "Premier Dubai freezone for trading, crypto, and commodities at JLT.",
    baseCost: 34340, govFees: 0, visaQuota: 3, officeType: "Physical office", tenureYears: 1, processingDays: 10,
    features: ["Tier-1 reputation", "Crypto/commodities activities", "Physical office in JLT", "Banking-friendly"],
    isPopular: true,
  },
  {
    templateKey: "meydan-commercial", licenseType: "UAE_FREEZONE", authority: "Meydan Free Zone", emirate: "Dubai",
    name: "Meydan Commercial License", activityCategory: "Commercial",
    description: "Prestigious Dubai address with a digital-first setup.",
    baseCost: 12500, govFees: 0, visaQuota: 0, officeType: "Virtual", tenureYears: 1, processingDays: 5,
    features: ["Dubai (Nad Al Sheba) address", "Fully digital", "Up to 3 activities"],
  },
  {
    templateKey: "shams-media", licenseType: "UAE_FREEZONE", authority: "SHAMS", emirate: "Sharjah",
    name: "Shams Media & Commercial License", activityCategory: "E-commerce",
    description: "Low-cost Sharjah Media City licence popular for freelancers and e-commerce.",
    baseCost: 5750, govFees: 0, visaQuota: 0, officeType: "Flexi-desk", tenureYears: 1, processingDays: 4,
    features: ["Budget-friendly", "Media & e-commerce activities", "Visa-optional"],
  },
  {
    templateKey: "spc-freezone", licenseType: "UAE_FREEZONE", authority: "SPC Free Zone", emirate: "Sharjah",
    name: "SPC Free Zone License", activityCategory: "Commercial",
    description: "Sharjah Publishing City — fast, affordable, instant-licence option.",
    baseCost: 6000, govFees: 0, visaQuota: 1, officeType: "Flexi-desk", tenureYears: 1, processingDays: 1,
    features: ["Instant licence", "1500+ activities", "Affordable visas"],
  },
  {
    templateKey: "rakez-commercial", licenseType: "UAE_FREEZONE", authority: "RAKEZ", emirate: "Ras Al Khaimah",
    name: "RAKEZ Commercial License", activityCategory: "Commercial",
    description: "Ras Al Khaimah Economic Zone trading licence with low overheads.",
    baseCost: 11075, govFees: 0, visaQuota: 1, officeType: "Flexi-desk", tenureYears: 1, processingDays: 5,
    features: ["Low cost", "Industrial & trading options", "Coworking to warehouses"],
  },
  {
    templateKey: "rakez-industrial", licenseType: "UAE_FREEZONE", authority: "RAKEZ", emirate: "Ras Al Khaimah",
    name: "RAKEZ Industrial License", activityCategory: "Industrial",
    description: "Manufacturing/industrial licence with warehouse and land options in RAK.",
    baseCost: 15500, govFees: 0, visaQuota: 3, officeType: "Physical office", tenureYears: 1, processingDays: 10,
    features: ["Warehouse & land", "Industrial activities", "Competitive utilities"],
  },
  {
    templateKey: "ajman-freezone", licenseType: "UAE_FREEZONE", authority: "Ajman Free Zone", emirate: "Ajman",
    name: "Ajman Free Zone License", activityCategory: "Commercial",
    description: "Budget Ajman freezone with quick setup.",
    baseCost: 8000, govFees: 0, visaQuota: 1, officeType: "Flexi-desk", tenureYears: 1, processingDays: 5,
    features: ["Low cost", "Quick setup", "Trading & services"],
  },
  {
    templateKey: "jafza-trading", licenseType: "UAE_FREEZONE", authority: "JAFZA", emirate: "Dubai",
    name: "JAFZA Trading License", activityCategory: "Commercial",
    description: "Jebel Ali Free Zone — Dubai's flagship trading and logistics hub by the port.",
    baseCost: 30000, govFees: 0, visaQuota: 6, officeType: "Physical office", tenureYears: 1, processingDays: 15,
    features: ["Adjacent to Jebel Ali Port", "Logistics & warehousing", "High visa quota"],
    isPopular: true,
  },
  {
    templateKey: "dafza-commercial", licenseType: "UAE_FREEZONE", authority: "DAFZA", emirate: "Dubai",
    name: "DAFZA Commercial License", activityCategory: "Commercial",
    description: "Dubai Airport Free Zone — premium location for trade and aviation.",
    baseCost: 35000, govFees: 0, visaQuota: 4, officeType: "Physical office", tenureYears: 1, processingDays: 12,
    features: ["Next to Dubai Airport", "Premium reputation", "Trade & aviation"],
  },
  {
    templateKey: "dubai-south", licenseType: "UAE_FREEZONE", authority: "Dubai South (DWC)", emirate: "Dubai",
    name: "Dubai South Business License", activityCategory: "Commercial",
    description: "Aviation/logistics district near Al Maktoum Airport and Expo City.",
    baseCost: 11500, govFees: 0, visaQuota: 1, officeType: "Flexi-desk", tenureYears: 1, processingDays: 7,
    features: ["Logistics & aviation", "Near DWC airport", "Expo City district"],
  },
  {
    templateKey: "difc", licenseType: "UAE_FREEZONE", authority: "DIFC", emirate: "Dubai",
    name: "DIFC Financial / Non-Financial License", activityCategory: "Professional",
    description: "Dubai International Financial Centre — common-law jurisdiction for financial firms.",
    baseCost: 45000, govFees: 12000, visaQuota: 4, officeType: "Physical office", minShareCapital: 50000,
    tenureYears: 1, processingDays: 30,
    features: ["Independent common-law courts", "Financial services (DFSA)", "Global credibility"],
  },
  {
    templateKey: "adgm", licenseType: "UAE_FREEZONE", authority: "ADGM", emirate: "Abu Dhabi",
    name: "ADGM License", activityCategory: "Professional",
    description: "Abu Dhabi Global Market — international financial centre on Al Maryah Island.",
    baseCost: 33000, govFees: 8000, visaQuota: 4, officeType: "Physical office",
    tenureYears: 1, processingDays: 25,
    features: ["Common-law framework", "Financial & holding companies", "SPV/foundation options"],
  },
  {
    templateKey: "twofour54", licenseType: "UAE_FREEZONE", authority: "twofour54", emirate: "Abu Dhabi",
    name: "twofour54 Media License", activityCategory: "E-commerce",
    description: "Abu Dhabi media and creative-industry freezone.",
    baseCost: 16000, govFees: 0, visaQuota: 2, officeType: "Flexi-desk", tenureYears: 1, processingDays: 10,
    features: ["Media & creative activities", "Production incentives", "Abu Dhabi address"],
  },
  {
    templateKey: "uaq-ftz", licenseType: "UAE_FREEZONE", authority: "UAQ FTZ", emirate: "Umm Al Quwain",
    name: "UAQ Free Trade Zone License", activityCategory: "Commercial",
    description: "Umm Al Quwain — one of the UAE's most affordable freezones.",
    baseCost: 6500, govFees: 0, visaQuota: 1, officeType: "Flexi-desk", tenureYears: 1, processingDays: 5,
    features: ["Lowest-cost option", "Trading & micro-business", "Fast setup"],
  },
  {
    templateKey: "fujairah-creative", licenseType: "UAE_FREEZONE", authority: "Fujairah Creative City", emirate: "Fujairah",
    name: "Creative City License", activityCategory: "Professional",
    description: "Fujairah freezone for media, consulting, and services — no paid-up capital.",
    baseCost: 12000, govFees: 0, visaQuota: 1, officeType: "Virtual", tenureYears: 1, processingDays: 7,
    features: ["No paid-up capital", "Media & consulting", "Remote-friendly"],
  },
  {
    templateKey: "dic-tecom", licenseType: "UAE_FREEZONE", authority: "Dubai Internet City (TECOM)", emirate: "Dubai",
    name: "Dubai Internet City License", activityCategory: "Professional",
    description: "TECOM tech cluster for IT and software companies.",
    baseCost: 33000, govFees: 0, visaQuota: 3, officeType: "Physical office", tenureYears: 1, processingDays: 14,
    features: ["Tech ecosystem", "Talent & networking", "ICT activities"],
  },

  // ── Mainland ───────────────────────────────────────────────────────────────
  {
    templateKey: "dubai-mainland-commercial", licenseType: "UAE_MAINLAND_DED", authority: "DET (Dubai)", emirate: "Dubai",
    name: "Dubai Mainland Commercial (LLC)", activityCategory: "Commercial",
    description: "Dubai Department of Economy & Tourism LLC — trade anywhere in the UAE and bid for government work.",
    baseCost: 15000, govFees: 12500, visaQuota: 3, officeType: "Physical office",
    tenureYears: 1, processingDays: 10,
    features: ["100% ownership for most activities", "Trade across UAE", "Government tenders", "Office (Ejari) required"],
    isPopular: true,
  },
  {
    templateKey: "dubai-mainland-professional", licenseType: "UAE_MAINLAND_DED", authority: "DET (Dubai)", emirate: "Dubai",
    name: "Dubai Mainland Professional", activityCategory: "Professional",
    description: "Civil/professional company for consultants and service providers.",
    baseCost: 13500, govFees: 10000, visaQuota: 2, officeType: "Physical office",
    tenureYears: 1, processingDays: 10,
    features: ["100% ownership", "Consultancy & services", "Local service agent (if required)"],
  },
  {
    templateKey: "abudhabi-mainland", licenseType: "UAE_MAINLAND_DED", authority: "ADDED (Abu Dhabi)", emirate: "Abu Dhabi",
    name: "Abu Dhabi Mainland Commercial", activityCategory: "Commercial",
    description: "Abu Dhabi Department of Economic Development commercial licence.",
    baseCost: 14000, govFees: 11000, visaQuota: 3, officeType: "Physical office",
    tenureYears: 1, processingDays: 12,
    features: ["Capital-emirate presence", "Government tenders", "Office required"],
  },
  {
    templateKey: "sharjah-mainland", licenseType: "UAE_MAINLAND_DED", authority: "SEDD (Sharjah)", emirate: "Sharjah",
    name: "Sharjah Mainland Commercial", activityCategory: "Commercial",
    description: "Sharjah Economic Development Department commercial licence — lower overheads.",
    baseCost: 10000, govFees: 8500, visaQuota: 2, officeType: "Physical office",
    tenureYears: 1, processingDays: 10,
    features: ["Lower-cost mainland", "Trade across UAE", "Office required"],
  },

  // ── Offshore ───────────────────────────────────────────────────────────────
  {
    templateKey: "rak-icc", licenseType: "UAE_OFFSHORE_RAKICC", authority: "RAK ICC", emirate: "Ras Al Khaimah",
    name: "RAK ICC Offshore Company", activityCategory: "Holding",
    description: "International business company for holding, IP, and global trade — no UAE visa.",
    baseCost: 7500, govFees: 0, visaQuota: 0, officeType: "None", tenureYears: 1, processingDays: 5,
    features: ["100% foreign ownership", "Holding / IP / global trade", "No physical office", "No UAE residency visa"],
  },
  {
    templateKey: "jafza-offshore", licenseType: "UAE_OFFSHORE_JAFZA", authority: "JAFZA Offshore", emirate: "Dubai",
    name: "JAFZA Offshore Company", activityCategory: "Holding",
    description: "Dubai offshore vehicle — the only UAE offshore that can hold Dubai property.",
    baseCost: 15000, govFees: 0, visaQuota: 0, officeType: "None", tenureYears: 1, processingDays: 10,
    features: ["Can own Dubai property", "Holding structures", "No visa", "Strong asset protection"],
  },

  // ── Branch ─────────────────────────────────────────────────────────────────
  {
    templateKey: "branch-foreign", licenseType: "UAE_BRANCH_OFFICE", authority: "DET (Dubai)", emirate: "Dubai",
    name: "Branch of a Foreign Company", activityCategory: "Commercial",
    description: "Extension of an existing foreign parent company into the UAE.",
    baseCost: 20000, govFees: 15000, visaQuota: 3, officeType: "Physical office",
    tenureYears: 1, processingDays: 21,
    features: ["Same legal identity as parent", "No separate share capital", "National agent required"],
  },
];

/** Distinct emirates present in the UAE template (for filters). */
export const UAE_EMIRATES = [
  "Dubai", "Abu Dhabi", "Sharjah", "Ras Al Khaimah", "Ajman", "Umm Al Quwain", "Fujairah",
];

export const ACTIVITY_CATEGORIES = [
  "Commercial", "Professional", "Industrial", "Holding", "E-commerce", "Consultancy",
];
