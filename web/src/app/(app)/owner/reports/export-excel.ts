import * as XLSX from "xlsx";
import { frDate, periodLine, reportFileName, reportText, type Aggregate, type ReportData } from "./report-types";

const NUM_FMT = "#,##0.00";

/** Applique le format numérique aux cellules d'une colonne (à partir d'une ligne donnée). */
function formatColumn(ws: XLSX.WorkSheet, col: number, fromRow: number) {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let r = fromRow; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
    if (cell && cell.t === "n") cell.z = NUM_FMT;
  }
}

function aggregateRows(d: ReturnType<typeof reportText>, title: string, data: Aggregate): (string | number)[][] {
  const rows: (string | number)[][] = [[title], [d.label, d.currency, d.amount]];
  for (const l of data.lines) rows.push([l.label, l.currency, l.amount]);
  if (data.lines.length === 0) rows.push([d.noMovement]);
  for (const [c, v] of Object.entries(data.totals)) rows.push([d.total(c), c, v]);
  rows.push([]);
  return rows;
}

export function exportReportExcel(r: ReportData) {
  const d = reportText(r);
  const wb = XLSX.utils.book_new();
  const withRecettes = r.kind !== "depenses";
  const withDepenses = r.kind !== "recettes";

  // Feuille 1 — synthèse, avec l'identité de l'école en tête
  const rows: (string | number)[][] = [
    [r.school.official_name || r.school.name],
    [r.title],
    [periodLine(r)],
    [],
  ];
  if (withRecettes) {
    rows.push(...aggregateRows(d, d.recettesByFee, r.recettes));
    rows.push(...aggregateRows(d, d.recettesByBank, r.parBanque));
  }
  if (withDepenses) rows.push(...aggregateRows(d, d.depensesByCategory, r.depenses));
  if (r.kind === "synthese") {
    rows.push([d.netBalance], [d.currency, "", d.balance]);
    for (const c of r.currencies) {
      rows.push([c, "", (r.recettes.totals[c] ?? 0) - (r.depenses.totals[c] ?? 0)]);
    }
    if (r.currencies.length === 0) rows.push([d.noMovement]);
  }
  const summary = XLSX.utils.aoa_to_sheet(rows);
  summary["!cols"] = [{ wch: 36 }, { wch: 10 }, { wch: 18 }];
  formatColumn(summary, 2, 0);
  XLSX.utils.book_append_sheet(wb, summary, d.sheetReport);

  // Feuilles de détail — une ligne par opération (annulations exclues)
  if (withRecettes) {
    const ws = XLSX.utils.aoa_to_sheet([
      [d.date, d.matricule, d.student, d.className, d.feeType, d.bankCol, d.bordereauNo, d.amount, d.currency],
      ...r.payments.map((p) => [
        frDate(p.date),
        p.matricule,
        p.student,
        p.className,
        p.fee,
        p.bank,
        p.bordereau,
        p.amount,
        p.currency,
      ]),
    ]);
    ws["!cols"] = [10, 12, 28, 16, 22, 16, 14, 14, 8].map((wch) => ({ wch }));
    formatColumn(ws, 7, 1);
    XLSX.utils.book_append_sheet(wb, ws, d.sheetRecettes);
  }
  if (withDepenses) {
    const ws = XLSX.utils.aoa_to_sheet([
      [d.date, d.category, d.beneficiary, d.paymentMethod, d.reference, d.amount, d.currency],
      ...r.expenses.map((e) => [
        frDate(e.date),
        e.category,
        e.beneficiary,
        e.method,
        e.reference,
        e.amount,
        e.currency,
      ]),
    ]);
    ws["!cols"] = [10, 22, 26, 16, 14, 14, 8].map((wch) => ({ wch }));
    formatColumn(ws, 5, 1);
    XLSX.utils.book_append_sheet(wb, ws, d.sheetDepenses);
  }

  XLSX.writeFile(wb, reportFileName(r, "xlsx"));
}
