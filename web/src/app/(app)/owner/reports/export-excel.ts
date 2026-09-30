import * as XLSX from "xlsx";
import { frDate, periodLine, reportFileName, type Aggregate, type ReportData } from "./report-types";

const NUM_FMT = "#,##0.00";

/** Applique le format numérique aux cellules d'une colonne (à partir d'une ligne donnée). */
function formatColumn(ws: XLSX.WorkSheet, col: number, fromRow: number) {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let r = fromRow; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
    if (cell && cell.t === "n") cell.z = NUM_FMT;
  }
}

function aggregateRows(title: string, data: Aggregate): (string | number)[][] {
  const rows: (string | number)[][] = [[title], ["Libellé", "Devise", "Montant"]];
  for (const l of data.lines) rows.push([l.label, l.currency, l.amount]);
  if (data.lines.length === 0) rows.push(["Aucun mouvement sur la période."]);
  for (const [c, v] of Object.entries(data.totals)) rows.push([`Total ${c}`, c, v]);
  rows.push([]);
  return rows;
}

export function exportReportExcel(r: ReportData) {
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
    rows.push(...aggregateRows("Recettes (par type de frais)", r.recettes));
    rows.push(...aggregateRows("Recettes (par banque)", r.parBanque));
  }
  if (withDepenses) rows.push(...aggregateRows("Dépenses (par catégorie)", r.depenses));
  if (r.kind === "synthese") {
    rows.push(["Solde net par devise"], ["Devise", "", "Solde"]);
    for (const c of r.currencies) {
      rows.push([c, "", (r.recettes.totals[c] ?? 0) - (r.depenses.totals[c] ?? 0)]);
    }
    if (r.currencies.length === 0) rows.push(["Aucun mouvement sur la période."]);
  }
  const summary = XLSX.utils.aoa_to_sheet(rows);
  summary["!cols"] = [{ wch: 36 }, { wch: 10 }, { wch: 18 }];
  formatColumn(summary, 2, 0);
  XLSX.utils.book_append_sheet(wb, summary, "Rapport");

  // Feuilles de détail — une ligne par opération (annulations exclues)
  if (withRecettes) {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Date", "Matricule", "Élève", "Classe", "Type de frais", "Banque", "N° bordereau", "Montant", "Devise"],
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
    XLSX.utils.book_append_sheet(wb, ws, "Recettes (détail)");
  }
  if (withDepenses) {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Date", "Catégorie", "Bénéficiaire", "Mode de paiement", "Référence", "Montant", "Devise"],
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
    XLSX.utils.book_append_sheet(wb, ws, "Dépenses (détail)");
  }

  XLSX.writeFile(wb, reportFileName(r, "xlsx"));
}
