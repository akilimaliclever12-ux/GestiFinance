import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { intlLocale, type Locale } from "@/i18n/config";
import { frDate, periodLine, reportFileName, reportText, type Aggregate, type ReportData } from "./report-types";

const BRAND: [number, number, number] = [22, 104, 227]; // #1668e3
const MARGIN = 15;

/**
 * Les polices standard de jsPDF ne couvrent que WinAnsi : on remplace les espaces
 * insécables (séparateurs de milliers fr-FR) et le signe moins typographique.
 */
const w = (s: string) => s.replace(/[  ]/g, " ").replace(/−/g, "-");

// en-US : séparateur de milliers « , » (compatible WinAnsi) ; fr-FR : espaces insécables remplacées par w().
const money = (locale: Locale, n: number, c: string) =>
  w(new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)) +
  " " +
  c;

/** Charge le logo en PNG (via canvas, quel que soit le format source). Null si indisponible (hors-ligne, CORS…). */
async function loadLogo(url: string): Promise<{ data: string; ratio: number } | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    return { data: canvas.toDataURL("image/png"), ratio: img.naturalWidth / img.naturalHeight };
  } catch {
    return null;
  }
}

const lastY = (doc: jsPDF) =>
  (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

function letterhead(doc: jsPDF, r: ReportData, logo: { data: string; ratio: number } | null) {
  const s = r.school;
  const cx = doc.internal.pageSize.getWidth() / 2;
  let y = MARGIN;

  doc.setTextColor(20);
  if (s.header_top) {
    doc.setFont("helvetica", "bold").setFontSize(8);
    doc.text(w(s.header_top.toUpperCase()), cx, y, { align: "center" });
    y += 4;
  }
  if (s.sub_header) {
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(w(s.sub_header), cx, y, { align: "center" });
    y += 4;
  }

  const name = w((s.official_name || s.name).toUpperCase());
  doc.setFont("helvetica", "bold").setFontSize(13);
  const nameW = doc.getTextWidth(name);
  const logoH = 14;
  const logoW = logo ? logoH * logo.ratio : 0;
  const gap = logo ? 4 : 0;
  const startX = cx - (logoW + gap + nameW) / 2;
  if (logo) doc.addImage(logo.data, "PNG", startX, y, logoW, logoH);
  const textX = startX + logoW + gap;
  doc.text(name, textX, y + (logo ? 6 : 5));

  const contact = [s.address, s.bp ? `B.P. ${s.bp}` : null, s.phone ? reportText(r).phone(s.phone) : null, s.email]
    .filter(Boolean)
    .join("  ·  ");
  if (contact) {
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90);
    doc.text(w(contact), logo ? textX : cx, y + (logo ? 11 : 10), { align: logo ? "left" : "center" });
  }
  y += logo ? logoH + 3 : 15;

  if (s.motto) {
    doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(90);
    doc.text(w(`« ${s.motto} »`), cx, y, { align: "center" });
    y += 3;
  }

  doc.setDrawColor(40).setLineWidth(0.6);
  doc.line(MARGIN, y, doc.internal.pageSize.getWidth() - MARGIN, y);
  return y + 8;
}

function aggregateTable(doc: jsPDF, r: ReportData, y: number, title: string, data: Aggregate, sign: string) {
  const d = reportText(r);
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(20);
  doc.text(w(title), MARGIN, y);
  autoTable(doc, {
    startY: y + 2,
    margin: { left: MARGIN, right: MARGIN },
    head: [[w(d.label), w(d.amount)]],
    body: data.lines.length
      ? data.lines.map((l) => [w(l.label), sign + money(r.locale, l.amount, l.currency)])
      : [[w(d.noMovement), ""]],
    foot: Object.entries(data.totals).map(([c, v]) => [w(d.total(c)), sign + money(r.locale, v, c)]),
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: { fillColor: BRAND },
    footStyles: { fillColor: [235, 241, 252], textColor: 20, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", cellWidth: 55 } },
    didParseCell: (d) => {
      if (d.section !== "body" && d.column.index === 1) d.cell.styles.halign = "right";
      if (d.section === "foot" && d.column.index === 0) d.cell.styles.halign = "right";
    },
  });
  return lastY(doc) + 8;
}

export async function exportReportPdf(r: ReportData) {
  const d = reportText(r);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logo = r.school.logo_url ? await loadLogo(r.school.logo_url) : null;

  let y = letterhead(doc, r, logo);
  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(20);
  doc.text(w(r.title), pageW / 2, y, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90);
  doc.text(w(periodLine(r)), pageW / 2, y + 5, { align: "center" });
  y += 14;

  if (r.kind !== "depenses") {
    y = aggregateTable(doc, r, y, d.recettesByFee, r.recettes, "");
    y = aggregateTable(doc, r, y, d.recettesByBank, r.parBanque, "");
  }
  if (r.kind !== "recettes") y = aggregateTable(doc, r, y, d.depensesByCategory, r.depenses, "-");

  if (r.kind === "synthese") {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [[w(d.netBalance), ""]],
      body: r.currencies.length
        ? r.currencies.map((c) => [
            c,
            money(r.locale, (r.recettes.totals[c] ?? 0) - (r.depenses.totals[c] ?? 0), c),
          ])
        : [[w(d.noMovement), ""]],
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 2, fillColor: [235, 241, 252] },
      headStyles: { fontStyle: "bold", textColor: 20 },
      columnStyles: { 1: { halign: "right", fontStyle: "bold", cellWidth: 55 } },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 1 && d.cell.raw !== "") {
          d.cell.styles.textColor = String(d.cell.raw).startsWith("-") ? [220, 38, 38] : BRAND;
        }
      },
    });
    y = lastY(doc) + 8;
  }

  // Signature
  if (y > pageH - 40) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setDrawColor(180).setLineWidth(0.3);
  doc.line(MARGIN, y + 14, MARGIN + 50, y + 14);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90);
  doc.text(w(d.signature), MARGIN, y + 18);

  // Annexes : détail des opérations
  const detailStyles = {
    margin: { left: MARGIN, right: MARGIN, top: MARGIN },
    theme: "striped" as const,
    styles: { fontSize: 7.5, cellPadding: 1.4 },
    headStyles: { fillColor: BRAND },
  };
  if (r.kind !== "depenses" && r.payments.length) {
    doc.addPage();
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(20);
    doc.text(w(d.annexRecettes(r.payments.length)), MARGIN, MARGIN);
    autoTable(doc, {
      ...detailStyles,
      startY: MARGIN + 3,
      head: [[d.date, d.matricule, d.student, d.className, d.fee, d.bankCol, d.bordereau, d.amount].map(w)],
      body: r.payments.map((p) => [
        frDate(p.date),
        w(p.matricule),
        w(p.student),
        w(p.className),
        w(p.fee),
        w(p.bank),
        w(p.bordereau),
        money(r.locale, p.amount, p.currency),
      ]),
      columnStyles: { 7: { halign: "right" } },
    });
  }
  if (r.kind !== "recettes" && r.expenses.length) {
    doc.addPage();
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(20);
    doc.text(w(d.annexDepenses(r.expenses.length)), MARGIN, MARGIN);
    autoTable(doc, {
      ...detailStyles,
      startY: MARGIN + 3,
      head: [[d.date, d.category, d.beneficiary, d.method, d.reference, d.amount].map(w)],
      body: r.expenses.map((e) => [
        frDate(e.date),
        w(e.category),
        w(e.beneficiary),
        w(e.method),
        w(e.reference),
        money(r.locale, e.amount, e.currency),
      ]),
      columnStyles: { 5: { halign: "right" } },
    });
  }

  // Pied de page sur toutes les pages
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(140);
    doc.text(w(d.footer(r.school.name, r.title)), MARGIN, pageH - 8);
    doc.text(d.page(i, pages), pageW - MARGIN, pageH - 8, { align: "right" });
  }

  doc.save(reportFileName(r, "pdf"));
}
