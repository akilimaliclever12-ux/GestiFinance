"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n, setLocaleCookie } from "@/i18n/client";
import { LOCALES } from "@/i18n/config";

/** Bascule FR / EN (mémorisée dans un cookie). */
export function LangSwitch({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  const base =
    tone === "dark"
      ? "border-white/50 text-white"
      : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300";
  const active = tone === "dark" ? "bg-white text-brand" : "bg-brand text-white";

  return (
    <div
      role="group"
      aria-label={t.common.language}
      className={`flex overflow-hidden rounded-lg border text-xs font-semibold ${base} ${pending ? "opacity-60" : ""}`}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === locale}
          disabled={pending}
          onClick={() => {
            if (l === locale) return;
            setLocaleCookie(l);
            start(() => router.refresh());
          }}
          className={`px-2 py-1.5 uppercase transition ${l === locale ? active : "hover:bg-black/5 dark:hover:bg-white/10"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
