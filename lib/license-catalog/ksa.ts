/**
 * Built-in KSA (Saudi Arabia) license catalog template — the counterpart to the
 * UAE seed. Covers MISA mainland licenses, the Special Economic Zones, the RHQ
 * programme, branch and representative offices.
 *
 * Prices are indicative SAR (VAT-exclusive) starting points; real MISA/SEZ
 * packages vary by activity and capital. `templateKey` is stable (ksa- prefix)
 * so re-importing is idempotent and never collides with the UAE template.
 *
 * Reuses LicenseTypeValue + LICENSE_TYPE_LABELS from the UAE module.
 */

import type { LicenseCatalogSeed } from "@/lib/license-catalog/uae";

// KSA regions/cities used in place of "emirate" for the location field.
export const KSA_REGIONS = [
  "Riyadh", "Jeddah", "Makkah", "Madinah", "Dammam", "Eastern Province", "NEOM", "Jazan", "Ras Al Khair",
];

export const KSA_LICENSE_CATALOG: LicenseCatalogSeed[] = [
  // ── MISA mainland licenses ───────────────────────────────────────────────────
  {
    templateKey: "ksa-misa-services", licenseType: "KSA_MAINLAND_MISA", authority: "MISA", emirate: "Riyadh",
    name: "MISA Services License", activityCategory: "Professional",
    description: "Foreign-investment services/consulting licence from the Ministry of Investment (MISA).",
    baseCost: 12000, govFees: 8000, visaQuota: 2, officeType: "Physical office", minShareCapital: 0,
    tenureYears: 1, processingDays: 20,
    features: ["100% foreign ownership", "Consulting & services", "Sponsor your own visas", "National Address required"],
    isPopular: true,
  },
  {
    templateKey: "ksa-misa-trading", licenseType: "KSA_MAINLAND_MISA", authority: "MISA", emirate: "Riyadh",
    name: "MISA Trading License", activityCategory: "Commercial",
    description: "Wholesale/retail trading licence — typically requires SAR 30M capital for 100% foreign ownership.",
    baseCost: 12000, govFees: 10000, visaQuota: 3, officeType: "Physical office", minShareCapital: 30000000,
    tenureYears: 1, processingDays: 25,
    features: ["Import & distribution", "100% ownership (capital conditions)", "Warehouse options"],
  },
  {
    templateKey: "ksa-misa-industrial", licenseType: "KSA_MAINLAND_MISA", authority: "MISA", emirate: "Dammam",
    name: "MISA Industrial License", activityCategory: "Industrial",
    description: "Manufacturing licence with MODON industrial-land eligibility.",
    baseCost: 14000, govFees: 12000, visaQuota: 5, officeType: "Physical office",
    tenureYears: 1, processingDays: 30,
    features: ["MODON land access", "Industrial activities", "High visa quota", "Customs exemptions"],
  },
  {
    templateKey: "ksa-misa-entrepreneur", licenseType: "KSA_MAINLAND_MISA", authority: "MISA", emirate: "Riyadh",
    name: "MISA Entrepreneur (Riyadi) License", activityCategory: "Professional",
    description: "Startup-friendly licence for founders backed by an approved Saudi incubator.",
    baseCost: 8000, govFees: 2000, visaQuota: 1, officeType: "Flexi-desk",
    tenureYears: 1, processingDays: 15,
    features: ["Lower capital", "Incubator endorsement", "Founder visa"],
  },
  {
    templateKey: "ksa-rhq", licenseType: "KSA_MAINLAND_MISA", authority: "MISA — RHQ Programme", emirate: "Riyadh",
    name: "Regional Headquarters (RHQ) License", activityCategory: "Professional",
    description: "Regional HQ licence — required to bid for Saudi government contracts; 30-year tax incentives.",
    baseCost: 18000, govFees: 6000, visaQuota: 10, officeType: "Physical office",
    tenureYears: 1, processingDays: 30,
    features: ["Eligible for government tenders", "0% corporate & withholding tax (RHQ activities)", "Premium Residency support"],
    isPopular: true,
  },

  // ── Special Economic Zones ───────────────────────────────────────────────────
  {
    templateKey: "ksa-sez-kafd", licenseType: "KSA_SEZ_KAFD", authority: "KAFD SEZ", emirate: "Riyadh",
    name: "KAFD Special Economic Zone License", activityCategory: "Professional",
    description: "King Abdullah Financial District SEZ — fintech and financial-services hub in Riyadh.",
    baseCost: 16000, govFees: 5000, visaQuota: 4, officeType: "Physical office",
    tenureYears: 1, processingDays: 25,
    features: ["Fintech & financial services", "Tax incentives", "Riyadh financial district"],
  },
  {
    templateKey: "ksa-sez-neom", licenseType: "KSA_SEZ_NEOM", authority: "NEOM (Oxagon)", emirate: "NEOM",
    name: "NEOM / Oxagon SEZ License", activityCategory: "Industrial",
    description: "Advanced-manufacturing and technology licence within the NEOM Oxagon SEZ.",
    baseCost: 20000, govFees: 6000, visaQuota: 6, officeType: "Physical office",
    tenureYears: 1, processingDays: 30,
    features: ["Advanced manufacturing & tech", "Renewable-powered", "Competitive incentives"],
  },
  {
    templateKey: "ksa-sez-jazan", licenseType: "KSA_SEZ_JAZAN", authority: "Jazan SEZ", emirate: "Jazan",
    name: "Jazan Special Economic Zone License", activityCategory: "Industrial",
    description: "Heavy-industry, food-processing, and logistics SEZ on the Red Sea.",
    baseCost: 15000, govFees: 5000, visaQuota: 5, officeType: "Physical office",
    tenureYears: 1, processingDays: 30,
    features: ["Heavy industry & logistics", "Red Sea port access", "Customs benefits"],
  },
  {
    templateKey: "ksa-sez-silz", licenseType: "KSA_SEZ_KAFD", authority: "SILZ (Logistics SEZ)", emirate: "Riyadh",
    name: "Special Integrated Logistics Zone License", activityCategory: "Commercial",
    description: "Logistics/re-export SEZ at Riyadh's King Khalid Airport with bonded-zone benefits.",
    baseCost: 14000, govFees: 4000, visaQuota: 4, officeType: "Physical office",
    tenureYears: 1, processingDays: 25,
    features: ["Bonded logistics", "Re-export & light assembly", "Duty suspension"],
  },

  // ── Branch / Representative office ────────────────────────────────────────────
  {
    templateKey: "ksa-branch", licenseType: "KSA_BRANCH_OFFICE", authority: "MISA", emirate: "Riyadh",
    name: "Branch of a Foreign Company (KSA)", activityCategory: "Commercial",
    description: "Branch of an existing foreign parent, registered through MISA.",
    baseCost: 15000, govFees: 10000, visaQuota: 3, officeType: "Physical office",
    tenureYears: 1, processingDays: 30,
    features: ["Same legal identity as parent", "Full commercial activity", "MISA registration"],
  },
  {
    templateKey: "ksa-rep-office", licenseType: "KSA_REPRESENTATIVE_OFFICE", authority: "MISA", emirate: "Riyadh",
    name: "Representative / Scientific & Technical Office", activityCategory: "Professional",
    description: "Non-trading office for market study, liaison, and technical support only.",
    baseCost: 10000, govFees: 6000, visaQuota: 2, officeType: "Physical office",
    tenureYears: 1, processingDays: 25,
    features: ["No commercial activity", "Market research & liaison", "Technical support to local agents"],
  },
];
