import type { SchoolLetterhead } from "@/components/Letterhead";
import type { CurrencyCode } from "@/lib/types";

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

/** « Période du … au … » (+ banque si filtrée). */
export const periodLine = (r: ReportData) =>
  `Période du ${frDate(r.from)} au ${frDate(r.to)}` + (r.bankLabel ? ` — Banque : ${r.bankLabel}` : "");

export const reportFileName = (r: ReportData, ext: string) => {
  const slug = slugify(r.school.name || "ecole");
  const bank = r.bankLabel ? `_${slugify(r.bankLabel)}` : "";
  return `rapport_${r.kind}_${slug}${bank}_${r.from}_${r.to}.${ext}`;
};
