/**
 * Per-license-type step templates for Business Setup applications.
 * Seeded when "Start application" is clicked on a lead.
 * All steps start as "pending".
 */

type Step = { step: string; status: "pending" };
type StepTemplate = Step[];

const p = (step: string): Step => ({ step, status: "pending" });

const TEMPLATES: Record<string, StepTemplate> = {
  UAE_MAINLAND_DED: [
    p("Select legal structure (LLC, sole establishment, or professional company)"),
    p("Reserve trade name with DED / Basher portal"),
    p("Obtain initial approval from DED"),
    p("Obtain NOC from relevant regulatory authority (healthcare, education, food, etc.) if required"),
    p("Draft and notarise Memorandum of Association (MOA) at UAE courts"),
    p("Secure business premises and register Ejari tenancy contract"),
    p("Submit trade license application and pay DED + municipality fees"),
    p("Obtain additional municipal or regulatory approvals if applicable"),
    p("Receive trade license from DED"),
    p("Open corporate bank account in UAE"),
    p("Register with MoHRE and obtain establishment card for visa quota"),
  ],

  UAE_FREEZONE: [
    p("Confirm freezone authority and company structure (FZE, FZCO, or branch)"),
    p("Reserve company name with the freezone authority"),
    p("Submit application and initial KYC documents (passport copies, business plan)"),
    p("Obtain initial approval from freezone"),
    p("Draft and sign Memorandum of Association and shareholder agreement"),
    p("Deposit paid-up share capital (if required by the freezone)"),
    p("Sign freezone lease agreement (flexi-desk, serviced office, or warehouse)"),
    p("Pay registration and license fees"),
    p("Receive freezone license and certificate of incorporation"),
    p("Register with freezone eChannel for visa quota allocation"),
    p("Open corporate bank account"),
    p("Process investor or employment visas if required"),
  ],

  UAE_OFFSHORE_RAKICC: [
    p("Confirm offshore structure and permitted business activities (offshore cannot trade in UAE)"),
    p("Appoint registered agent (mandatory for RAK ICC)"),
    p("Reserve company name with RAK ICC"),
    p("Submit KYC documents (passport, proof of address, source of funds declaration)"),
    p("Draft Memorandum and Articles of Association"),
    p("Pay RAK ICC incorporation fees"),
    p("Receive certificate of incorporation from RAK ICC"),
    p("Obtain company seal and share certificates"),
    p("Apostille incorporation documents if required for international use"),
    p("Open offshore corporate bank account (international bank)"),
  ],

  UAE_OFFSHORE_JAFZA: [
    p("Confirm offshore structure and activities (JAFZA offshore is the only UAE offshore that can own Dubai property)"),
    p("Appoint registered agent in Jebel Ali Free Zone"),
    p("Reserve company name with JAFZA"),
    p("Submit KYC documents (passport, proof of address, source of funds declaration)"),
    p("Draft Memorandum and Articles of Association"),
    p("Pay JAFZA offshore incorporation fees"),
    p("Receive certificate of incorporation from JAFZA"),
    p("Obtain company seal and share certificates"),
    p("Register property ownership transfer if using for UAE real estate holding"),
    p("Open corporate bank account"),
  ],

  UAE_BRANCH_OFFICE: [
    p("Obtain parent company documents: certificate of incorporation, MOA, board resolution, audited financials"),
    p("Notarise parent company documents at registered notary in home country"),
    p("UAE embassy or consulate attestation of parent company documents in home country"),
    p("MOFA counter-attestation of parent company documents in UAE"),
    p("Appoint UAE national service agent (mandatory for DED mainland branches of foreign companies)"),
    p("Apply for initial approval from DED or freezone authority"),
    p("Obtain NOC from relevant regulatory authority if the activity is regulated"),
    p("Pay branch registration fees"),
    p("Receive UAE branch license"),
    p("Register with MoHRE and obtain establishment card for visa quota"),
    p("Open corporate bank account"),
  ],

  KSA_MAINLAND_MISA: [
    p("Apply for Foreign Investment License (FIL) from MISA (Ministry of Investment)"),
    p("Select legal structure (LLC, joint stock company, branch, or representative office)"),
    p("Reserve company name with the Ministry of Commerce"),
    p("Draft Articles of Association in Arabic and notarise at a Saudi notary public"),
    p("Register company with the Ministry of Commerce and obtain Commercial Registration (CR)"),
    p("Register with ZATCA (Zakat, Tax and Customs Authority) for VAT and corporate tax"),
    p("Open SAR corporate bank account and deposit paid-up share capital"),
    p("Register with GOSI (General Organisation for Social Insurance)"),
    p("Register on Qiwa platform for Saudization (Nitaqat) compliance"),
    p("Obtain Baladiya (municipal) business license"),
    p("Register on Muqeem for employee residency tracking"),
    p("Enrol in Wage Protection System (WPS)"),
  ],

  KSA_SEZ_KAFD: [
    p("Submit application to KAFD (King Abdullah Financial District) with business plan and KYC documents"),
    p("Obtain KAFD licensing committee approval"),
    p("Sign KAFD office lease agreement"),
    p("Register company entity within KAFD Special Economic Zone"),
    p("Register with ZATCA under the SEZ tax framework"),
    p("Open SAR corporate bank account"),
    p("Register employees on Qiwa for work permits"),
    p("Register with GOSI"),
    p("Register on Muqeem for employee residency tracking"),
    p("Receive KAFD SEZ license and establishment card"),
  ],

  KSA_SEZ_NEOM: [
    p("Submit application to NEOM Authority with business plan and investment rationale"),
    p("Pass NEOM project review and licensing committee approval"),
    p("Sign NEOM SEZ license agreement and confirm space or land allocation"),
    p("Register company entity under the NEOM legal framework"),
    p("Register with ZATCA under NEOM SEZ tax treatment"),
    p("Open SAR corporate bank account"),
    p("Register employees on Qiwa for work permits"),
    p("Register with GOSI"),
    p("Register on Muqeem for employee residency tracking"),
    p("Receive NEOM SEZ establishment license"),
  ],

  KSA_SEZ_JAZAN: [
    p("Submit application to Jazan Economic City Authority (JCEC) with business plan and KYC"),
    p("Obtain JCEC approval and sign facility or land lease agreement"),
    p("Register company entity within Jazan Special Economic Zone"),
    p("Register with ZATCA under the SEZ tax framework"),
    p("Open SAR corporate bank account and deposit paid-up capital"),
    p("Register employees on Qiwa for work permits"),
    p("Register with GOSI"),
    p("Register on Muqeem for employee residency tracking"),
    p("Receive Jazan SEZ license"),
  ],

  KSA_BRANCH_OFFICE: [
    p("Apply for Foreign Investment License (FIL) from MISA (mandatory for foreign branches in KSA)"),
    p("Obtain parent company documents: certificate of incorporation, MOA, audited financials, board resolution appointing KSA branch manager"),
    p("Notarise parent company documents in home country"),
    p("Saudi embassy or consulate attestation of parent company documents in home country"),
    p("MOFA attestation of parent company documents in KSA"),
    p("Register branch with the Ministry of Commerce and obtain Commercial Registration (CR)"),
    p("Register with ZATCA for VAT and corporate tax"),
    p("Open SAR corporate bank account"),
    p("Register with GOSI"),
    p("Register on Qiwa for Nitaqat compliance"),
    p("Register on Muqeem for employee residency tracking"),
    p("Obtain Baladiya (municipal) license if required for the activity"),
  ],

  KSA_REPRESENTATIVE_OFFICE: [
    p("Obtain MISA approval for representative office (rep offices cannot conduct commercial activities)"),
    p("Notarise parent company documents in home country"),
    p("Saudi embassy or consulate attestation of parent company documents"),
    p("MOFA attestation of parent company documents in KSA"),
    p("Apply to Ministry of Commerce for representative office license"),
    p("Register with Chamber of Commerce"),
    p("Register with ZATCA (registration required even if VAT-exempt)"),
    p("Open SAR bank account for operating expenses"),
    p("Register employees on Qiwa (limited headcount applies to rep offices)"),
    p("Register with GOSI"),
    p("Register on Muqeem for employee residency tracking"),
    p("Receive representative office license"),
  ],
};

/** Generic fallback used when a license type has no specific template. */
export const DEFAULT_BS_STEPS: StepTemplate = [
  p("Name reservation"),
  p("Initial approval"),
  p("MOA / documents signing"),
  p("License issuance"),
  p("Establishment card"),
  p("Visa allocation"),
];

export function getBsStepTemplate(licenseType: string): StepTemplate {
  return TEMPLATES[licenseType] ?? DEFAULT_BS_STEPS;
}
