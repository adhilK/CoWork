# CoWork Pro — Implementation & Schema Reference (GCC Edition)

> Companion to root `CLAUDE.md`. This is the authoritative record of **every Prisma schema change** required to deliver the GCC Edition (UAE + Saudi Arabia), organised by module, plus the **conflicts with the current codebase** that must be resolved.
>
> Legend: 🟦 **NEW model/enum** · 🟨 **field additions to an existing model** · ⚠️ **conflict with code already shipped**.

---

## 0. Cross-cutting: Jurisdiction Layer

🟦 **New enum + model. Touches almost everything.**

```prisma
enum Jurisdiction {
  UAE
  KSA
}

model JurisdictionConfig {
  id                  String         @id @default(cuid())
  organizationId      String         @unique
  jurisdictions       Jurisdiction[]              // ['UAE'], ['KSA'], or both
  primaryJurisdiction Jurisdiction   @default(UAE)
  vatRateUAE          Decimal        @default(0.05) @db.Decimal(5, 4)  // 5%
  vatRateKSA          Decimal        @default(0.15) @db.Decimal(5, 4)  // 15%
  currencyUAE         String         @default("AED")
  currencyKSA         String         @default("SAR")
  zatcaEnabled        Boolean        @default(false)   // KSA only
  arabicInvoices      Boolean        @default(false)
  whatsappEnabled     Boolean        @default(false)
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  organization        Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

All jurisdiction-derived logic (VAT %, currency, license catalogs, gov bodies, payment provider) routes through `lib/jurisdiction.ts`. Never inline.

---

## Module 1 — Workspace Core (extend)

🟨 **Resource**
```prisma
cateringAvailable      Boolean   @default(false)
cateringOptions        Json?      // [{ name, price }]
avEquipment            String[]   // ["Projector", "Mic", "TV"]
externalBookingEnabled Boolean   @default(false)   // public booking page
externalHourlyRate     Decimal?  @db.Decimal(10, 2) // non-member rate
```

🟨 **Booking**
```prisma
cateringOrder      Json?       // selected catering items
avRequested        String[]
isExternalBooking  Boolean    @default(false)
externalPaymentId  String?     // Tap/Moyasar payment reference
```

> Note: `Resource` and `Booking` already exist with `requiresApproval`, `advanceBookingDays`, `min/maxBooking*`, `isRecurring`, `recurringGroupId`, `googleCalendarEventId`, soft-delete — keep all of them.

---

## Module 2 — Member Management (extend)

🟨 **Member** (encrypt the ⚠️-marked fields via `lib/encryption.ts` before write)
```prisma
nationality       String?
passportNumber    String?    // ⚠️ encrypted at rest
emiratesId        String?    // ⚠️ encrypted (UAE)
iqamaNumber       String?    // ⚠️ encrypted (KSA)
visaExpiryDate    DateTime?
emiratesIdExpiry  DateTime?
tradeExpiryDate   DateTime?
whatsappNumber    String?    // separate from phone — primary comms
preferredLanguage String     @default("en")  // en | ar
memberDirectory   Boolean    @default(true)  // opt-in to directory
skillTags         String[]
businessProfile   String?    // short bio for directory
linkedCompanyId   String?    // link to BusinessSetup company
```

---

## Module 3 — Membership Plans & Billing (extend heavily)

🟨 **Organization**
```prisma
primaryJurisdiction Jurisdiction    @default(UAE)
paymentProvider     PaymentProvider @default(TAP)
tapAccountId        String?
tapSecretKey        String?    // ⚠️ encrypted
moyasarApiKey       String?    // ⚠️ encrypted
bankTransferDetails Json?      // { bankName, iban, accountName, swiftCode }
vatNumber           String?    // UAE TRN or KSA VAT number
vatRegistered       Boolean    @default(false)
defaultCurrency     String     @default("AED")   // ⚠️ current default is "GBP"
franchiseParentId   String?                       // Module 11
allowCrossLocationBooking Boolean @default(true)  // Module 11
```

🟦 **New enums**
```prisma
enum PaymentProvider { TAP  MOYASAR  STRIPE  MANUAL }

enum PaymentMethod {
  TAP_CARD  MOYASAR_MADA  MOYASAR_CARD  BANK_TRANSFER  CASH  STRIPE
}

enum InvoiceType {
  TAX_INVOICE         // standard
  SIMPLIFIED_INVOICE  // KSA ZATCA simplified (< SAR 1000)
  CREDIT_NOTE
  DEBIT_NOTE
}

enum ZatcaStatus { PENDING  CLEARED  REPORTED  REJECTED }
```

🟨 **Invoice** — ⚠️ **most disruptive change in the spec.** Current `Invoice` has a single `amount`, `currency @default("GBP")`, `stripeInvoiceId`, `stripePaymentLinkId`. New shape splits the money and adds jurisdiction/VAT/ZATCA/gateway fields:
```prisma
jurisdiction     Jurisdiction  @default(UAE)
vatRate          Decimal       @default(0.05) @db.Decimal(5, 4)
vatAmount        Decimal       @default(0)    @db.Decimal(10, 2)
subtotal         Decimal       @db.Decimal(10, 2)
totalAmount      Decimal       @db.Decimal(10, 2)
currency         String        @default("AED")   // ⚠️ was "GBP"
invoiceType      InvoiceType   @default(TAX_INVOICE)
arabicEnabled    Boolean       @default(false)
arabicBuyerName  String?
arabicSellerName String?
// gateway references (Stripe demoted to platform billing only)
tapPaymentId     String?
moyasarPaymentId String?
bankTransferRef  String?
paidViaMethod    PaymentMethod?
// ZATCA (KSA only)
zatcaUUID        String?
zatcaHash        String?
zatcaQrCode      String?
zatcaStatus      ZatcaStatus?
// delivery
whatsappSentAt   DateTime?
```
**Migration note:** keep the legacy `amount` column during transition (backfill `subtotal`/`totalAmount` from it), then deprecate. Do **not** drop `stripeInvoiceId` immediately — repoint billing code first.

---

## Module 4 — Virtual Office Management 🟦 (NEW, Phase 2)

```prisma
model VirtualOfficeAddress {
  id             String       @id @default(cuid())
  organizationId String
  jurisdiction   Jurisdiction
  addressLine    String
  addressType    VirtualAddressType
  freezoneName   String?      // e.g. "RAKEZ", "DMCC"
  ejariNumber    String?      // UAE Ejari registration
  maxClients     Int          @default(10)
  isActive       Boolean      @default(true)
  monthlyFee     Decimal      @db.Decimal(10, 2)
  createdAt      DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  subscriptions  VirtualOfficeSubscription[]
  mailItems      MailItem[]

  @@index([organizationId])
}

enum VirtualAddressType { MAINLAND  FREEZONE  OFFSHORE  PREMIUM_BUSINESS_DISTRICT } // DIFC, ADGM

model VirtualOfficeSubscription {
  id             String              @id @default(cuid())
  organizationId String
  memberId       String
  addressId      String
  companyName    String
  licenseNumber  String?
  startDate      DateTime
  endDate        DateTime?
  renewalDate    DateTime
  status         VirtualOfficeStatus @default(ACTIVE)
  monthlyFee     Decimal             @db.Decimal(10, 2)
  notes          String?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  organization   Organization         @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  member         Member               @relation(fields: [memberId], references: [id])
  address        VirtualOfficeAddress @relation(fields: [addressId], references: [id])
  invoices       Invoice[]
  mailItems      MailItem[]

  @@index([organizationId])
  @@index([memberId])
  @@index([renewalDate])
}

enum VirtualOfficeStatus { ACTIVE  PENDING_RENEWAL  EXPIRED  CANCELLED }

model MailItem {
  id             String    @id @default(cuid())
  organizationId String
  addressId      String
  subscriptionId String
  senderName     String?
  senderAddress  String?
  receivedAt     DateTime  @default(now())
  mailType       MailType
  description    String?
  scanUrl        String?    // signed-URL storage object
  forwardedAt    DateTime?
  forwardedTo    String?
  notifiedAt     DateTime?  // WhatsApp/email sent
  collectedAt    DateTime?
  notes          String?

  organization   Organization              @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  address        VirtualOfficeAddress      @relation(fields: [addressId], references: [id])
  subscription   VirtualOfficeSubscription @relation(fields: [subscriptionId], references: [id])

  @@index([organizationId])
  @@index([subscriptionId])
}

enum MailType { LETTER  PACKAGE  LEGAL_DOCUMENT  GOVERNMENT_CORRESPONDENCE  COURIER  OTHER }
```
🟨 Add `virtualOfficeSubscriptionId String?` + relation to `Invoice`.

---

## Module 5 — Document Vault 🟦 (NEW, Phase 2)

```prisma
model Document {
  id                String       @id @default(cuid())
  organizationId    String
  memberId          String
  documentType      DocumentType
  label             String?      // when OTHER
  fileUrl           String       // private bucket — served via signed URL only
  fileName          String
  fileSize          Int
  mimeType          String
  expiryDate        DateTime?
  issueDate         DateTime?
  issueCountry      String?
  documentNumber    String?      // ⚠️ encrypted (passport no, Emirates ID, etc.)
  isVerified        Boolean      @default(false)
  verifiedAt        DateTime?
  verifiedBy        String?      // operator userId
  notes             String?
  version           Int          @default(1)
  previousVersionId String?      // version history
  uploadedAt        DateTime     @default(now())
  deletedAt         DateTime?    // soft delete

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  member            Member       @relation(fields: [memberId], references: [id])

  @@index([organizationId])
  @@index([memberId])
  @@index([organizationId, expiryDate])
}

enum DocumentType {
  PASSPORT  EMIRATES_ID  IQAMA  VISA  TRADE_LICENSE  EJARI  ESTABLISHMENT_CARD
  SHARE_CERTIFICATE  MOA  AOA  BANK_STATEMENT  INSURANCE_CERTIFICATE
  POWER_OF_ATTORNEY  TENANCY_CONTRACT  MEDICAL_FITNESS  POLICE_CLEARANCE
  DEGREE_CERTIFICATE  OTHER
}

model DocumentRequest {
  id             String                @id @default(cuid())
  organizationId String
  memberId       String
  requestedBy    String                // operator userId
  documentType   DocumentType
  message        String?
  dueDate        DateTime?
  status         DocumentRequestStatus @default(PENDING)
  fulfilledAt    DateTime?
  fulfilledDocId String?

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  member         Member       @relation(fields: [memberId], references: [id])

  @@index([organizationId])
  @@index([memberId])
}

enum DocumentRequestStatus { PENDING  FULFILLED  OVERDUE  CANCELLED }
```

---

## Module 6 — Business Setup CRM 🟦 (NEW, Phase 3)

```prisma
model BusinessSetupLead {
  id                String        @id @default(cuid())
  organizationId    String
  memberId          String?       // linked once converted
  assignedTo        String?       // operator userId
  jurisdiction      Jurisdiction
  clientName        String
  clientEmail       String?
  clientPhone       String
  clientWhatsapp    String?
  clientNationality String?
  companyName       String?
  licenseType       LicenseType
  freezoneName      String?       // UAE freezone
  sezName           String?       // KSA SEZ
  businessActivity  String[]
  stage             LeadStage     @default(NEW_ENQUIRY)
  priority          LeadPriority  @default(MEDIUM)
  estimatedFee      Decimal?      @db.Decimal(10, 2)
  quotedFee         Decimal?      @db.Decimal(10, 2)
  notes             String?
  source            String?       // WhatsApp, walk-in, referral, website
  expectedCloseDate DateTime?
  closedAt          DateTime?
  lostReason        String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  organization      Organization              @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  member            Member?                   @relation(fields: [memberId], references: [id])
  activities        LeadActivity[]
  proposal          BusinessSetupProposal?
  application        BusinessSetupApplication?

  @@index([organizationId])
  @@index([organizationId, stage])
  @@index([assignedTo])
}

enum LicenseType {
  UAE_MAINLAND_DED  UAE_FREEZONE  UAE_OFFSHORE_RAKICC  UAE_OFFSHORE_JAFZA  UAE_BRANCH_OFFICE
  KSA_MAINLAND_MISA  KSA_SEZ_KAFD  KSA_SEZ_JAZAN  KSA_SEZ_NEOM  KSA_BRANCH_OFFICE  KSA_REPRESENTATIVE_OFFICE
}

enum LeadStage {
  NEW_ENQUIRY  QUALIFIED  PROPOSAL_SENT  DOCUMENTS_COLLECTION
  SUBMITTED_TO_AUTHORITY  AWAITING_APPROVAL  APPROVED  COMPLETED  LOST
}

enum LeadPriority { LOW  MEDIUM  HIGH  URGENT }

model LeadActivity {
  id           String           @id @default(cuid())
  leadId       String
  userId       String
  activityType LeadActivityType
  note         String
  createdAt    DateTime         @default(now())

  lead         BusinessSetupLead @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@index([leadId])
}

enum LeadActivityType {
  NOTE  CALL  WHATSAPP  EMAIL  STAGE_CHANGE  DOCUMENT_RECEIVED  PAYMENT_RECEIVED  REMINDER_SENT
}

model BusinessSetupProposal {
  id             String         @id @default(cuid())
  leadId         String         @unique
  organizationId String
  lineItems      Json           // [{ service, description, fee }]
  totalFee       Decimal        @db.Decimal(10, 2)
  currency       String
  validUntil     DateTime
  status         ProposalStatus @default(DRAFT)
  sentAt         DateTime?
  acceptedAt     DateTime?
  pdfUrl         String?
  createdAt      DateTime       @default(now())

  lead           BusinessSetupLead @relation(fields: [leadId], references: [id], onDelete: Cascade)
}

enum ProposalStatus { DRAFT  SENT  ACCEPTED  REJECTED  EXPIRED }

model BusinessSetupApplication {
  id              String       @id @default(cuid())
  leadId          String       @unique
  organizationId  String
  jurisdiction    Jurisdiction
  licenseType     LicenseType
  referenceNumber String?
  submittedAt     DateTime?
  approvedAt      DateTime?
  licenseNumber   String?
  licenseExpiry   DateTime?
  authorityName   String?      // DED, RAKEZ, MISA...
  currentStep     String?
  steps           Json         // [{ step, status, completedAt, notes }]
  notes           String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  lead            BusinessSetupLead @relation(fields: [leadId], references: [id], onDelete: Cascade)
}

model RenewalTracking {
  id              String        @id @default(cuid())
  organizationId  String
  memberId        String
  documentType    RenewalDocType
  jurisdiction    Jurisdiction
  companyName     String?
  referenceNumber String?
  expiryDate      DateTime
  renewalFee      Decimal?      @db.Decimal(10, 2)
  status          RenewalStatus @default(ACTIVE)
  remindersSent   Int           @default(0)
  renewedAt       DateTime?
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  organization    Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  member          Member        @relation(fields: [memberId], references: [id])

  @@index([organizationId])
  @@index([organizationId, expiryDate])
}

enum RenewalDocType { TRADE_LICENSE  VISA  EMIRATES_ID  IQAMA  ESTABLISHMENT_CARD  EJARI  INSURANCE  OTHER }
enum RenewalStatus { ACTIVE  DUE_SOON  OVERDUE  RENEWED  CANCELLED }
```
🟨 `Document` gains an optional `businessSetupLeadId String?` relation (docs attached to leads).

---

## Module 7 — PRO Services Tracker 🟦 (NEW, Phase 3)

```prisma
model ProServiceRequest {
  id                 String          @id @default(cuid())
  organizationId     String
  memberId           String
  assignedTo         String?         // staff userId
  jurisdiction       Jurisdiction
  serviceType        ProServiceType
  serviceDescription String?
  urgency            ServiceUrgency  @default(STANDARD)
  stage              ProServiceStage @default(SUBMITTED)
  governingBody      String?         // DED, GDRFA, MISA, Qiwa...
  referenceNumber    String?
  requestedBy        String?         // member or operator
  fee                Decimal?        @db.Decimal(10, 2)
  invoiceId          String?
  slaDays            Int?
  dueDate            DateTime?
  completedAt        DateTime?
  cancelledAt        DateTime?
  cancelReason       String?
  clientNotes        String?         // client-visible
  internalNotes      String?         // operator only
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  organization       Organization         @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  member             Member               @relation(fields: [memberId], references: [id])
  activities         ProServiceActivity[]
  invoice            Invoice?             @relation(fields: [invoiceId], references: [id])

  @@index([organizationId])
  @@index([organizationId, stage])
  @@index([memberId])
  @@index([assignedTo])
}

enum ProServiceType {
  UAE_VISA_NEW  UAE_VISA_RENEWAL  UAE_VISA_CANCELLATION  UAE_EMIRATES_ID_NEW  UAE_EMIRATES_ID_RENEWAL
  UAE_ESTABLISHMENT_CARD  UAE_ECHANNEL_REGISTRATION  UAE_MEDICAL_FITNESS  UAE_GDRFA_SERVICE
  UAE_DED_TRANSACTION  UAE_ATTESTATION  UAE_TYPING_SERVICE  UAE_EJARI_REGISTRATION  UAE_TRADE_LICENSE_RENEWAL
  KSA_IQAMA_NEW  KSA_IQAMA_RENEWAL  KSA_QIWA_REGISTRATION  KSA_MUQEEM_REGISTRATION  KSA_GOSI_REGISTRATION
  KSA_LABOUR_CONTRACT  KSA_EXIT_REENTRY_VISA  KSA_DEPENDENT_VISA  KSA_ATTESTATION  KSA_MINISTRY_HR_TRANSACTION
  KSA_TRADE_LICENSE_RENEWAL
  DOCUMENT_ATTESTATION  NOTARISATION  OTHER
}

enum ProServiceStage {
  SUBMITTED  DOCUMENTS_PENDING  DOCUMENTS_RECEIVED  IN_PROGRESS  AT_TYPING_CENTRE
  AT_GOVERNMENT  AWAITING_COLLECTION  COMPLETED  ON_HOLD  CANCELLED
}

enum ServiceUrgency { STANDARD  EXPRESS  URGENT }

model ProServiceActivity {
  id              String           @id @default(cuid())
  requestId       String
  userId          String
  stage           ProServiceStage?
  note            String
  isClientVisible Boolean          @default(true)
  createdAt       DateTime         @default(now())

  request         ProServiceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)

  @@index([requestId])
}
```
🟨 `Document` gains optional `proServiceRequestId String?` relation.

---

## Module 8 — WhatsApp Business API 🟦 (NEW, Phase 2)

```prisma
model WhatsAppMessage {
  id                String              @id @default(cuid())
  organizationId    String
  memberId          String?
  phone             String
  direction         MessageDirection
  messageType       WhatsAppMessageType
  templateName      String?
  content           String
  mediaUrl          String?
  waMessageId       String?             // Meta message ID
  status            WhatsAppStatus      @default(SENT)
  sentAt            DateTime            @default(now())
  deliveredAt       DateTime?
  readAt            DateTime?
  failedReason      String?
  relatedEntityType String?             // "booking" | "invoice" | "proservice"...
  relatedEntityId   String?

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  member            Member?      @relation(fields: [memberId], references: [id])

  @@index([organizationId])
  @@index([memberId])
  @@index([organizationId, status])
}

enum MessageDirection { OUTBOUND  INBOUND }

enum WhatsAppMessageType {
  BOOKING_CONFIRMATION  BOOKING_REMINDER  INVOICE_ISSUED  INVOICE_PAID  VISITOR_ARRIVAL
  DOCUMENT_EXPIRY  BUSINESS_SETUP_UPDATE  PRO_SERVICE_UPDATE  MAIL_RECEIVED
  RENEWAL_REMINDER  ANNOUNCEMENT  SUPPORT_MESSAGE  CUSTOM
}

enum WhatsAppStatus { QUEUED  SENT  DELIVERED  READ  FAILED }

model WhatsAppConfig {
  id                String   @id @default(cuid())
  organizationId    String   @unique
  phoneNumberId     String
  accessToken       String   // ⚠️ encrypted
  businessAccountId String
  verifyToken       String   // webhook verification
  isActive          Boolean  @default(false)
  createdAt         DateTime @default(now())

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

---

## Module 9 — Visitor & Reception (extend)

🟨 **Visitor**
```prisma
nationality      String?
idType           String?   // "Passport" | "Emirates ID" | "Iqama"
idNumber         String?   // ⚠️ encrypted
vehiclePlate     String?
whatsappNotified Boolean   @default(false)
photoUrl         String?
isBlacklisted    Boolean   @default(false)
```

🟦 **Delivery**
```prisma
model Delivery {
  id             String    @id @default(cuid())
  organizationId String
  memberId       String?
  courierName    String?
  trackingNumber String?
  receivedAt     DateTime  @default(now())
  collectedAt    DateTime?
  notifiedAt     DateTime?
  description    String?
  photoUrl       String?
  receivedBy     String?   // staff name

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  member         Member?      @relation(fields: [memberId], references: [id])

  @@index([organizationId])
}
```

---

## Module 10 — ZATCA E-Invoicing (KSA) 🟦 (NEW, Phase 3; stub schema Phase 2)

Most ZATCA fields live on `Invoice` (Module 3). The device/certificate record:
```prisma
model ZatcaDevice {
  id             String   @id @default(cuid())
  organizationId String
  commonName     String   // CN for certificate
  csid           String?  // Cryptographic Stamp Identifier from ZATCA
  certificatePem String?  // ⚠️ encrypted
  privateKeyPem  String?  // ⚠️ encrypted
  environment    ZatcaEnv @default(SANDBOX)
  isActive       Boolean  @default(false)
  registeredAt   DateTime?
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
}

enum ZatcaEnv { SANDBOX  SIMULATION  PRODUCTION }
```
**Do not build the ZATCA crypto/UBL pipeline from scratch — integrate a certified middleware (Wafeq).** Build schema + status tracking now; wire the API in Phase 3 (Phase 1 PDF+QR) and Phase 4 (Phase 2 real-time clearance).

---

## Module 11 — Multi-Location & Franchise (extend)

🟨 **Location**
```prisma
jurisdiction       Jurisdiction @default(UAE)
city               String?
country            String?
vatNumber          String?   // KSA requires per-branch VAT registration
managerUserId      String?
openingHours       Json?     // { mon: { open, close }, ... }
accessInstructions String?
wifiName           String?
wifiPassword       String?   // ⚠️ encrypted
parentLocationId   String?   // franchise sub-locations
```
🟨 **Organization** — `franchiseParentId`, `allowCrossLocationBooking` (listed in Module 3).

---

## Module 12 — Community & Referral (extend; mostly Phase 3/4)

Reuses existing `Announcement` + `Event`. Additions are mostly relational (referral board, RSVP, event ticketing, referral-fee tracking) — model these in Phase 3/4; not blocking earlier phases. Member directory/skill tags already covered in Module 2.

---

## Module 13 — Finance & Analytics

No new core models — read-model/aggregation layer over Invoice/Booking/Member/Subscription, sliced by jurisdiction/location/service-type. VAT-report export and Xero/QuickBooks CSV export are output formatters, not schema.

---

## Module 14 — Platform Billing (operator subscriptions)

Stays on `Organization.stripeCustomerId` / `stripeSubscriptionId` (already present). **Stripe is for operator subscriptions only** — repriced per `CLAUDE.md`. Member-facing billing moves to Tap/Moyasar.

---

## ⚠️ Conflicts with the Existing Codebase

The shipped code was built to the **original Western spec**. These must be reconciled before/while implementing the GCC spec:

| # | Conflict | Where | Resolution |
|---|---|---|---|
| 1 | **Currency default is `GBP`** | `prisma/schema.prisma` (`Organization.currency`, `Invoice.currency`), `app/api/invoices/route.ts` (`currency ?? "GBP"`) | Change default to `AED`; drive currency from `JurisdictionConfig`. Backfill existing rows. |
| 2 | **No `Jurisdiction` concept anywhere** | entire schema | Add `Jurisdiction` enum + `JurisdictionConfig`; thread `jurisdiction` onto Invoice/Location/leads/requests. Add jurisdiction selector to onboarding. |
| 3 | **Invoice is single-`amount`, Stripe-centric** | `Invoice` model, `app/api/invoices/route.ts`, `app/api/invoices/from-bookings/route.ts`, `components/invoices/*` | Introduce `subtotal`/`vatAmount`/`totalAmount`/`vatRate`/`invoiceType`; keep `amount` temporarily, backfill, then deprecate. Update invoice create/generate logic to compute VAT by jurisdiction. |
| 4 | **Payments = Stripe only** | `lib/stripe.ts`, `@stripe/stripe-js`, `stripe` deps; no Tap/Moyasar | Add `lib/tap.ts` + `lib/moyasar.ts` + webhook routes `api/webhooks/{tap,moyasar}`. Demote Stripe to platform billing. Add `paymentProvider` to Organization. |
| 5 | **Email-first, no WhatsApp** | `lib/email.ts`, `lib/resend.ts` used across flows | Add `lib/whatsapp.ts`, `WhatsAppConfig/WhatsAppMessage`, webhook + Inngest queue. Make WhatsApp primary, email fallback. |
| 6 | **`UserRole` has only OWNER/ADMIN/MEMBER** | `prisma/schema.prisma`, `lib/auth.ts` (`requireAdminApi`), middleware role guard | Add `MANAGER`, `RECEPTIONIST`, `PRO_AGENT`. Audit `requireAdminApi` and the member/admin guard to handle new roles (esp. location-scoped MANAGER, PRO_AGENT). |
| 7 | **Deploy region is `syd1` (Sydney)** | `vercel.json` | Wrong for GCC latency + KSA data residency. Move to an EU/ME region (e.g. `fra1`/`dxb` equiv) before launch; revisit per-region DB for KSA in Phase 3. |
| 8 | **No encryption layer** | no `lib/encryption.ts` | Required before storing passport/Emirates ID/Iqama/keys. Build AES-256 helper + `ENCRYPTION_KEY`/`ENCRYPTION_IV` env, plus key-rotation plan. |
| 9 | **Jobs run via single Vercel cron** | `vercel.json` cron + `app/api/cron/monthly-billing` | Fine for monthly billing, but Document/renewal/VA reminders, WhatsApp sends, and ZATCA retries need a real queue — adopt Inngest/Trigger.dev and a `jobs/` dir. |
| 10 | **Pricing mismatch** | original CLAUDE.md ($49/$99/$179, USD) | Reprice to $79/$149/$299 + add-ons; update any pricing UI/seed. |
| 11 | **Document storage not hardened** | Supabase Storage usage (avatars/floorplans) | Document vault needs **private buckets + 15-min signed URLs**; verify current buckets aren't public before reusing. |
| 12 | **Already-built features sit in later phases of the new plan** | Google Calendar sync, public booking page, recurring bookings already shipped | No rework needed — keep them. The roadmap lists them in Phase 4 for completeness; treat as **done**, don't rebuild. |

**Migration strategy:** all of the above are additive-then-migrate. Add new enum values/columns as nullable or defaulted, backfill, repoint application code, then deprecate legacy columns (`amount`, primary `stripeInvoiceId`). Never drop a column in the same migration that introduces its replacement.

---

*Implementation reference v1.0 — June 2026. Keep in sync with `prisma/schema.prisma` as modules land.*
