import type { SchoolLetterhead } from "@/components/Letterhead";
import type { CurrencyCode } from "@/lib/types";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";

export type Kind = "synthese" | "recettes" | "depenses";
export type Line = { label: string; currency: CurrencyCode; amount: number };
export type Aggregate = { lines: Line[]; totals: Record<string, number> };

export type PaymentDetail = {
  date: string;
  matricule: string;
  student: string;
  className: string;
  fee: string;
  bank: string;
  bordereau: string;
  amount: number;
  currency: CurrencyCode;
};

export type ExpenseDetail = {
  date: string;
  category: string;
  beneficiary: string;
  method: string;
  reference: string;
  amount: number;
  currency: CurrencyCode;
};

/** Tout ce qu'il faut pour produire le rapport (écran, Excel, PDF). */
export type ReportData = {
  locale: Locale; // langue des exports (titres, en-têtes, nom de fichier)
  school: SchoolLetterhead;
  kind: Kind;
  title: string;
  from: string;
  to: string;
  bankLabel: string | null; // filtre banque appliqué aux recettes
  recettes: Aggregate;
  parBanque: Aggregate;
  depenses: Aggregate;
  currencies: string[];
  payments: PaymentDetail[];
  expenses: ExpenseDetail[];
};

/** « 2026-09-30 » → « 30/09/2026 » */
export const frDate = (iso: string) => iso.split("-").reverse().join("/");

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();

/** Textes du rapport dans la langue du rapport. */
export const reportText = (r: { locale: Locale }) => messages[r.locale].reports.doc;

/** « Période du … au … » (+ banque si filtrée). */
export const periodLine = (r: ReportData) => {
  const d = reportText(r);
  return d.period(frDate(r.from), frDate(r.to)) + (r.bankLabel ? d.bankSuffix(r.bankLabel) : "");
};

export const reportFileName = (r: ReportData, ext: string) => {
  const d = reportText(r);
  const slug = slugify(r.school.name || d.fileSchoolFallback);
  const bank = r.bankLabel ? `_${slugify(r.bankLabel)}` : "";
  return `${d.filePrefix}_${d.fileKind[r.kind]}_${slug}${bank}_${r.from}_${r.to}.${ext}`;
};
