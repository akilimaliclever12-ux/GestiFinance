"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import type { ReportData } from "./report-types";

const btnCls =
  "no-print rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-light disabled:opacity-50";

/** Téléchargement du rapport en Excel ou en PDF (générés dans le navigateur). */
export function ExportButtons({ report }: { report: ReportData }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<null | "xlsx" | "pdf">(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "xlsx" | "pdf") {
    setBusy(kind);
    setError(null);
    try {
      // Chargés à la demande : ces bibliothèques ne pèsent pas sur la page.
      if (kind === "xlsx") (await import("./export-excel")).exportReportExcel(report);
      else await (await import("./export-pdf")).exportReportPdf(report);
    } catch (e) {
      console.error(e);
      setError(t.reports.export.failed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button type="button" onClick={() => run("xlsx")} disabled={busy !== null} className={btnCls}>
        {busy === "xlsx" ? t.reports.export.busy : t.reports.export.excel}
      </button>
      <button type="button" onClick={() => run("pdf")} disabled={busy !== null} className={btnCls}>
        {busy === "pdf" ? t.reports.export.busy : t.reports.export.pdf}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </>
  );
}
