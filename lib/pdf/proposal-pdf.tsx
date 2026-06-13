// @react-pdf/renderer — Node.js only. Business-setup proposal document.

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";

export type ProposalPdfData = {
  proposalNumber: string;
  orgName: string;
  orgEmail: string | null;
  orgPhone: string | null;
  clientName: string;
  companyName: string | null;
  clientEmail: string | null;
  jurisdiction: string;
  licenseLabel: string;
  authority: string | null;
  lineItems: { service: string; description?: string | null; fee: number }[];
  totalFee: number;
  currency: string;
  validUntil: Date;
  notes: string | null;
  createdAt: Date;
};

const GREEN = "#15803D";
const DARK = "#0F172A";
const GRAY = "#6B7280";
const LGRAY = "#F3F4F6";
const BORDER = "#E5E7EB";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: DARK, padding: 44, paddingBottom: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  brand: { fontSize: 17, fontFamily: "Helvetica-Bold", color: GREEN },
  tagline: { fontSize: 8, color: GRAY, marginTop: 2 },
  docLabel: { fontSize: 18, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "right" },
  docMeta: { fontSize: 8.5, color: GRAY, textAlign: "right", marginTop: 3 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: "solid" },
  block: { width: "48%" },
  label: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GREEN, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 5 },
  name: { fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 2 },
  line: { fontSize: 8.5, color: GRAY, marginBottom: 1.5 },
  summaryBox: { backgroundColor: LGRAY, borderRadius: 4, padding: 12, marginBottom: 20, flexDirection: "row", justifyContent: "space-between" },
  summaryItem: {},
  summaryLabel: { fontSize: 7, color: GRAY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  summaryValue: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: DARK },
  tHead: { flexDirection: "row", backgroundColor: DARK, borderRadius: 3, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 2 },
  tHeadText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 },
  tRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: "solid" },
  tRowAlt: { backgroundColor: LGRAY },
  cService: { flex: 4 },
  cFee: { flex: 2, textAlign: "right" },
  cell: { fontSize: 9, color: DARK },
  cellSub: { fontSize: 7.5, color: GRAY, marginTop: 1 },
  totals: { alignItems: "flex-end", marginTop: 12 },
  totalsBox: { width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: "solid" },
  totalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK },
  totalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GREEN },
  notesBox: { backgroundColor: LGRAY, borderRadius: 4, padding: 10, marginTop: 18 },
  notesLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  notesText: { fontSize: 8.5, color: DARK, lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 28, left: 44, right: 44, borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: "solid", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: GRAY },
});

function money(n: number, c: string) { return `${c} ${n.toFixed(2)}`; }

export function ProposalPdf({ p }: { p: ProposalPdfData }) {
  return (
    <Document title={`Proposal ${p.proposalNumber}`} author={p.orgName} subject="Business Setup Proposal">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>{p.orgName}</Text>
            <Text style={s.tagline}>Business Setup Proposal</Text>
          </View>
          <View>
            <Text style={s.docLabel}>PROPOSAL</Text>
            <Text style={s.docMeta}>{p.proposalNumber}</Text>
            <Text style={s.docMeta}>{format(p.createdAt, "d MMM yyyy")}</Text>
          </View>
        </View>

        <View style={s.row}>
          <View style={s.block}>
            <Text style={s.label}>Prepared for</Text>
            <Text style={s.name}>{p.clientName}</Text>
            {p.companyName && <Text style={s.line}>{p.companyName}</Text>}
            {p.clientEmail && <Text style={s.line}>{p.clientEmail}</Text>}
          </View>
          <View style={s.block}>
            <Text style={s.label}>From</Text>
            <Text style={s.name}>{p.orgName}</Text>
            {p.orgEmail && <Text style={s.line}>{p.orgEmail}</Text>}
            {p.orgPhone && <Text style={s.line}>{p.orgPhone}</Text>}
          </View>
        </View>

        <View style={s.summaryBox}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Jurisdiction</Text>
            <Text style={s.summaryValue}>{p.jurisdiction}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>License</Text>
            <Text style={s.summaryValue}>{p.licenseLabel}</Text>
          </View>
          {p.authority && (
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Authority</Text>
              <Text style={s.summaryValue}>{p.authority}</Text>
            </View>
          )}
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Valid until</Text>
            <Text style={s.summaryValue}>{format(p.validUntil, "d MMM yyyy")}</Text>
          </View>
        </View>

        <View style={s.tHead}>
          <Text style={[s.tHeadText, s.cService]}>Service</Text>
          <Text style={[s.tHeadText, s.cFee]}>Fee</Text>
        </View>
        {p.lineItems.map((li, i) => (
          <View key={i} style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}]}>
            <View style={s.cService}>
              <Text style={s.cell}>{li.service}</Text>
              {li.description ? <Text style={s.cellSub}>{li.description}</Text> : null}
            </View>
            <Text style={[s.cell, s.cFee]}>{money(li.fee, p.currency)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>{money(p.totalFee, p.currency)}</Text>
            </View>
          </View>
        </View>

        {p.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{p.notes}</Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>This proposal is an estimate and not a tax invoice.</Text>
          <Text style={s.footerText}>{p.orgName} · powered by CoWork Pro</Text>
        </View>
      </Page>
    </Document>
  );
}
