# CoWork Pro — Execution Roadmap (GCC Edition)

> 4-phase plan to deliver the UAE + KSA platform. Schema detail per module is in [`implementation.md`](./implementation.md). Phase durations are indicative (solo/small team).
>
> ✅ = already shipped in current codebase · 🟦 = new build · 🔁 = rework of existing code (see conflicts in implementation.md).

---

## Phase 1 — UAE MVP (Months 1–2)

**Goal:** A UAE operator can run their workspace end-to-end with VAT-compliant AED invoicing and local card payments.

| # | Item | Type | Notes |
|---|---|---|---|
| 1 | Auth: login / register / org creation | ✅ | Already built (Supabase Auth). |
| 2 | **Jurisdiction selector on org creation + `JurisdictionConfig`** | 🟦 | Default UAE. Drives VAT/currency/payment provider. |
| 3 | Resource management (desks/rooms/offices) | ✅ | Add catering/AV add-on fields (🟦 small). |
| 4 | Booking system + conflict detection | ✅ | Keep. |
| 5 | Member management + **WhatsApp number field** | ✅/🟦 | Add GCC member fields (Module 2). |
| 6 | Membership plans | ✅ | Keep. |
| 7 | **Invoicing — UAE VAT (5%), AED, PDF** | 🔁 | Rework Invoice to subtotal/vat/total; default AED not GBP. PDF via `@react-pdf/renderer`. |
| 8 | **Tap Payments integration** | 🟦 | Replaces Stripe for member billing. `lib/tap.ts` + `api/webhooks/tap`. |
| 9 | Admin dashboard | ✅ | Keep. |
| 10 | Member portal (book, invoices, profile) | ✅ | Keep. |
| 11 | **Platform billing via Stripe Atlas** | 🔁 | Stripe demoted to operator subscriptions; reprice to GCC tiers. |
| — | **Move deploy region off `syd1`** | 🔁 | EU/ME region for latency. |

**Exit criteria:** UAE operator onboards, lists resources, takes bookings, issues a 5% VAT AED invoice as PDF, and collects payment via Tap.

---

## Phase 2 — GCC Core (Months 3–4)

**Goal:** WhatsApp-native operations, the high-margin virtual-office + document modules, multi-location, and KSA jurisdiction switched on.

| # | Item | Type | Notes |
|---|---|---|---|
| 1 | **WhatsApp Business API** — all transactional sends | 🟦 | `lib/whatsapp.ts`, `WhatsAppConfig/Message`, webhook, Inngest queue. |
| 2 | **Virtual Office Management** (Module 4) | 🟦 | Addresses, subscriptions, mail/courier log, digital mailroom, renewal reminders. |
| 3 | **Document Vault** (Module 5) | 🟦 | Encrypted docs, expiry tracking, version history, document requests. Needs `lib/encryption.ts` + private buckets/signed URLs. |
| 4 | Visitor management — QR check-in, WhatsApp host alert, delivery log | ✅/🟦 | Extend existing Visitor; add `Delivery`. |
| 5 | **Multi-location support** (Module 11) | 🟦 | Cross-location booking, per-location fields. (`Location` model already exists.) |
| 6 | Email notifications (Resend) — **secondary** to WhatsApp | ✅ | Keep as fallback. |
| 7 | **Automated billing/reminder jobs (Inngest)** | 🔁 | Migrate off single Vercel cron; add reminder + WhatsApp-queue jobs. |
| 8 | QR code check-in for bookings | ✅ | Already built. |
| 9 | Basic analytics dashboard | ✅ | Keep; extend in Phase 4. |
| 10 | **KSA jurisdiction** — SAR, 15% VAT, Arabic invoices, **ZATCA schema stub** | 🟦 | Flip config; add Arabic invoice template + `ZatcaDevice` stub. |

**Exit criteria:** Operator sends booking/invoice/mail WhatsApp messages; manages virtual-office clients + mail; stores expiring documents with reminders; runs a second location; KSA org can issue a SAR 15% Arabic invoice (pre-ZATCA-clearance).

---

## Phase 3 — Business Services Layer (Months 5–7)

**Goal:** The differentiators no competitor has — company formation CRM, PRO services, renewals, and KSA e-invoicing compliance.

| # | Item | Type | Notes |
|---|---|---|---|
| 1 | **Business Setup CRM — UAE** (Mainland, Freezone, Offshore) | 🟦 | Lead pipeline, license catalog, activities. |
| 2 | **Business Setup CRM — KSA** (MISA, SEZ) | 🟦 | Add KSA license types + stages. |
| 3 | **PRO Services Tracker — UAE** workflows | 🟦 | Visa, Emirates ID, GDRFA, attestation, typing. SLA + client-visible status. |
| 4 | **PRO Services Tracker — KSA** workflows | 🟦 | Iqama, Qiwa, Muqeem, GOSI, MoHR. |
| 5 | **Renewal Tracking dashboard** | 🟦 | Trade license / visa / Emirates ID / Iqama expiry alerts. |
| 6 | **ZATCA Phase 1 compliance** (KSA PDF + TLV QR) | 🟦 | Via Wafeq middleware. Simplified vs standard invoice. |
| 7 | Partner network (PRO agents, lawyers, auditors) | 🟦 | Referral tracking. |
| 8 | Business setup proposal builder + PDF | 🟦 | `BusinessSetupProposal`. |

**Exit criteria:** Operator captures a formation lead → quote → application tracking → completion, all visible to the client; PRO requests tracked with WhatsApp status updates; KSA invoices carry a compliant QR.

---

## Phase 4 — Scale & Retention (Months 8–12)

**Goal:** Stickiness, depth, and the long-tail integrations.

| # | Item | Type | Notes |
|---|---|---|---|
| 1 | Community: directory, referral board, events + ticketing | 🟦/✅ | Announcements/Events exist; add directory/referral/RSVP/ticketing. |
| 2 | Advanced analytics + location P&L | 🟦 | Service-revenue breakdown, AR aging, occupancy heatmaps. |
| 3 | **ZATCA Phase 2** (real-time clearance API) | 🟦 | Highest compliance complexity. |
| 4 | Franchise / master-operator mode | 🟦 | `franchiseParentId`, parent visibility. |
| 5 | White-label member portal | 🟦 | Add-on tier. |
| 6 | Public booking page (external non-members) | ✅ | **Already built** — keep. |
| 7 | Google Calendar / Outlook sync | ✅ | Calendar sync **already built**; add Outlook. |
| 8 | Recurring bookings | ✅ | **Already built** — keep. |
| 9 | E-signatures for lease agreements | 🟦 | |
| 10 | Mobile app (PWA first, then React Native) | 🟦 | |
| 11 | Access control integrations (Kisi, Salto) | 🟦 | |
| 12 | Xero / QuickBooks bank-reconciliation export | 🟦 | |

> **Note:** items 6–8 are already shipped (they were built ahead of this re-sequenced plan). They appear here only for completeness — do not rebuild.

---

## Cross-phase prerequisites (do early, not per-feature)

1. **`lib/jurisdiction.ts`** — single source for VAT %, currency, catalogs, gov bodies. (Phase 1)
2. **`lib/encryption.ts`** — AES-256 before any sensitive PII is stored. (Phase 2, before Document Vault)
3. **Inngest/Trigger.dev + `jobs/`** — before the reminder/WhatsApp/ZATCA queues pile up. (Phase 2)
4. **Region/data-residency decision** — region move in Phase 1; KSA-region DB evaluation before Phase 3.
5. **Signed-URL document access pattern** — establish with Document Vault, reuse for mail scans, proposals, ZATCA PDFs.

---

*Roadmap v1.0 — June 2026 · CoWork Pro GCC Edition.*
