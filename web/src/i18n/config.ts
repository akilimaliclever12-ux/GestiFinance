export type Locale = "fr" | "en";

export const LOCALES: Locale[] = ["fr", "en"];
export const DEFAULT_LOCALE: Locale = "fr";
/** Cookie mémorisant la langue choisie (lu côté serveur et côté client). */
export const LOCALE_COOKIE = "lang";

export const isLocale = (v: unknown): v is Locale => v === "fr" || v === "en";

/** Locale Intl pour les nombres et les dates. */
export const intlLocale = (l: Locale) => (l === "en" ? "en-US" : "fr-FR");
