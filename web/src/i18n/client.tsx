"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { messages, type Messages } from "./messages";

const I18nContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

/** Textes traduits dans un composant client. */
export function useI18n(): { locale: Locale; t: Messages } {
  const locale = useContext(I18nContext);
  return { locale, t: messages[locale] };
}

/** Hors composant (ex. base locale hors-ligne) : langue lue dans le cookie. */
export function currentLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return m && isLocale(m[1]) ? m[1] : DEFAULT_LOCALE;
}

export const currentMessages = (): Messages => messages[currentLocale()];

/** Change la langue (cookie 1 an). La page doit ensuite être rafraîchie. */
export function setLocaleCookie(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}
