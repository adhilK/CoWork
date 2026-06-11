// @react-pdf/renderer — Node.js only. Do NOT import from client components.
// Uses its own JSX primitives (Document/Page/View/Text), not React DOM.
// No Tailwind, no shadcn — styles via StyleSheet.create().
// Arabic text support deferred: needs a registered Arabic font (separate task).

import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
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
});

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
}: {
  invoice: InvoicePdfData;
  org: InvoicePdfOrg;
  member: InvoicePdfMember;
}) {
  const invoiceLabel = invoice.invoiceNumber ?? `INV-${new Date(invoice.issueDate).getTime()}`;
  const statusColors = STATUS_COLORS[invoice.status] ?? { bg: "#F3F4F6", text: "#4B5563" };
  const isTaxInvoice = invoice.vatRate > 0;

  return (
    <Document
      title={`Invoice ${invoiceLabel}`}
      author="CoWork Pro"
      subject={`Tax Invoice — ${org.name}`}
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.brandBlock}>
            <Text style={s.brandName}>CoWork Pro</Text>
            <Text style={s.brandTagline}>coworkpro.io</Text>
          </View>
          <View>
            <Text style={s.invoiceLabel}>{isTaxInvoice ? "TAX INVOICE" : "INVOICE"}</Text>
            <Text style={s.invoiceNumber}>{invoiceLabel}</Text>
          </View>
        </View>

        {/* ── From / To ── */}
        <View style={s.addressRow}>
          <View style={s.addressBlock}>
            <Text style={s.addressLabel}>From</Text>
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
          </View>
          <View style={s.addressBlock}>
            <Text style={s.addressLabel}>Bill To</Text>
            <Text style={s.addressName}>{member.name ?? member.email}</Text>
            {member.company && <Text style={s.addressLine}>{member.company}</Text>}
            <Text style={s.addressLine}>{member.email}</Text>
          </View>
        </View>

        {/* ── Invoice meta ── */}
        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Issue Date</Text>
            <Text style={s.metaValue}>{fmtDate(invoice.issueDate)}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Due Date</Text>
            <Text style={s.metaValue}>{fmtDate(invoice.dueDate)}</Text>
          </View>
          {invoice.paidAt && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Paid On</Text>
              <Text style={s.metaValue}>{fmtDate(invoice.paidAt)}</Text>
            </View>
          )}
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Status</Text>
            <View style={[s.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[s.statusText, { color: statusColors.text }]}>
                {invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Line items table ── */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colDesc]}>Description</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>Unit Price</Text>
          <Text style={[s.tableHeaderText, s.colTotal]}>Total</Text>
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
              <Text style={s.totalsLabel}>Subtotal</Text>
              <Text style={s.totalsValue}>{fmtCurrency(invoice.subtotal, invoice.currency)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>{vatLabel(invoice.vatRate)}</Text>
              <Text style={s.totalsValue}>{fmtCurrency(invoice.vatAmount, invoice.currency)}</Text>
            </View>
            <View style={s.totalsDivider} />
            <View style={s.totalsRow}>
              <Text style={s.totalsGrandLabel}>Total</Text>
              <Text style={s.totalsGrandValue}>{fmtCurrency(invoice.totalAmount, invoice.currency)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {invoice.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>This is a computer-generated invoice.</Text>
          <View>
            {org.taxRegistrationNumber && (
              <Text style={s.footerBold}>
                {org.jurisdiction === "KSA" ? "VAT Reg. No: " : "TRN: "}
                {org.taxRegistrationNumber}
              </Text>
            )}
            <Text style={s.footerText}>Generated by CoWork Pro · coworkpro.io</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
