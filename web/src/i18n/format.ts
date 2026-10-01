import { intlLocale, type Locale } from "./config";

/** Montant + devise, ex. « 12 000 CDF » (fr) / « 12,000 CDF » (en). */
export const formatMoney = (locale: Locale, n: number, c: string) =>
  new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2 }).format(n) + " " + c;

export const formatNumber = (locale: Locale, n: number) =>
  new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2 }).format(n);

// Dates : JJ/MM/AAAA dans les deux langues (usage en RDC, au Burundi et en Afrique de l'Est).

/** Date du jour : « 01/10/2026 ». */
export const formatToday = () => new Date().toLocaleDateString("fr-FR");

/** « 2026-09-30 » → « 30/09/2026 ». */
export const formatIsoDate = (iso: string) => iso.split("-").reverse().join("/");
