// @react-pdf/renderer — Node.js only. Do NOT import from client components.
// Uses its own JSX primitives (Document/Page/View/Text), not React DOM.
// No Tailwind, no shadcn — styles via StyleSheet.create().
// Arabic text support deferred: needs a registered Arabic font (separate task).

import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoicePdfOrg = {
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  taxRegistrationNumber: string | null;
  jurisdiction: string;
  currency: string;
};

export type InvoicePdfMember = {
  name: string | null;
  email: string;
  company: string | null;
};

export type InvoicePdfData = {
  invoiceNumber: string | null;
  issueDate: Date;
  dueDate: Date;
  paidAt: Date | null;
  status: string;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  notes: string | null;
  // ZATCA (KSA) — present only for KSA e-invoices
  zatcaQrDataUrl?: string | null; // PNG data URL of the Phase-1 QR
  zatcaUuid?: string | null;
  zatcaStatus?: string | null;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const GREEN  = "#15803D";
const DARK   = "#0F172A";
const GRAY   = "#6B7280";
const LGRAY  = "#F3F4F6";
const BORDER = "#E5E7EB";
const WHITE  = "#FFFFFF";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PAID:      { bg: "#DCFCE7", text: "#15803D" },
  PENDING:   { bg: "#FEF3C7", text: "#92400E" },
  OVERDUE:   { bg: "#FEE2E2", text: "#B91C1C" },
  DRAFT:     { bg: "#F3F4F6", text: "#4B5563" },
  CANCELLED: { bg: "#F3F4F6", text: "#6B7280" },
  REFUNDED:  { bg: "#EDE9FE", text: "#6D28D9" },
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 48,
    backgroundColor: WHITE,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  brandBlock: { flexDirection: "column" },
  brandName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: GREEN, letterSpacing: 0.5 },
  brandTagline: { fontSize: 8, color: GRAY, marginTop: 2 },
  invoiceLabel: { fontSize: 20, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "right" },
  invoiceNumber: { fontSize: 10, color: GRAY, textAlign: "right", marginTop: 3 },

  // ── From / To ──────────────────────────────────────────────────────────────
  addressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },
  addressBlock: { width: "45%" },
  addressLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GREEN, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  addressName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 2 },
  addressLine: { fontSize: 8.5, color: GRAY, marginBottom: 1.5, lineHeight: 1.5 },

  // ── Meta row (dates + status) ───────────────────────────────────────────────
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: LGRAY,
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  metaBlock: { flexDirection: "column" },
  metaLabel: { fontSize: 7, color: GRAY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  metaValue: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: DARK },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 8, fontFamily: "Helvetica-Bold" },

  // ── Table ──────────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    backgroundColor: DARK,
    borderRadius: 3,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  tableHeaderText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: WHITE, textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },
  tableRowAlt: { backgroundColor: LGRAY },
  tableCell: { fontSize: 9, color: DARK },
  colDesc: { flex: 4 },
  colQty:  { flex: 1, textAlign: "center" },
  colUnit: { flex: 2, textAlign: "right" },
  colTotal:{ flex: 2, textAlign: "right" },

  // ── Totals ─────────────────────────────────────────────────────────────────
  totalsContainer: { alignItems: "flex-end", marginTop: 12, marginBottom: 20 },
  totalsBox: { width: 210 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { fontSize: 9, color: GRAY },
  totalsValue: { fontSize: 9, color: DARK, textAlign: "right" },
  totalsDivider: { borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: "solid", marginVertical: 4 },
  totalsGrandLabel: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: DARK },
  totalsGrandValue: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: GREEN, textAlign: "right" },

  // ── Notes ──────────────────────────────────────────────────────────────────
  notesBox: {
    backgroundColor: LGRAY,
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  notesLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  notesText: { fontSize: 8.5, color: DARK, lineHeight: 1.5 },

  // ── ZATCA (KSA) ──────────────────────────────────────────────────────────────
  zatcaBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LGRAY,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  zatcaQr: { width: 84, height: 84, marginRight: 14 },
  zatcaInfo: { flexDirection: "column", flex: 1 },
  zatcaTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 3 },
  zatcaLine: { fontSize: 7.5, color: GRAY, marginBottom: 1.5 },
  zatcaMono: { fontSize: 7, color: GRAY, fontFamily: "Helvetica" },
  zatcaClearedBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  zatcaClearedText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GREEN },
  zatcaPendingBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: "dashed",
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  zatcaPendingText: { fontSize: 7.5, color: GRAY, fontFamily: "Helvetica" },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: "solid",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: GRAY },
  footerBold: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY },

  // ── Arabic (bilingual KSA tax invoice) ──────────────────────────────────────
  arTitle:  { fontFamily: "Amiri", fontSize: 14, color: DARK, textAlign: "right", marginTop: 2 },
  arLabel:  { fontFamily: "Amiri", fontSize: 8, color: GREEN, textAlign: "right", marginTop: 1 },
  arText:   { fontFamily: "Amiri", fontSize: 9, color: DARK, textAlign: "right", marginTop: 1 },
  arMeta:   { fontFamily: "Amiri", fontSize: 8, color: GRAY, textAlign: "right", marginTop: 1 },
  arHeader: { fontFamily: "Amiri", fontSize: 7.5, color: WHITE, marginTop: 1 },
  arTotals: { fontFamily: "Amiri", fontSize: 8.5, color: GRAY, textAlign: "right" },
  arFooter: { fontFamily: "Amiri", fontSize: 7.5, color: GRAY, textAlign: "right", marginTop: 1 },
});

// ── Arabic labels (mandatory bilingual content on KSA tax invoices) ─────────────
const AR = {
  taxInvoice: "فاتورة ضريبية",
  invoice: "فاتورة",
  from: "من",
  billTo: "فاتورة إلى",
  issueDate: "تاريخ الإصدار",
  dueDate: "تاريخ الاستحقاق",
  paidOn: "تاريخ السداد",
  status: "الحالة",
  description: "الوصف",
  qty: "الكمية",
  unitPrice: "سعر الوحدة",
  total: "المجموع",
  subtotal: "المجموع الفرعي",
  vat: "ضريبة القيمة المضافة",
  grandTotal: "الإجمالي المستحق",
  vatReg: "الرقم الضريبي",
  notes: "ملاحظات",
  computerGenerated: "هذه فاتورة ضريبية مُنشأة إلكترونياً",
};

// Register the Arabic font (Amiri) once per process. Called from the PDF route
// only for KSA bilingual invoices, so UAE invoices never fetch it.
let arabicFontRegistered = false;
export function registerInvoiceFonts(baseUrl: string) {
  if (arabicFontRegistered) return;
  Font.register({
    family: "Amiri",
    fonts: [
      { src: `${baseUrl}/fonts/Amiri-Regular.ttf` },
      { src: `${baseUrl}/fonts/Amiri-Bold.ttf`, fontWeight: "bold" },
    ],
  });
  arabicFontRegistered = true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function fmtDate(d: Date): string {
  return format(d, "d MMM yyyy");
}

function vatLabel(rate: number): string {
  const pct = rate * 100;
  return `VAT (${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2)}%)`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoicePdf({
  invoice,
  org,
  member,
  arabic = false,
}: {
  invoice: InvoicePdfData;
  org: InvoicePdfOrg;
  member: InvoicePdfMember;
  arabic?: boolean;
}) {
  const invoiceLabel = invoice.invoiceNumber ?? `INV-${new Date(invoice.issueDate).getTime()}`;
  const statusColors = STATUS_COLORS[invoice.status] ?? { bg: "#F3F4F6", text: "#4B5563" };
  const isTaxInvoice = invoice.vatRate > 0;

  return (
    <Document
      title={`Invoice ${invoiceLabel}`}
      author="Maktaby"
      subject={`Tax Invoice — ${org.name}`}
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.brandBlock}>
            <Text style={s.brandName}>Maktaby</Text>
            <Text style={s.brandTagline}>Maktaby.io</Text>
          </View>
          <View>
            <Text style={s.invoiceLabel}>{isTaxInvoice ? "TAX INVOICE" : "INVOICE"}</Text>
            {arabic && <Text style={s.arTitle}>{isTaxInvoice ? AR.taxInvoice : AR.invoice}</Text>}
            <Text style={s.invoiceNumber}>{invoiceLabel}</Text>
          </View>
        </View>

        {/* ── From / To ── */}
        <View style={s.addressRow}>
          <View style={s.addressBlock}>
            <Text style={s.addressLabel}>From</Text>
            {arabic && <Text style={s.arLabel}>{AR.from}</Text>}
            <Text style={s.addressName}>{org.name}</Text>
            {org.address && <Text style={s.addressLine}>{org.address}</Text>}
            {org.email && <Text style={s.addressLine}>{org.email}</Text>}
            {org.phone && <Text style={s.addressLine}>{org.phone}</Text>}
            {org.taxRegistrationNumber && (
              <Text style={[s.addressLine, { marginTop: 4 }]}>
                {org.jurisdiction === "KSA" ? "VAT Reg. No: " : "TRN: "}
                {org.taxRegistrationNumber}
              </Text>
            )}
            {arabic && org.taxRegistrationNumber && (
              <Text style={s.arMeta}>{AR.vatReg}: {org.taxRegistrationNumber}</Text>
            )}
          </View>
          <View style={s.addressBlock}>
            <Text style={s.addressLabel}>Bill To</Text>
            {arabic && <Text style={s.arLabel}>{AR.billTo}</Text>}
            <Text style={s.addressName}>{member.name ?? member.email}</Text>
            {member.company && <Text style={s.addressLine}>{member.company}</Text>}
            <Text style={s.addressLine}>{member.email}</Text>
          </View>
        </View>

        {/* ── Invoice meta ── */}
        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Issue Date</Text>
            {arabic && <Text style={s.arMeta}>{AR.issueDate}</Text>}
            <Text style={s.metaValue}>{fmtDate(invoice.issueDate)}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Due Date</Text>
            {arabic && <Text style={s.arMeta}>{AR.dueDate}</Text>}
            <Text style={s.metaValue}>{fmtDate(invoice.dueDate)}</Text>
          </View>
          {invoice.paidAt && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Paid On</Text>
              {arabic && <Text style={s.arMeta}>{AR.paidOn}</Text>}
              <Text style={s.metaValue}>{fmtDate(invoice.paidAt)}</Text>
            </View>
          )}
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Status</Text>
            {arabic && <Text style={s.arMeta}>{AR.status}</Text>}
            <View style={[s.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[s.statusText, { color: statusColors.text }]}>
                {invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Line items table ── */}
        <View style={s.tableHeader}>
          <View style={s.colDesc}>
            <Text style={s.tableHeaderText}>Description</Text>
            {arabic && <Text style={s.arHeader}>{AR.description}</Text>}
          </View>
          <View style={s.colQty}>
            <Text style={[s.tableHeaderText, { textAlign: "center" }]}>Qty</Text>
            {arabic && <Text style={[s.arHeader, { textAlign: "center" }]}>{AR.qty}</Text>}
          </View>
          <View style={s.colUnit}>
            <Text style={[s.tableHeaderText, { textAlign: "right" }]}>Unit Price</Text>
            {arabic && <Text style={[s.arHeader, { textAlign: "right" }]}>{AR.unitPrice}</Text>}
          </View>
          <View style={s.colTotal}>
            <Text style={[s.tableHeaderText, { textAlign: "right" }]}>Total</Text>
            {arabic && <Text style={[s.arHeader, { textAlign: "right" }]}>{AR.total}</Text>}
          </View>
        </View>

        {invoice.lineItems.map((item, idx) => (
          <View key={idx} style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.tableCell, s.colDesc]}>{item.description}</Text>
            <Text style={[s.tableCell, s.colQty]}>{item.quantity}</Text>
            <Text style={[s.tableCell, s.colUnit]}>{fmtCurrency(item.unitPrice, invoice.currency)}</Text>
            <Text style={[s.tableCell, s.colTotal]}>{fmtCurrency(item.total, invoice.currency)}</Text>
          </View>
        ))}

        {/* ── Totals ── */}
        <View style={s.totalsContainer}>
          <View style={s.totalsBox}>
            <View style={s.totalsRow}>
              <Text style={[s.totalsLabel, arabic ? { fontFamily: "Amiri" } : {}]}>Subtotal{arabic ? ` · ${AR.subtotal}` : ""}</Text>
              <Text style={s.totalsValue}>{fmtCurrency(invoice.subtotal, invoice.currency)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={[s.totalsLabel, arabic ? { fontFamily: "Amiri" } : {}]}>{vatLabel(invoice.vatRate)}{arabic ? ` · ${AR.vat}` : ""}</Text>
              <Text style={s.totalsValue}>{fmtCurrency(invoice.vatAmount, invoice.currency)}</Text>
            </View>
            <View style={s.totalsDivider} />
            <View style={s.totalsRow}>
              <Text style={[s.totalsGrandLabel, arabic ? { fontFamily: "Amiri" } : {}]}>Total{arabic ? ` · ${AR.grandTotal}` : ""}</Text>
              <Text style={s.totalsGrandValue}>{fmtCurrency(invoice.totalAmount, invoice.currency)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {invoice.notes && (
          <View style={s.notesBox}>
            <Text style={[s.notesLabel, arabic ? { fontFamily: "Amiri" } : {}]}>Notes{arabic ? ` · ${AR.notes}` : ""}</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* ── ZATCA QR (KSA e-invoice) ── */}
        {invoice.zatcaQrDataUrl ? (
          <View style={s.zatcaBox}>
            <Image style={s.zatcaQr} src={invoice.zatcaQrDataUrl} />
            <View style={s.zatcaInfo}>
              <Text style={s.zatcaTitle}>ZATCA e-Invoice</Text>
              <Text style={s.zatcaLine}>
                Scan with the ZATCA verification app to validate this tax invoice.
              </Text>
              {invoice.zatcaUuid && <Text style={s.zatcaMono}>UUID: {invoice.zatcaUuid}</Text>}
              {invoice.zatcaStatus && <Text style={s.zatcaMono}>Status: {invoice.zatcaStatus}</Text>}
              {invoice.zatcaStatus === "CLEARED" && (
                <View style={s.zatcaClearedBadge}>
                  <Text style={s.zatcaClearedText}>ZATCA CLEARED</Text>
                </View>
              )}
            </View>
          </View>
        ) : org.jurisdiction === "KSA" ? (
          <View style={s.zatcaPendingBox}>
            <Text style={s.zatcaPendingText}>
              ZATCA e-invoice — QR pending submission to ZATCA
            </Text>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <View>
            <Text style={s.footerText}>This is a computer-generated invoice.</Text>
            {arabic && <Text style={[s.arFooter, { textAlign: "left" }]}>{AR.computerGenerated}</Text>}
          </View>
          <View>
            {org.taxRegistrationNumber && (
              <Text style={s.footerBold}>
                {org.jurisdiction === "KSA" ? "VAT Reg. No: " : "TRN: "}
                {org.taxRegistrationNumber}
              </Text>
            )}
            <Text style={s.footerText}>Generated by Maktaby · Maktaby.io</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
